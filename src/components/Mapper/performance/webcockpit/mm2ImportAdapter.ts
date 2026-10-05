/**
 * @file Adapts WebCockpit's canonical MM2 model to the mapper's import boundary.
 */
// --- Logic Section ---

import type { CompactMapExit, MapperMarker } from '../../mapperTypes';
import { DIR_COUNT, DIR_NAMES, DOOR_FLAG, EXIT_FLAG, LOAD_FLAGS, MOB_FLAGS, type MapData } from './model';

export interface LegacyMapImport {
  rooms: Record<string, readonly unknown[]>;
  markers: Record<string, MapperMarker>;
}

function flagsFromBits(value: number, names: readonly string[]): string[] {
  return names.filter((_, index) => (value & (1 << index)) !== 0).map(name => name.toUpperCase());
}

function exitsForRoom(map: MapData, room: number): Record<string, CompactMapExit> {
  const exits: Record<string, CompactMapExit> = {};
  for (let dir = 0; dir < DIR_COUNT; dir++) {
    const slot = room * DIR_COUNT + dir;
    const start = map.outStart[slot]!;
    const end = map.outStart[slot + 1]!;
    if (end <= start) continue;
    const targetRoom = map.outTo[start]!;
    const exitFlags = map.exitFlags[slot]!;
    const doorFlags = map.doorFlags[slot]!;
    const doorName = map.doorNames.get(slot);
    const direction = dir === 6 ? 'out' : DIR_NAMES[dir]!;
    exits[direction] = {
      target: String(map.extId[targetRoom]),
      hasDoor: (exitFlags & EXIT_FLAG.DOOR) !== 0 || doorFlags !== 0 || !!doorName,
      doorName,
      flags: Object.entries(EXIT_FLAG)
        .filter(([, bit]) => (exitFlags & bit) !== 0)
        .map(([name]) => name),
      doorFlags: flagsFromBits(doorFlags, Object.keys(DOOR_FLAG)),
    };
  }
  return exits;
}

export function mapDataToLegacyImport(map: MapData, floorHeight = 1): LegacyMapImport {
  const rooms: Record<string, readonly unknown[]> = {};
  for (let room = 0; room < map.roomCount; room++) {
    const key = String(map.extId[room]);
    rooms[key] = [
      map.x[room]! + 1,
      -map.y[room]! + 1,
      map.z[room]! * floorHeight,
      map.terrain[room]!,
      exitsForRoom(map, room),
      map.names[room]!,
      String(map.serverId[room] || map.extId[room]),
      flagsFromBits(map.mobFlags[room]!, MOB_FLAGS),
      flagsFromBits(map.loadFlags[room]!, LOAD_FLAGS),
      map.areas[room]!,
      map.light[room]!,
      map.sundeath[room]!,
      map.align[room]!,
      map.portable[room]!,
      map.ridable[room]!,
      map.notes?.[room] ?? '',
      '',
      map.descs[room]!,
    ];
  }

  const markers: Record<string, MapperMarker> = {};
  const marks = map.infomarks;
  for (let mark = 0; mark < marks.count; mark++) {
    if (marks.type[mark] !== 0 || !marks.text[mark]) continue;
    const id = `mm2_${mark}`;
    markers[id] = {
      id,
      x: marks.x1[mark]! / 100 + 1,
      y: -marks.y1[mark]! / 100 + 1,
      z: marks.z1[mark]! * floorHeight,
      text: marks.text[mark]!,
      dotSize: 4,
      fontSize: 10,
      infomarkClass: marks.cls[mark]!,
      infomarkAngle: marks.angle[mark]!,
      createdAt: Date.now(),
    };
  }
  return { rooms, markers };
}
