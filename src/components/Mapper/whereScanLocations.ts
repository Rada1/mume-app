/**
 * @file Matches `where` room names to nearby rooms in the current map zone.
 */
// --- Logic Section ---

import type { GroupMember } from '../../types';
import type { WhereScanPlayer } from '../../types/whereScan';
import type { MapperRoom } from './mapperTypes';
import type { MapData } from './performance/webcockpit/model';

export interface WhereScanMapMarker extends WhereScanPlayer {
  x: number;
  y: number;
  z: number;
  sameRoom: boolean;
}

interface RoomCandidate {
  name: string;
  description: string;
  zone: string;
  x: number;
  y: number;
  z: number;
}

type RoomTuple = readonly unknown[];
type RoomRecord = Readonly<Record<string, Partial<MapperRoom>>>;
const canonicalExternalIndexes = new WeakMap<object, ReadonlyMap<number, number>>();

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function numberAt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function collectCandidates(
  rooms: RoomRecord,
  tuples: Readonly<Record<string, RoomTuple>>,
  canonicalMap: MapData | null,
): RoomCandidate[] {
  const candidates = new Map<string, RoomCandidate>();
  const add = (candidate: RoomCandidate) => {
    if ((!candidate.name && !candidate.description) || !Number.isFinite(candidate.x + candidate.y + candidate.z)) return;
    candidates.set(`${normalize(candidate.name)}:${normalize(candidate.description)}:${candidate.x}:${candidate.y}:${candidate.z}`, candidate);
  };
  if (canonicalMap) {
    for (let index = 0; index < canonicalMap.roomCount; index++) {
      const name = canonicalMap.names[index] ?? '';
      const description = canonicalMap.descs[index] ?? '';
      const x = canonicalMap.x[index];
      const y = canonicalMap.y[index];
      const z = canonicalMap.z[index];
      if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
        add({ name, description, zone: canonicalMap.areas[index] ?? '', x: x + 1, y: 1 - y, z });
      }
    }
    return [...candidates.values()];
  }
  for (const room of Object.values(rooms)) {
    if (typeof room.name !== 'string') continue;
    const x = numberAt(room.x);
    const y = numberAt(room.y);
    const z = numberAt(room.z);
    if (x !== null && y !== null && z !== null) add({ name: room.name, description: room.desc ?? '', zone: room.zone ?? '', x, y, z });
  }
  for (const tuple of Object.values(tuples)) {
    const name = typeof tuple[5] === 'string' ? tuple[5] : '';
    const x = numberAt(tuple[0]);
    const y = numberAt(tuple[1]);
    const z = numberAt(tuple[2]);
    const zone = typeof tuple[9] === 'string' ? tuple[9] : '';
    const description = typeof tuple[17] === 'string' ? tuple[17] : '';
    if (name && x !== null && y !== null && z !== null) add({ name, description, zone, x, y, z });
  }
  return [...candidates.values()];
}

function matchesDirection(direction: string, dx: number, dy: number, dz: number): boolean {
  const value = normalize(direction).replace(/\s+/g, '');
  if (!value) return true;
  if (value === 'north' || value === 'n') return dy < 0;
  if (value === 'south' || value === 's') return dy > 0;
  if (value === 'east' || value === 'e') return dx > 0;
  if (value === 'west' || value === 'w') return dx < 0;
  if (value === 'northeast' || value === 'ne') return dx > 0 && dy < 0;
  if (value === 'northwest' || value === 'nw') return dx < 0 && dy < 0;
  if (value === 'southeast' || value === 'se') return dx > 0 && dy > 0;
  if (value === 'southwest' || value === 'sw') return dx < 0 && dy > 0;
  if (value === 'up' || value === 'above') return dz > 0;
  if (value === 'down' || value === 'below') return dz < 0;
  return true;
}

/** Resolves only unique same-zone room matches inside a 10-by-10 neighborhood. */
export function resolveWhereScanLocations(
  players: readonly WhereScanPlayer[],
  ownName: string,
  groupMembers: readonly GroupMember[],
  playerPosition: { x: number; y: number; z: number } | null,
  zone: string,
  rooms: RoomRecord,
  tuples: Readonly<Record<string, RoomTuple>>,
  canonicalMap: MapData | null = null,
): WhereScanMapMarker[] {
  if (!playerPosition) return [];
  const excludedNames = new Set([normalize(ownName), ...groupMembers.flatMap(member => [normalize(member.name), normalize(member.label ?? '')])]);
  const roomCandidates = collectCandidates(rooms, tuples, canonicalMap);
  const normalizedZone = normalize(zone);
  const output: WhereScanMapMarker[] = [];

  for (const player of players) {
    const playerName = normalize(player.name);
    if (!playerName || excludedNames.has(playerName)) continue;
    const targetRoom = normalize(player.room);
    const candidates = roomCandidates.flatMap(room => {
      if (normalize(room.name) !== targetRoom && normalize(room.description) !== targetRoom) return [];
      if (normalizedZone && room.zone && normalize(room.zone) !== normalizedZone) return [];
      const dx = room.x - Math.round(playerPosition.x);
      const dy = room.y - Math.round(playerPosition.y);
      const dz = room.z - Math.round(playerPosition.z);
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5 || Math.abs(dz) > 1) return [];
      const directionMatch = matchesDirection(player.direction, dx, dy, dz);
      return [{ room, dx, dy, dz, score: (directionMatch ? 0 : 100) + Math.abs(dx) + Math.abs(dy) + Math.abs(dz) * 2 }];
    }).sort((a, b) => a.score - b.score);
    const best = candidates[0];
    const next = candidates[1];
    if (!best || (next && best.score === next.score && (best.room.x !== next.room.x || best.room.y !== next.room.y || best.room.z !== next.room.z))) continue;
    output.push({ ...player, x: best.room.x, y: best.room.y, z: best.room.z, sameRoom: best.dx === 0 && best.dy === 0 && best.dz === 0 });
  }
  return output;
}

/** Resolve a current room into the imported map's coordinate space for overlays. */
export function resolveCanonicalMapPosition(
  map: MapData,
  roomId: string | null,
  serverId?: number | string,
): { x: number; y: number; z: number } | null {
  let externalIndex = canonicalExternalIndexes.get(map);
  if (!externalIndex) {
    const built = new Map<number, number>();
    for (let index = 0; index < map.roomCount; index++) built.set(map.extId[index]!, index);
    externalIndex = built;
    canonicalExternalIndexes.set(map, built);
  }
  const normalizedRoomId = roomId?.replace(/^(?:m_|r_)/i, '');
  const numericServerId = Number(serverId);
  let roomIndex = Number.isSafeInteger(numericServerId) && numericServerId > 0
    ? map.byServerId.get(numericServerId)
    : undefined;
  const numericRoomId = Number(normalizedRoomId);
  if (roomIndex === undefined && Number.isSafeInteger(numericRoomId) && numericRoomId >= 0) {
    roomIndex = externalIndex.get(numericRoomId);
  }
  if (roomIndex === undefined) return null;
  return { x: map.x[roomIndex]! + 1, y: 1 - map.y[roomIndex]!, z: map.z[roomIndex]! };
}
