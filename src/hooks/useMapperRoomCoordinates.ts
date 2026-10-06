/** @file Keeps saved room coordinates aligned with the bundled map before rendering. */
import { useLayoutEffect } from 'react';
import type { MapperCoordinateSyncProps, NavigationMap, MapRoomPosition } from '../types';
import type { MapperRoom } from '../components/Mapper/mapperTypes';

// --- Logic Section ---
export function mappedRoomPosition(map: NavigationMap, id: string): MapRoomPosition | null {
    const tuple = map[id.replace(/^m_/, '')];
    if (!tuple || typeof tuple[0] !== 'number' || typeof tuple[1] !== 'number') return null;
    return { x: tuple[0], y: tuple[1], z: Number(tuple[2]) || 0 };
}

export function alignMappedRooms(rooms: Record<string, MapperRoom>, map: NavigationMap): Record<string, MapperRoom> {
    let aligned = rooms;
    for (const [id, room] of Object.entries(rooms)) {
        const position = mappedRoomPosition(map, id);
        if (!position || (room.x === position.x && room.y === position.y && room.z === position.z)) continue;
        if (aligned === rooms) aligned = { ...rooms };
        aligned[id] = { ...room, ...position };
    }
    return aligned;
}

export function useMapperRoomCoordinates(props: MapperCoordinateSyncProps): void {
    const { rooms, roomsRef, setRooms, preloadedCoordsRef, revision, editMode, currentRoomId, playerPosRef, onPositionCorrected } = props;
    useLayoutEffect(() => {
        if (editMode) return;
        const aligned = alignMappedRooms(rooms, preloadedCoordsRef.current);
        if (aligned === rooms) return;
        roomsRef.current = aligned;
        setRooms(aligned);
        if (currentRoomId && aligned[currentRoomId] !== rooms[currentRoomId]) {
            const room = aligned[currentRoomId];
            if (room) playerPosRef.current = { x: room.x, y: room.y, z: room.z };
            onPositionCorrected(currentRoomId);
        }
    }, [rooms, roomsRef, setRooms, preloadedCoordsRef, revision, editMode, currentRoomId, playerPosRef, onPositionCorrected]);
}
