/** @file Shared inputs for mapper arrival matching and room observation updates. */
import type React from 'react';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
// --- Tracking contracts ---
export type MapperPreloadedExit = string | number | {
    target?: string | number;
    targets?: (string | number)[];
    id?: string | number;
    to?: string | number;
    to_vnum?: string | number;
    hasDoor?: boolean;
    flags?: string[];
};
export type MapperPreloadedRoom = [
    number, number, number, string | number,
    Record<string, MapperPreloadedExit>?, string?, (string | number)?,
    string[]?, string[]?, string?, (string | number)?, number?, ...unknown[]
];
/** Legacy map loaders expose positional arrays before the tracking schema is applied. */
export type MapperRoomInfoInput = Omit<MapperRoomInfoProps, 'preloadedCoordsRef'> & {
    preloadedCoordsRef: React.MutableRefObject<Record<string, unknown[]>>;
};
export interface MapperRoomInfoProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    pendingMovesRef: React.MutableRefObject<{ dir: string; time: number }[]>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, MapperPreloadedRoom>>;
    spatialIndexRef?: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    triggerRender?: () => void;
    onRoomInfoProcessed?: (confirmedRoomId?: string | null) => void;
    onFirstVisitLoadFlag?: (roomId: string) => void;
    onMoveConfirmed?: (dir: string) => void;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
    preMoveRef?: React.MutableRefObject<{ dir: string; targetId: string; time: number } | null>;
    deathRoomId?: string | null;
    setDeathRoomId?: (val: string | null) => void;
    baseMapExitsRef?: React.MutableRefObject<Record<string, MapperPreloadedRoom | { light?: string | number; sundeath?: number }>>;
    activeView: string;
    // When false (default / "play mode"), the mapper only TRACKS position against the
    // preloaded base map and never fabricates a brand-new room. When true ("map edit
    // mode"), unmatched room events may create new rooms/exits for manual mapping.
    mapEditMode?: boolean;
}
