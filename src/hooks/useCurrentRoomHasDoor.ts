/**
 * @file useCurrentRoomHasDoor.ts
 * @description Reports whether the current mapped room has a door exit.
 */

import { useMapper } from '../context/useMapper';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
import { normalizeExitKey } from '../utils/gmcpExitUtils';

// --- Logic Section ---

function isDoorExit(exit: MapperRoom['exits'][string]): boolean {
    return exit.hasDoor === true
        || Boolean(exit.doorName)
        || exit.flags?.some(flag => /door|gate|portcullis|secret/i.test(flag)) === true
        || (exit.doorFlags?.length ?? 0) > 0;
}

function getRoomDoorDirections(room: MapperRoom | undefined): string[] {
    return Object.entries(room?.exits ?? {})
        .filter(([, exit]) => isDoorExit(exit))
        .map(([direction]) => normalizeExitKey(direction));
}

function getCurrentRoom(rooms: Record<string, MapperRoom>, currentRoomId: string | null | undefined): MapperRoom | undefined {
    const roomKey = currentRoomId?.replace(/^m_/, '') ?? '';
    return currentRoomId
        ? rooms[currentRoomId] ?? rooms[roomKey] ?? rooms[`m_${roomKey}`]
        : undefined;
}

function roomHasDoor(room: MapperRoom | undefined): boolean {
    return getRoomDoorDirections(room).length > 0;
}

export function useCurrentRoomDoorDirections(): string[] {
    const { currentRoomId, rooms } = useMapper();
    const currentRoom = getCurrentRoom(rooms, currentRoomId);
    return getRoomDoorDirections(currentRoom);
}

export function useCurrentRoomHasDoor(): boolean {
    const { currentRoomId, rooms } = useMapper();
    const currentRoom = getCurrentRoom(rooms, currentRoomId);
    return roomHasDoor(currentRoom);
}
