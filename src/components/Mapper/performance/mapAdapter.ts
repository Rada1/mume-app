/**
 * @file Converts MUME's bundled room tuples and current live room into compact map data.
 */
// --- Logic Section ---

import { DIR_COUNT, DIR_SLOT, ROOM_ALIGN, ROOM_LIGHT, ROOM_PORTABLE, ROOM_SUNDEATH, TERRAIN, type FastLiveRoom, type FastMapData, type FastRoomExit, type FastRoomOverlay } from './model';
import { LOAD_FLAGS, MOB_FLAGS } from './webcockpit/model';
import { doorFlagBits, exitFlagsFor, liveDoorFlagBits, mapFlagBits, ridableCode, roomEnumCode } from './mapValueAdapters';

type TupleRecord = Readonly<Record<string, readonly unknown[]>>;
type ExitRecord = Readonly<Record<string, unknown>>;

export interface AdaptedFastMap {
  map: FastMapData;
  roomIndexById: ReadonlyMap<string, number>;
  transferables: Transferable[];
}

const terrainAliases: Readonly<Record<string, string>> = {
  building: 'indoors', 'inside/cavern': 'cavern', grasslands: 'field', 'water (shallow)': 'shallow',
  'water (deep)': 'water', base: 'undefined', '0': 'cavern', '1': 'city', '2': 'field',
  '3': 'field', '4': 'forest', '5': 'hills', '6': 'mountains', '7': 'shallow',
  '8': 'water', '9': 'underwater', '11': 'road', '12': 'brush',
};
const directionNames = Object.keys(DIR_SLOT) as Array<keyof typeof DIR_SLOT>;
const directionAliases: Readonly<Record<keyof typeof DIR_SLOT, string>> = {
  n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down', unknown: 'out',
};

const numberAt = (tuple: readonly unknown[], index: number): number => {
  const value = tuple[index];
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 0;
};

const stringAt = (tuple: readonly unknown[], index: number): string => {
  const value = tuple[index];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
};

export function terrainIndex(value: unknown): number {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = raw.trim().toLowerCase();
  const label = terrainAliases[normalized] ?? normalized;
  const found = TERRAIN.indexOf(label as (typeof TERRAIN)[number]);
  return found < 0 ? 0 : found;
}

function asRecord(value: unknown): ExitRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ExitRecord : null;
}

function normalizeId(value: unknown): string {
  return String(value ?? '').trim().replace(/^(m_|r_)/, '');
}

function resolveExitTarget(exit: unknown, byId: ReadonlyMap<string, number>, byServer: ReadonlyMap<string, number>): number | null {
  if (typeof exit === 'string' || typeof exit === 'number') {
    const directKey = normalizeId(exit);
    return byId.get(directKey) ?? byServer.get(directKey) ?? null;
  }
  const record = asRecord(exit);
  const target = record?.target ?? record?.id ?? record?.to_vnum ?? record?.to;
  const key = normalizeId(target);
  return byId.get(key) ?? byServer.get(key) ?? null;
}

