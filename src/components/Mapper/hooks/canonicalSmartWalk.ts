/**
 * @file Smart Walk pathfinding over the canonical MMapper graph.
 * @description Keeps all MM2 exit destinations available to Performance Mode.
 */
// --- Logic Section ---

import type { MapperRoom } from '../mapperTypes';
import { normalizeTerrain } from '../../../utils/terrainUtils';
import { DIR_COUNT, EXIT_FLAG, TERRAIN, type MapData } from '../performance/webcockpit/model';
import { isNoRideRoom } from './smartWalkRideRules';

export interface CanonicalWalkOptions {
  revealAll?: boolean;
  exploredVnums?: Set<string>;
  riding?: boolean;
}

interface CanonicalWalkIndex {
  map: MapData;
  ids: string[];
  indexById: Map<string, number>;
  exits: Array<Array<number[] | undefined>>;
}

interface QueueEntry {
  room: number;
  cost: number;
  estimate: number;
}

const DIRECTION_SHORT = ['n', 's', 'e', 'w', 'u', 'd', 'out'] as const;
const DIR_INDEX: Readonly<Record<string, number>> = {
  north: 0, n: 0, south: 1, s: 1, east: 2, e: 2, west: 3, w: 3,
  up: 4, u: 4, down: 5, d: 5, out: 6, unknown: 6,
};
const TERRAIN_COST: Readonly<Record<string, number>> = {
  road: 1, city: 1, building: 1, underground: 1, field: 2, hills: 3,
  forest: 4, brush: 4, mountain: 6, water: 12,
};
const DEFAULT_TERRAIN_COST = 2;
const indexCache = new WeakMap<MapData, CanonicalWalkIndex>();

function normalizeId(id: string): string {
  return id.replace(/^(m_|r_)/, '');
}

function buildIndex(map: MapData): CanonicalWalkIndex {
  const cached = indexCache.get(map);
  if (cached) return cached;

  const ids = Array.from(map.extId, id => String(id));
  const indexById = new Map<string, number>();
  ids.forEach((id, room) => indexById.set(id, room));
  for (let room = 0; room < map.roomCount; room++) {
    const serverId = map.serverId[room]!;
    if (serverId && !indexById.has(String(serverId))) indexById.set(String(serverId), room);
  }

  const exits: Array<Array<number[] | undefined>> = Array.from(
    { length: map.roomCount },
    () => Array<number[] | undefined>(DIR_COUNT)
  );
  for (let room = 0; room < map.roomCount; room++) {
    for (let direction = 0; direction < DIR_COUNT; direction++) {
      const slot = room * DIR_COUNT + direction;
      if ((map.exitFlags[slot]! & EXIT_FLAG.EXIT) === 0) continue;
      const targets: number[] = [];
      for (let offset = map.outStart[slot]!; offset < map.outStart[slot + 1]!; offset++) {
        const target = map.outTo[offset]!;
        if (target < map.roomCount) targets.push(target);
      }
      if (targets.length) exits[room]![direction] = targets;
    }
  }

  const index = { map, ids, indexById, exits };
  indexCache.set(map, index);
  return index;
}

function resolveRoom(index: CanonicalWalkIndex, id: string): number | undefined {
  return index.indexById.get(normalizeId(id));
}

function liveRoomFor(index: CanonicalWalkIndex, rooms: Record<string, MapperRoom>, room: number): MapperRoom | undefined {
  const extId = index.ids[room]!;
  const serverId = index.map.serverId[room]!;
  return rooms[`m_${extId}`] ?? rooms[extId] ??
    (serverId ? rooms[`m_${serverId}`] ?? rooms[String(serverId)] : undefined);
}

function terrainCost(index: CanonicalWalkIndex, rooms: Record<string, MapperRoom>, room: number): number {
  const raw = liveRoomFor(index, rooms, room)?.terrain || TERRAIN[index.map.terrain[room]!] || '';
  const normalized = normalizeTerrain(String(raw));
  return TERRAIN_COST[normalized] ?? DEFAULT_TERRAIN_COST;
}

function traversable(
  index: CanonicalWalkIndex,
  rooms: Record<string, MapperRoom>,
  room: number,
  options: CanonicalWalkOptions
): boolean {
  if (options.revealAll || !options.exploredVnums) return true;
  const id = index.ids[room]!;
  const serverId = index.map.serverId[room]!;
  return options.exploredVnums.has(id) || (!!serverId && options.exploredVnums.has(String(serverId))) ||
    !!liveRoomFor(index, rooms, room);
}

function rideAllowed(
  index: CanonicalWalkIndex,
  rooms: Record<string, MapperRoom>,
  room: number,
  options: CanonicalWalkOptions
): boolean {
  if (!options.riding) return true;
  const liveRoom = liveRoomFor(index, rooms, room);
  const terrain = liveRoom?.terrain || TERRAIN[index.map.terrain[room]!];
  const ridable = liveRoom?.ridable ?? index.map.ridable[room];
  return !isNoRideRoom(terrain, liveRoom?.loadFlags, ridable);
}

function heuristic(index: CanonicalWalkIndex, room: number, end: number): number {
  const map = index.map;
  return Math.abs(map.x[room]! - map.x[end]!) + Math.abs(map.y[room]! - map.y[end]!) +
    Math.abs(map.z[room]! - map.z[end]!) * 5;
}

