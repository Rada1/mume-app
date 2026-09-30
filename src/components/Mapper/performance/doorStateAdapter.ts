/**
 * @file Resolves app door state into compact worker updates.
 */
// --- Logic Section ---

import { getGateState } from '../mapperUtils';
import type { MapperRoom } from '../mapperTypes';
import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from './model';

const DIRECTIONS = ['n', 's', 'e', 'w', 'u', 'd'] as const;
type TupleMap = Readonly<Record<string, readonly unknown[]>>;
type RoomMap = Readonly<Record<string, MapperRoom>>;

export interface DoorStateSnapshot {
  roomIds: readonly string[];
  roomIndexById: ReadonlyMap<string, number>;
  doorSlots: Uint8Array;
  reciprocalDoorSlots: Int32Array;
  open: Uint8Array;
}

const OPPOSITE_DIRECTION = [1, 0, 3, 2, 5, 4] as const;

function reciprocalDoorSlots(map: FastMapData, doorSlots: Uint8Array): Int32Array {
  const reciprocal = new Int32Array(map.roomCount * DIR_COUNT);
  reciprocal.fill(-1);
  for (let room = 0; room < map.roomCount; room++) {
    for (let direction = 0; direction < 6; direction++) {
      const slot = room * DIR_COUNT + direction;
      if (!(map.exitFlags[slot]! & EXIT_FLAG.EXIT)) continue;
      const start = map.exitTargetStarts[slot]!;
      const end = map.exitTargetStarts[slot + 1]!;
      if (end - start !== 1) continue;
      const target = map.exitTargets[start]!;
      if (target >= map.roomCount) continue;
      const oppositeSlot = target * DIR_COUNT + OPPOSITE_DIRECTION[direction]!;
      if (!(map.exitFlags[oppositeSlot]! & EXIT_FLAG.EXIT)) continue;
      const backStart = map.exitTargetStarts[oppositeSlot]!;
      const backEnd = map.exitTargetStarts[oppositeSlot + 1]!;
      for (let back = backStart; back < backEnd; back++) {
        if (map.exitTargets[back] !== room) continue;
        if (!doorSlots[slot] && !doorSlots[oppositeSlot]) continue;
        doorSlots[slot] = 1;
        doorSlots[oppositeSlot] = 1;
        map.exitFlags[slot] |= EXIT_FLAG.DOOR;
        map.exitFlags[oppositeSlot] |= EXIT_FLAG.DOOR;
        reciprocal[slot] = oppositeSlot;
        reciprocal[oppositeSlot] = slot;
      }
    }
  }
  return reciprocal;
}

function doorOpenForRoom(roomId: string, direction: string, rooms: RoomMap, preloaded: TupleMap): boolean | null {
  const rawId = roomId.replace(/^m_/, '');
  const originalRoom = rooms[roomId] ?? rooms[`m_${rawId}`];
  const longDirection = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' }[direction as 'n' | 's' | 'e' | 'w' | 'u' | 'd'];
  const alternateExit = longDirection ? originalRoom?.exits[longDirection] : undefined;
  const room = originalRoom && alternateExit && !originalRoom.exits[direction]
    ? { ...originalRoom, exits: { ...originalRoom.exits, [direction]: alternateExit } }
    : originalRoom;
  const tuple = preloaded[rawId];
  const gate = getGateState(room, tuple?.[4], direction, rooms, preloaded);
  return gate.hasDoor ? !gate.isClosed : null;
}

export function createDoorStateSnapshot(map: FastMapData, rooms: RoomMap, preloaded: TupleMap): DoorStateSnapshot {
  const doorSlots = new Uint8Array(map.roomCount * DIR_COUNT);
  const open = map.doorOpen?.slice() ?? new Uint8Array(map.roomCount * DIR_COUNT);
  for (let room = 0; room < map.roomCount; room++) {
    for (const direction of DIRECTIONS) {
      const slot = room * DIR_COUNT + DIR_SLOT[direction];
      if (!(map.exitFlags[slot]! & EXIT_FLAG.DOOR)) continue;
      doorSlots[slot] = 1;
      const liveState = doorOpenForRoom(map.roomIds[room]!, direction, rooms, preloaded);
      if (liveState !== null) open[slot] = liveState ? 1 : 0;
    }
  }
  const roomIndexById = new Map<string, number>();
  map.roomIds.forEach((roomId, index) => {
    roomIndexById.set(roomId, index);
    roomIndexById.set(roomId.replace(/^m_/, ''), index);
  });
  const reciprocal = reciprocalDoorSlots(map, doorSlots);
  for (let slot = 0; slot < reciprocal.length; slot++) {
    const other = reciprocal[slot]!;
    if (other <= slot) continue;
    const state = open[slot] || open[other] ? 1 : 0;
    open[slot] = state;
    open[other] = state;
  }
  return { roomIds: map.roomIds, roomIndexById, doorSlots, reciprocalDoorSlots: reciprocal, open };
}

/** Encodes changed door slots as `(slot << 1) | isOpen`; updates the snapshot in place. */
export function updateDoorStateSnapshot(snapshot: DoorStateSnapshot, rooms: RoomMap, preloaded: TupleMap, changedRoomId: string | null): Uint32Array {
  if (!changedRoomId) return new Uint32Array();
  const rawId = changedRoomId.replace(/^m_/, '');
  const room = snapshot.roomIndexById.get(changedRoomId) ?? snapshot.roomIndexById.get(rawId);
  if (room === undefined) return new Uint32Array();
  const changes: number[] = [];
  for (const direction of DIRECTIONS) {
    const slot = room * DIR_COUNT + DIR_SLOT[direction];
    if (!snapshot.doorSlots[slot]) continue;
    const state = doorOpenForRoom(snapshot.roomIds[room]!, direction, rooms, preloaded);
    if (state === null) continue;
    const value = state ? 1 : 0;
    const slots = [slot, snapshot.reciprocalDoorSlots[slot]!];
    for (const changedSlot of slots) {
      if (changedSlot < 0 || snapshot.open[changedSlot] === value) continue;
      snapshot.open[changedSlot] = value;
      changes.push((changedSlot << 1) | value);
    }
  }
  return Uint32Array.from(changes);
}

/** Applies an explicit open/close command without waiting for a room-state render. */
export function applyDoorCommandToSnapshot(
  snapshot: DoorStateSnapshot,
  roomId: string,
  direction: string,
  closed: boolean,
): Uint32Array {
  const directionIndex = DIRECTIONS.indexOf(direction as (typeof DIRECTIONS)[number]);
  if (directionIndex < 0) return new Uint32Array();

  const rawId = roomId.replace(/^m_/, '');
  const roomIndex = snapshot.roomIndexById.get(roomId) ?? snapshot.roomIndexById.get(rawId);
  if (roomIndex === undefined) return new Uint32Array();

  const slot = roomIndex * DIR_COUNT + DIR_SLOT[DIRECTIONS[directionIndex]!];
  if (!snapshot.doorSlots[slot]) return new Uint32Array();

  const value = closed ? 0 : 1;
  const changes: number[] = [];
  for (const changedSlot of [slot, snapshot.reciprocalDoorSlots[slot]!]) {
    if (changedSlot < 0 || snapshot.open[changedSlot] === value) continue;
    snapshot.open[changedSlot] = value;
    changes.push((changedSlot << 1) | value);
  }
  return Uint32Array.from(changes);
}
