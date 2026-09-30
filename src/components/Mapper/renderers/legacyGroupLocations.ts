/**
 * @file Resolves group room IDs or room names into legacy mapper coordinates.
 */
// --- Logic Section ---

import type { GroupMember } from '../../../types';
import type { MapperRoom } from '../mapperTypes';

type RoomTuple = readonly unknown[];
type RoomPosition = { x: number; y: number; z: number };
type RoomRecord = Readonly<Record<string, Partial<MapperRoom>>>;
type TupleRecord = Readonly<Record<string, RoomTuple>>;
const tupleNameIndexes = new WeakMap<object, ReadonlyMap<string, RoomPosition | null>>();

function normalizeId(value: string | number): string {
  return String(value).trim().replace(/^(?:m_|r_)/i, '');
}

function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function addUniquePosition(index: Map<string, RoomPosition | null>, key: string, position: RoomPosition): void {
  if (!key) return;
  if (!index.has(key)) {
    index.set(key, position);
    return;
  }
  const existing = index.get(key);
  if (!existing || existing.x !== position.x || existing.y !== position.y || existing.z !== position.z) index.set(key, null);
}

function positionFromTuple(tuple: RoomTuple | undefined): RoomPosition | null {
  if (!tuple) return null;
  const [x, y, z] = tuple;
  return typeof x === 'number' && Number.isFinite(x)
    && typeof y === 'number' && Number.isFinite(y)
    && typeof z === 'number' && Number.isFinite(z) ? { x, y, z } : null;
}

function positionFromRoom(room: Partial<MapperRoom> | undefined): RoomPosition | null {
  if (!room || !Number.isFinite(room.x) || !Number.isFinite(room.y) || !Number.isFinite(room.z)) return null;
  return { x: room.x!, y: room.y!, z: room.z! };
}

/** Cache the large, immutable base map's room-name index for the life of the map object. */
export function buildLegacyGroupRoomNameIndex(tuples: TupleRecord): ReadonlyMap<string, RoomPosition | null> {
  const cached = tupleNameIndexes.get(tuples);
  if (cached) return cached;
  const index = new Map<string, RoomPosition | null>();
  for (const tuple of Object.values(tuples)) {
    const name = typeof tuple[5] === 'string' ? normalizeName(tuple[5]) : '';
    const position = positionFromTuple(tuple);
    if (name && position) addUniquePosition(index, name, position);
  }
  tupleNameIndexes.set(tuples, index);
  return index;
}

/** Resolve exact IDs first, then use a unique room-name match if GMCP omitted mapid. */
export function resolveLegacyGroupMemberPosition(
  member: GroupMember,
  tuples: TupleRecord,
  rooms: RoomRecord,
  serverIdIndex: Readonly<Record<string, string>>,
  nameIndex: ReadonlyMap<string, RoomPosition | null>,
): RoomPosition | null {
  const serverId = member.mapid === undefined || member.mapid === null ? '' : normalizeId(member.mapid);
  const localId = serverId ? serverIdIndex[serverId] ?? serverIdIndex[String(member.mapid)] : undefined;
  const localKey = localId ? normalizeId(localId) : serverId;
  let position = positionFromTuple(tuples[localKey] ?? tuples[localId ?? ''] ?? tuples[serverId]);
  if (!position) position = positionFromRoom(rooms[`m_${localKey}`] ?? rooms[localKey] ?? rooms[`m_${serverId}`] ?? rooms[serverId]);
  if (!position && serverId) {
    const room = Object.values(rooms).find(candidate => String(candidate.gmcpId) === serverId);
    position = positionFromRoom(room);
  }
  if (position) return position;
  const roomName = normalizeName(member.room ?? '');
  if (!roomName) return null;
  if (nameIndex.has(roomName)) return nameIndex.get(roomName) ?? null;
  let roomPositionByName: RoomPosition | null = null;
  for (const room of Object.values(rooms)) {
    if (normalizeName(room.name ?? '') !== roomName) continue;
    const candidate = positionFromRoom(room);
    if (!candidate) continue;
    if (roomPositionByName && (roomPositionByName.x !== candidate.x || roomPositionByName.y !== candidate.y || roomPositionByName.z !== candidate.z)) return null;
    roomPositionByName = candidate;
  }
  return roomPositionByName;
}