export function adaptMumeMap(source: TupleRecord): AdaptedFastMap {
  const ids = Object.keys(source);
  const roomIndexById = new Map<string, number>();
  ids.forEach((id, index) => {
    roomIndexById.set(id, index);
    roomIndexById.set(normalizeId(id), index);
  });
  const byServer = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    const serverId = normalizeId(source[ids[i]!]![6]);
    if (serverId && serverId !== '0') byServer.set(serverId, i);
  }

  const roomCount = ids.length;
  const x = new Int32Array(roomCount);
  const y = new Int32Array(roomCount);
  const z = new Int32Array(roomCount);
  const terrain = new Uint8Array(roomCount);
  const roomMetadata = {
    light: new Uint8Array(roomCount),
    align: new Uint8Array(roomCount),
    portable: new Uint8Array(roomCount),
    sundeath: new Uint8Array(roomCount),
  };
  const mobFlags = new Uint32Array(roomCount);
  const loadFlags = new Uint32Array(roomCount);
  const ridable = new Uint8Array(roomCount);
  const exitFlags = new Uint16Array(roomCount * DIR_COUNT);
  const doorFlags = new Uint16Array(roomCount * DIR_COUNT);
  const doorOpen = new Uint8Array(roomCount * DIR_COUNT);
  const doorNames = new Map<number, string>();
  const exitTargetStarts = new Uint32Array(roomCount * DIR_COUNT + 1);
  const targetIndices: number[] = [];
  const serverIds = ids.map(id => stringAt(source[id]!, 6));
  const names = ids.map(id => stringAt(source[id]!, 5));
  const descriptions = ids.map(id => stringAt(source[id]!, 17));

  for (let room = 0; room < roomCount; room++) {
    const tuple = source[ids[room]!]!;
    x[room] = numberAt(tuple, 0);
    y[room] = -numberAt(tuple, 1);
    z[room] = numberAt(tuple, 2);
    terrain[room] = terrainIndex(tuple[3]);
    roomMetadata.light[room] = roomEnumCode(tuple[10], ROOM_LIGHT, 2);
    mobFlags[room] = mapFlagBits(tuple[7], MOB_FLAGS);
    loadFlags[room] = mapFlagBits(tuple[8], LOAD_FLAGS);
    roomMetadata.sundeath[room] = roomEnumCode(tuple[11], ROOM_SUNDEATH, 2);
    roomMetadata.align[room] = roomEnumCode(tuple[12], ROOM_ALIGN, 3);
    roomMetadata.portable[room] = roomEnumCode(tuple[13], ROOM_PORTABLE, 2);
    ridable[room] = ridableCode(tuple[14]);
    const exits = asRecord(tuple[4]);
    for (const direction of directionNames) {
      const slot = room * DIR_COUNT + DIR_SLOT[direction];
      exitTargetStarts[slot] = targetIndices.length;
      if (!exits) continue;
      const rawExit = exits[direction] ?? exits[directionAliases[direction]];
      const target = resolveExitTarget(rawExit, roomIndexById, byServer);
      exitFlags[slot] = exitFlagsFor(rawExit);
      const exitRecord = asRecord(rawExit);
      doorFlags[slot] = doorFlagBits(exitRecord?.doorFlags ?? exitRecord?.flags);
      if (exitRecord?.closed === false) doorOpen[slot] = 1;
      const doorName = exitRecord?.doorName ?? exitRecord?.name;
      if (typeof doorName === 'string' && doorName.trim()) doorNames.set(slot, doorName.trim());
      if (target !== null) targetIndices.push(target);
    }
  }
  exitTargetStarts[roomCount * DIR_COUNT] = targetIndices.length;
  const exitTargets = Uint32Array.from(targetIndices);

  const map: FastMapData = { roomCount, roomIds: ids, serverIds, names, descriptions, x, y, z, terrain,
    ...roomMetadata, mobFlags, loadFlags, ridable, doorOpen, doorFlags, doorNames, exitFlags, exitTargetStarts, exitTargets };
  return {
    map,
    roomIndexById,
    transferables: [x.buffer, y.buffer, z.buffer, terrain.buffer, roomMetadata.light.buffer, roomMetadata.align.buffer, roomMetadata.portable.buffer,
      mobFlags.buffer, loadFlags.buffer, ridable.buffer, roomMetadata.sundeath.buffer, doorOpen.buffer, doorFlags.buffer, exitFlags.buffer, exitTargetStarts.buffer, exitTargets.buffer],
  };
}

function liveExitFlags(exits: Readonly<Record<string, FastRoomExit>>): Uint16Array {
  const flags = new Uint16Array(DIR_COUNT);
  for (const direction of directionNames) {
    const exit = exits[direction] ?? exits[directionAliases[direction]];
    if (!exit) continue;
    flags[DIR_SLOT[direction]] = exitFlagsFor(exit);
  }
  return flags;
}

function liveDoorFlags(exits: Readonly<Record<string, FastRoomExit>>): Uint16Array {
  const flags = new Uint16Array(DIR_COUNT);
  for (const direction of directionNames) {
    const exit = exits[direction] ?? exits[directionAliases[direction]];
    if (exit) flags[DIR_SLOT[direction]] = liveDoorFlagBits(exit);
  }
  return flags;
}

function liveDoorOpen(exits: Readonly<Record<string, FastRoomExit>>): Uint8Array {
  const open = new Uint8Array(DIR_COUNT);
  for (const direction of directionNames) {
    const exit = exits[direction] ?? exits[directionAliases[direction]];
    if (exit?.closed === false) open[DIR_SLOT[direction]] = 1;
  }
  return open;
}

function liveDoorNames(exits: Readonly<Record<string, FastRoomExit>>): Map<number, string> {
  const names = new Map<number, string>();
  for (const direction of directionNames) {
    const exit = exits[direction] ?? exits[directionAliases[direction]];
    const name = exit?.doorName ?? exit?.name;
    if (typeof name === 'string' && name.trim()) names.set(DIR_SLOT[direction], name.trim());
  }
  return names;
}

export function adaptLiveRoom(room: FastLiveRoom | null | undefined): FastRoomOverlay | null {
  if (!room) return null;
  return {
    x: Math.round(room.x),
    y: -Math.round(room.y),
    z: Math.round(room.z),
    terrain: terrainIndex(room.terrain),
    exitFlags: liveExitFlags(room.exits),
    doorFlags: liveDoorFlags(room.exits),
    doorOpen: liveDoorOpen(room.exits),
    mobFlags: mapFlagBits(room.mobFlags, MOB_FLAGS),
    loadFlags: mapFlagBits(room.loadFlags, LOAD_FLAGS),
    ridable: ridableCode(room.ridable),
    light: roomEnumCode(room.light, ROOM_LIGHT, 2),
    align: roomEnumCode(room.align, ROOM_ALIGN, 3),
    portable: roomEnumCode(room.portable, ROOM_PORTABLE, 2),
    sundeath: roomEnumCode(room.sundeath, ROOM_SUNDEATH, 2),
    doorNames: liveDoorNames(room.exits),
  };
}
