/** @file roomIdentityUtils.ts — Builds a stable identity for room-scoped client state. */

// --- Logic Section ---
export interface RoomIdentityParts {
    roomNum: number;
    roomName: string;
    roomZone: string;
    roomDesc: string;
}

const normalizeRoomText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const getRoomIdentityKey = ({ roomNum, roomName, roomZone, roomDesc }: RoomIdentityParts): string => {
    if (Number.isFinite(roomNum) && roomNum !== 0) return `id:${roomNum}`;
    return `text:${normalizeRoomText(roomZone)}|${normalizeRoomText(roomName)}|${normalizeRoomText(roomDesc)}`;
};
