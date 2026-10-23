/** @file Applies saved room icon edits to worker-owned map buffers. */
import type { MapperRoom } from '../mapperTypes';
import { DIR_COUNT, DIR_SLOT, ROOM_ALIGN, ROOM_LIGHT, ROOM_PORTABLE, type FastMapData } from './model';
import { LOAD_FLAGS, MOB_FLAGS } from './webcockpit/model';
import { doorFlagBits, exitFlagsFor, mapFlagBits, ridableCode, roomEnumCode } from './mapValueAdapters';

// --- Local Icon Overrides ---
export const roomFlagEditSignature = (rooms: Readonly<Record<string, MapperRoom>>): string =>
    JSON.stringify(Object.entries(rooms).filter(([, room]) => room.mapFlagsEdited || room.mapAttributesEdited?.length || Object.values(room.exits).some(exit => exit.mapFlagsEdited))
        .map(([id, room]) => [id, room.mapFlagsEdited, room.mobFlags ?? [], room.loadFlags ?? [],
            room.mapAttributesEdited, room.align, room.light, room.portable, room.ridable,
            Object.entries(room.exits).filter(([, exit]) => exit.mapFlagsEdited).map(([direction, exit]) => [direction, exit.flags, exit.doorFlags, exit.hasDoor])]));

export const applyLocalMapFlagEdits = (map: FastMapData, rooms: Readonly<Record<string, MapperRoom>>): void => {
    for (let index = 0; index < map.roomCount; index++) {
        const id = map.roomIds[index]!;
        const rawId = id.replace(/^m_/, '');
        const room = rooms[id] ?? rooms[`m_${rawId}`] ?? rooms[rawId];
        if (!room) continue;
        for (const [direction, exit] of Object.entries(room.exits)) {
            if (!exit.mapFlagsEdited || !(direction in DIR_SLOT)) continue;
            const slot = index * DIR_COUNT + DIR_SLOT[direction as keyof typeof DIR_SLOT];
            map.exitFlags[slot] = exitFlagsFor(exit);
            if (map.doorFlags) map.doorFlags[slot] = doorFlagBits(exit.doorFlags);
        }
        if (room.mapFlagsEdited) {
            if (map.mobFlags) map.mobFlags[index] = mapFlagBits(room.mobFlags, MOB_FLAGS);
            if (map.loadFlags) map.loadFlags[index] = mapFlagBits(room.loadFlags, LOAD_FLAGS);
        }
        if (room.mapAttributesEdited?.includes('light') && map.light) map.light[index] = roomEnumCode(room.light, ROOM_LIGHT, 2);
        if (room.mapAttributesEdited?.includes('align') && map.align) map.align[index] = roomEnumCode(room.align, ROOM_ALIGN, 3);
        if (room.mapAttributesEdited?.includes('portable') && map.portable) map.portable[index] = roomEnumCode(room.portable, ROOM_PORTABLE, 2);
        if (room.mapAttributesEdited?.includes('ridable') && map.ridable) map.ridable[index] = ridableCode(room.ridable);
    }
};
