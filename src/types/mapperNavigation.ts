/** @file Shared types for map coordinates and navigation. */
// --- Logic Section ---
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { MapperRoom } from '../components/Mapper/mapperTypes';

export type NavigationMap = Readonly<Record<string, readonly unknown[]>>;
export interface MapRoomPosition { x: number; y: number; z: number }
export interface MapperCoordinateSyncProps {
    rooms: Record<string, MapperRoom>;
    roomsRef: MutableRefObject<Record<string, MapperRoom>>;
    setRooms: Dispatch<SetStateAction<Record<string, MapperRoom>>>;
    preloadedCoordsRef: MutableRefObject<NavigationMap>;
    revision: number;
    editMode: boolean;
    currentRoomId: string | null;
    playerPosRef: MutableRefObject<MapRoomPosition | null>;
    onPositionCorrected: (id: string) => void;
}
