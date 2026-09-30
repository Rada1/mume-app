/**
 * @file Resolves GMCP group room IDs into worker map coordinates.
 */
// --- Logic Section ---

import type { GroupMember } from '../../../types';
import { getMemberColor } from '../../../utils/groupUtils';
import type { MapperRoom } from '../mapperTypes';
import type { MapData } from './webcockpit/model';
import type { FastMapGroupMember } from './model';

type RoomTuple = readonly unknown[];
type RoomRecord = Readonly<Record<string, Partial<MapperRoom>>>;

function normalizedId(value: string | number): string {
  return String(value).trim().replace(/^(?:m_|r_)/i, '');
}

function normalizedText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function tuplePosition(tuple: RoomTuple | undefined): { x: number; y: number; z: number } | null {
  if (!tuple) return null;
  const x = finiteNumber(tuple[0]);
  const y = finiteNumber(tuple[1]);
  const z = finiteNumber(tuple[2]);
  return x === null || y === null || z === null ? null : { x, y: -y, z };
}

function roomPosition(room: Partial<MapperRoom> | undefined): { x: number; y: number; z: number } | null {
  if (!room) return null;
  const x = finiteNumber(room.x);
  const y = finiteNumber(room.y);
  const z = finiteNumber(room.z);
  return x === null || y === null || z === null ? null : { x, y: -y, z };
}

function colorValue(index: number): number {
  return Number.parseInt(getMemberColor(index).core.slice(1), 16);
}

function canonicalIdPosition(map: MapData, id: string): { x: number; y: number; z: number } | null {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;
  let roomIndex = map.byServerId.get(numericId);
  if (roomIndex === undefined) {
    for (let index = 0; index < map.roomCount; index++) {
      if (map.extId[index] === numericId) {
        roomIndex = index;
        break;
      }
    }
  }
  return roomIndex === undefined ? null : {
    x: map.x[roomIndex]! + 1,
    y: map.y[roomIndex]! - 1,
    z: map.z[roomIndex]!,
  };
}

function canonicalRoomPosition(map: MapData, roomName: string | undefined): { x: number; y: number; z: number } | null {
  const target = normalizedText(roomName ?? '');
  if (!target) return null;
  let matchedIndex: number | null = null;
  for (let index = 0; index < map.roomCount; index++) {
    if (normalizedText(map.names[index] ?? '') !== target && normalizedText(map.descs[index] ?? '') !== target) continue;
    if (matchedIndex !== null) return null;
    matchedIndex = index;
  }
  return matchedIndex === null ? null : {
    x: map.x[matchedIndex]! + 1,
    y: map.y[matchedIndex]! - 1,
    z: map.z[matchedIndex]!,
  };
}

function tupleRoomPosition(tuples: Readonly<Record<string, RoomTuple>>, roomName: string | undefined): { x: number; y: number; z: number } | null {
  const target = normalizedText(roomName ?? '');
  if (!target) return null;
  let position: { x: number; y: number; z: number } | null = null;
  for (const tuple of Object.values(tuples)) {
    if (normalizedText(typeof tuple[5] === 'string' ? tuple[5] : '') !== target) continue;
    const candidate = tuplePosition(tuple);
    if (!candidate) continue;
    if (position && (position.x !== candidate.x || position.y !== candidate.y || position.z !== candidate.z)) return null;
    position = candidate;
  }
  return position;
}

/** Resolve group member map IDs using the same server-ID/room-ID priority as the mapper. */
export function resolveFastMapGroupMembers(
  members: readonly GroupMember[],
  tuples: Readonly<Record<string, RoomTuple>>,
  rooms: RoomRecord,
  serverIdIndex: Readonly<Record<string, string>>,
  canonicalMap: MapData | null = null,
): FastMapGroupMember[] {
  let byGmcpId: Map<string, Partial<MapperRoom>> | null = null;
  const resolved: FastMapGroupMember[] = [];

  members.forEach((member, index) => {
    const serverId = member.mapid === undefined || member.mapid === null ? '' : normalizedId(member.mapid);
    let position = canonicalMap && serverId && serverId !== '0'
      ? canonicalIdPosition(canonicalMap, serverId)
      : null;
    position ??= canonicalMap ? canonicalRoomPosition(canonicalMap, member.room) : null;

    const localId = serverId ? serverIdIndex[serverId] ?? serverIdIndex[String(member.mapid)] : undefined;
    const localKey = localId ? normalizedId(localId) : serverId;
    position ??= tuplePosition(tuples[localKey] ?? tuples[localId ?? ''] ?? tuples[serverId]);
    position ??= roomPosition(rooms[`m_${localKey}`] ?? rooms[localKey] ?? rooms[`m_${serverId}`] ?? rooms[serverId]);

    if (!position && member.room) {
      const roomName = normalizedText(member.room);
      position = tupleRoomPosition(tuples, member.room);
      const matches = Object.values(rooms).filter(room => normalizedText(room.name ?? '') === roomName);
      if (!position && matches.length === 1) position = roomPosition(matches[0]);
    }
    let roomMatch: Partial<MapperRoom> | undefined;

    if (!position && serverId) {
      byGmcpId ??= new Map(Object.values(rooms)
        .filter(room => typeof room.gmcpId === 'number')
        .map(room => [String(room.gmcpId), room]));
      roomMatch = byGmcpId.get(serverId);
    }

    const resolvedPosition = position ?? roomPosition(roomMatch);
    if (!resolvedPosition) return;
    const name = member.name || member.label || '';
    resolved.push({
      id: String(member.id ?? (name || serverId)),
      name,
      ...resolvedPosition,
      color: colorValue(index),
    });
  });

  return resolved;
}
