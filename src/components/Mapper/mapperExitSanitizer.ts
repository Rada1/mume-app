/**
 * @file mapperExitSanitizer.ts
 * @description Removes mapper exits that were accidentally created from text room labels.
 */

import { MapperExit, MapperRoom } from './mapperTypes';

// --- Logic Section ---
const isTextDerivedDoorExit = (exit: MapperExit) => (
    !!exit.name &&
    exit.hasDoor === true &&
    !exit.target &&
    !exit.gmcpDestId &&
    !exit.doorName &&
    (!exit.flags || exit.flags.length === 0) &&
    (!exit.doorFlags || exit.doorFlags.length === 0)
);

export const sanitizeTextDerivedDoorExits = (room: MapperRoom): MapperRoom => {
    const nextExits: Record<string, MapperExit> = {};
    let changed = false;

    for (const [dir, exit] of Object.entries(room.exits || {})) {
        if (isTextDerivedDoorExit(exit)) {
            changed = true;
            continue;
        }
        nextExits[dir] = exit;
    }

    return changed ? { ...room, exits: nextExits } : room;
};
