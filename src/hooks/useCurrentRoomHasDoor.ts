/**
 * @file useCurrentRoomHasDoor.ts
 * @description Reports whether the current mapped room has a door exit.
 */

import { useMapper } from '../context/useMapper';
import type { MapperRoom } from '../components/Mapper/mapperTypes';

// --- Logic Section ---

function roomHasDoor(room: MapperRoom | undefined): boolean {
    return Object.values(room?.exits ?? {}).some(exit =>
        exit.hasDoor === true
        || Boolean(exit.doorName)
        || exit.flags?.some(flag => /door|gate|portcullis|secret/i.test(flag)) === true
        || (exit.doorFlags?.length ?? 0) > 0
    );
}

export function useCurrentRoomHasDoor(): boolean {
    const { currentRoomId, rooms } = useMapper();
    const roomKey = currentRoomId?.replace(/^m_/, '') ?? '';
    const currentRoom = currentRoomId
        ? rooms[currentRoomId] ?? rooms[roomKey] ?? rooms[`m_${roomKey}`]
        : undefined;

    return roomHasDoor(currentRoom);
}
