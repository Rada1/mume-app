/**
 * @file shaperLegacyInactiveRooms.ts
 * @description Cleanup helper for legacy hidden Shaper grid placeholders.
 */

import type { ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';

// --- Cleanup Section ---
export const removeInactiveRoomAt = (
    doc: ShaperWorkspaceDoc,
    x: number,
    y: number,
    z: number
): ShaperWorkspaceDoc => {
    const inactiveIds = new Set(Object.values(doc.rooms)
        .filter(room => room.inactive && room.kind === 'grid' && room.x === x && room.y === y && room.z === z)
        .map(room => room.id));
    if (inactiveIds.size === 0) return doc;

    const rooms = Object.fromEntries(
        Object.entries(doc.rooms).filter(([, room]) => !inactiveIds.has(room.id))
    ) as Record<ShaperRoomId, ShaperRoomDraft>;
    const exits = Object.fromEntries(Object.entries(doc.exits).filter(([, exit]) =>
        !inactiveIds.has(exit.fromRoomId) && (!exit.toRoomId || !inactiveIds.has(exit.toRoomId))
    ));

    return { ...doc, rooms, exits };
};
