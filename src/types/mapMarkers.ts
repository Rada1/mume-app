/** @file Map marker editor and context menu contracts. */
import type { MapperMarker } from '../components/Mapper/mapperTypes';

// --- Editor State ---
export type MapRoomAttribute = 'align' | 'light' | 'sundeath' | 'portable' | 'ridable';
export interface MapMarkerDraft {
    text: string;
    x: string;
    y: string;
    z: string;
    fontSize: string;
    dotSize: string;
}

export interface DeletedMapMarker {
    marker: MapperMarker;
    explored: boolean;
}

export interface MapContextMenuPosition {
    x: number;
    y: number;
    wx: number;
    wy: number;
    roomId: string | null;
    markerId?: string | null;
}
