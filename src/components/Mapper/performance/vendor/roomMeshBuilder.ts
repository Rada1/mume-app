/**
 * @file Builds spatially chunked room meshes and per-room update ranges.
 */
// --- Logic Section ---

import { DIR_COUNT, EXIT_FLAG, type FastMapData } from '../model';
import { buildDoorVertices } from '../doorGeometry';
import { buildVerticalExitGeometry } from '../verticalExitGeometry';
import { CATEGORIES, emptyRoomLists, flagVerticesForRoom, trailVerticesForRoom, type Category, type Range, type RoomLayerMesh, visitRoom } from './rooms';

const CHUNK_SIZE = 16;
const OPPOSITE_DIR = [1, 0, 3, 2, 5, 4] as const;
interface Chunk { z: number; x: number; y: number; rooms: number[]; minX: number; maxX: number; minY: number; maxY: number }

function appendGeometry(target: number[], source: ArrayLike<number>): void {
  // A room can have enough connected exits to exceed the engine's spread-argument limit.
  for (let index = 0; index < source.length; index++) target.push(source[index]!);
}

function hideColorGeometryWhenUnexplored(vertices: Float32Array, initialState: number): void {
  if (initialState !== 0) return;
  for (let index = 6; index < vertices.length; index += 7) vertices[index] = 0;
}

function incomingFlowMasks(map: FastMapData): Uint8Array {
  const masks = new Uint8Array(map.roomCount);
  for (let room = 0; room < map.roomCount; room++) for (let dir = 0; dir < 6; dir++) {
    const slot = room * DIR_COUNT + dir;
    if (!(map.exitFlags[slot]! & EXIT_FLAG.FLOW)) continue;
    for (let edge = map.exitTargetStarts[slot]!; edge < map.exitTargetStarts[slot + 1]!; edge++) {
      const target = map.exitTargets[edge]!;
      if (target < map.roomCount) masks[target] |= 1 << OPPOSITE_DIR[dir]!;
    }
  }
  return masks;
}

export function buildRoomMeshes(map: FastMapData, doorStyle: 'current' | 'remote' = 'remote', initialState = 0): RoomLayerMesh[] {
  const incoming = incomingFlowMasks(map);
  const chunks = new Map<string, Chunk>();
  for (let room = 0; room < map.roomCount; room++) {
    const x = map.x[room]!;
    const y = map.y[room]!;
    const z = map.z[room]!;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const key = `${z}:${chunkX}:${chunkY}`;
    const chunk = chunks.get(key);
    if (chunk) {
      chunk.rooms.push(room);
      chunk.minX = Math.min(chunk.minX, x); chunk.maxX = Math.max(chunk.maxX, x);
      chunk.minY = Math.min(chunk.minY, y); chunk.maxY = Math.max(chunk.maxY, y);
    } else chunks.set(key, { z, x: chunkX, y: chunkY, rooms: [room], minX: x, maxX: x, minY: y, maxY: y });
  }

  const ordered = [...chunks.values()].sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y);
  return ordered.map(chunk => buildChunk(map, chunk, incoming, doorStyle, initialState));
}

function buildChunk(map: FastMapData, chunk: Chunk, incoming: Uint8Array, doorStyle: 'current' | 'remote', initialState: number): RoomLayerMesh {
  const lists = emptyRoomLists();
  const flagVertices: number[] = []; const trailVertices: number[] = [];
  const doorSlots: number[] = []; const doorVertices: number[] = []; const verticalExitVertices: number[] = [];
  const verticalExitRoomRanges = new Map<number, Range>();
  const roomCategoryRanges = new Map<number, Partial<Record<Category, Range>>>();
  const flagRoomRanges = new Map<number, Range>(); const trailRoomRanges = new Map<number, Range>(); const doorRoomRanges = new Map<number, Range>();
  for (const room of chunk.rooms) {
    const starts = {} as Record<Category, number>;
    for (const category of CATEGORIES) starts[category] = lists[category].length / 4;
    visitRoom(map, room, lists, initialState);
    const roomRanges = {} as Partial<Record<Category, Range>>;
    for (const category of CATEGORIES) {
      const count = lists[category].length / 4 - starts[category];
      if (count) roomRanges[category] = { first: starts[category], count };
    }
    roomCategoryRanges.set(room, roomRanges);
    const flagFirst = flagVertices.length / 7;
    flagVerticesForRoom(map, room, incoming[room]!, flagVertices, initialState);
    const flagCount = flagVertices.length / 7 - flagFirst;
    if (flagCount) flagRoomRanges.set(room, { first: flagFirst, count: flagCount });
    const trailFirst = trailVertices.length / 7;
    trailVerticesForRoom(map, room, trailVertices, initialState);
    const trailCount = trailVertices.length / 7 - trailFirst;
    if (trailCount) trailRoomRanges.set(room, { first: trailFirst, count: trailCount });
    const exits = buildVerticalExitGeometry(map, room);
    if (exits.length) {
      verticalExitRoomRanges.set(room, { first: verticalExitVertices.length / 7, count: exits.length / 7 });
      hideColorGeometryWhenUnexplored(exits, initialState);
      appendGeometry(verticalExitVertices, exits);
    }
    const doorFirst = doorVertices.length / 7;
    for (let dir = 0; dir < 6; dir++) {
      const slot = room * DIR_COUNT + dir;
      if (!(map.exitFlags[slot]! & EXIT_FLAG.DOOR)) continue;
      doorSlots.push(slot);
      const doorGeometry = buildDoorVertices(map.x[room]!, map.y[room]!, map.z[room]!, dir, map.doorOpen?.[slot] === 1, doorStyle);
      hideColorGeometryWhenUnexplored(doorGeometry, initialState);
      appendGeometry(doorVertices, doorGeometry);
    }
    const doorCount = doorVertices.length / 7 - doorFirst;
    if (doorCount) doorRoomRanges.set(room, { first: doorFirst, count: doorCount });
  }

  const inst = new Int32Array(Object.values(lists).reduce((sum, items) => sum + items.length, 0));
  const ranges = {} as Record<Category, Range>;
  const roomInstanceRanges = new Map<number, Range[]>();
  let at = 0;
  for (const category of CATEGORIES) {
    const items = lists[category];
    inst.set(items, at);
    ranges[category] = { first: at / 4, count: items.length / 4 };
    for (const [room, perCategory] of roomCategoryRanges) {
      const local = perCategory[category];
      if (!local) continue;
      const roomRanges = roomInstanceRanges.get(room) ?? [];
      roomRanges.push({ first: at / 4 + local.first, count: local.count });
      roomInstanceRanges.set(room, roomRanges);
    }
    at += items.length;
  }
  return {
    z: chunk.z, bounds: { minX: chunk.minX, maxX: chunk.maxX, minY: chunk.minY, maxY: chunk.maxY }, inst, ranges,
    flagVertices: Float32Array.from(flagVertices), trailVertices: Float32Array.from(trailVertices),
    doorSlots: Uint32Array.from(doorSlots), doorVertices: Float32Array.from(doorVertices),
    verticalExitVertices: Float32Array.from(verticalExitVertices), verticalExitRoomRanges,
    roomInstanceRanges, flagRoomRanges, trailRoomRanges, doorRoomRanges,
  };
}