function pushHeap(heap: QueueEntry[], entry: QueueEntry): void {
  let index = heap.length;
  heap.push(entry);
  while (index > 0) {
    const parent = (index - 1) >>> 1;
    if (heap[parent]!.estimate <= entry.estimate) break;
    heap[index] = heap[parent]!;
    index = parent;
  }
  heap[index] = entry;
}

function popHeap(heap: QueueEntry[]): QueueEntry | undefined {
  const first = heap[0];
  const last = heap.pop();
  if (!first || !last || heap.length === 0) return first;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    if (left >= heap.length) break;
    const right = left + 1;
    const child = right < heap.length && heap[right]!.estimate < heap[left]!.estimate ? right : left;
    if (heap[child]!.estimate >= last.estimate) break;
    heap[index] = heap[child]!;
    index = child;
  }
  heap[index] = last;
  return first;
}

function liveExitsByDirection(
  index: CanonicalWalkIndex,
  rooms: Record<string, MapperRoom>,
  source: number
): Array<MapperRoom['exits'][string] | undefined> | undefined {
  const room = liveRoomFor(index, rooms, source);
  if (!room) return undefined;
  const exits: Array<MapperRoom['exits'][string] | undefined> = Array(DIR_COUNT);
  for (const [name, exit] of Object.entries(room.exits)) {
    const direction = DIR_INDEX[name.toLowerCase()];
    if (direction !== undefined) exits[direction] = exit;
  }
  return exits;
}

function targetsForDirection(
  index: CanonicalWalkIndex,
  source: number,
  direction: number,
  liveExits: Array<MapperRoom['exits'][string] | undefined> | undefined
): number[] {
  const canonical = index.exits[source]![direction] ?? [];
  const live = liveExits?.[direction];
  if (live?.closed) return [];
  if (!live) return canonical;
  const target = resolveRoom(index, live.target);
  if (target === undefined || canonical.includes(target)) return canonical;
  return [...canonical, target];
}

function reconstructPath(
  index: CanonicalWalkIndex,
  start: number,
  end: number,
  parent: Int32Array,
  parentDirection: Int8Array,
  startId: string
): { dirs: string[]; ids: string[] } | null {
  const reversedRooms: number[] = [];
  const reversedDirs: string[] = [];
  let current = end;
  while (current !== start) {
    const previous = parent[current]!;
    if (previous < 0) return null;
    reversedRooms.push(current);
    reversedDirs.push(DIRECTION_SHORT[parentDirection[current]!]!);
    current = previous;
  }
  reversedRooms.reverse();
  reversedDirs.reverse();
  return {
    dirs: reversedDirs,
    ids: [startId, ...reversedRooms.map(room => `m_${index.ids[room]}`)],
  };
}

export function getCanonicalSmartWalkDirection(
  map: MapData,
  fromId: string,
  toId: string,
  rooms: Record<string, MapperRoom>
): string | null {
  const index = buildIndex(map);
  const from = resolveRoom(index, fromId);
  const to = resolveRoom(index, toId);
  if (from === undefined || to === undefined) return null;
  const liveExits = liveExitsByDirection(index, rooms, from);
  for (let direction = 0; direction < DIR_COUNT; direction++) {
    if (targetsForDirection(index, from, direction, liveExits).includes(to)) return DIRECTION_SHORT[direction]!;
  }
  return null;
}

export function findCanonicalSmartWalkPath(
  map: MapData,
  startId: string,
  endId: string,
  rooms: Record<string, MapperRoom>,
  options: CanonicalWalkOptions = {}
): { dirs: string[]; ids: string[] } | null {
  if (!startId || !endId) return null;
  const index = buildIndex(map);
  const start = resolveRoom(index, startId);
  const end = resolveRoom(index, endId);
  if (start === undefined || end === undefined) return null;
  if (start === end) return { dirs: [], ids: [startId] };

  const bestCost = new Float64Array(map.roomCount);
  bestCost.fill(Infinity);
  const closed = new Uint8Array(map.roomCount);
  const parent = new Int32Array(map.roomCount);
  parent.fill(-1);
  const parentDirection = new Int8Array(map.roomCount);
  const queue: QueueEntry[] = [];
  bestCost[start] = 0;
  pushHeap(queue, { room: start, cost: 0, estimate: heuristic(index, start, end) });

  while (queue.length) {
    const current = popHeap(queue)!;
    if (closed[current.room] || current.cost > bestCost[current.room]!) continue;
    if (current.room === end) return reconstructPath(index, start, end, parent, parentDirection, startId);
    closed[current.room] = 1;

    const liveExits = liveExitsByDirection(index, rooms, current.room);
    for (let direction = 0; direction < DIR_COUNT; direction++) {
      for (const target of targetsForDirection(index, current.room, direction, liveExits)) {
        if (closed[target] || !rideAllowed(index, rooms, target, options) || !traversable(index, rooms, target, options)) continue;
        const nextCost = current.cost + terrainCost(index, rooms, target);
        if (nextCost >= bestCost[target]!) continue;
        bestCost[target] = nextCost;
        parent[target] = current.room;
        parentDirection[target] = direction;
        pushHeap(queue, { room: target, cost: nextCost, estimate: nextCost + heuristic(index, target, end) });
      }
    }
  }
  return null;
}
