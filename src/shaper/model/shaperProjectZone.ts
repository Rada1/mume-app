/**
 * @file shaperProjectZone.ts
 * @description Zone-number mutation helpers for Shaper projects.
 */

import { formatRoomNumber } from './shaperDocument';
import type { ShaperRoomDraft, ShaperRoomId, ShaperWorkspaceDoc } from './shaperTypes';

// --- Renumber Section ---
const roomNumberSuffix = (roomNumber: string): string | null => {
    const separator = roomNumber.indexOf(':');
    return separator >= 0 ? roomNumber.slice(separator + 1) : null;
};

const renumberRoom = (room: ShaperRoomDraft, zoneNumber: number): ShaperRoomDraft => {
    const suffix = roomNumberSuffix(room.roomNumber);
    if (suffix) return { ...room, roomNumber: `${zoneNumber}:${suffix}` };
    if (room.kind === 'grid') return { ...room, roomNumber: formatRoomNumber(zoneNumber, room.x, room.y) };
    return room;
};

export const changeShaperProjectZone = (
    doc: ShaperWorkspaceDoc,
    zoneNumber: number
): ShaperWorkspaceDoc => {
    if (!Number.isInteger(zoneNumber) || zoneNumber < 0 || doc.zoneNumber === zoneNumber) return doc;
    const rooms = Object.fromEntries(
        Object.entries(doc.rooms).map(([id, room]) => [id, renumberRoom(room, zoneNumber)])
    ) as Record<ShaperRoomId, ShaperRoomDraft>;
    return { ...doc, zoneNumber, rooms };
};
