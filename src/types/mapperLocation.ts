/** @file Contracts for evidence-based mapper location tracking. */
import type { MapperRoomInfoProps, MapperPreloadedExit } from './mapperRoomTracking';
import type { MapperRoomInfoInput } from './mapperRoomTracking';

// --- Candidate and confidence contracts ---
export type MapperLocationConfidence = 'confirmed' | 'uncertain' | 'searching';
export interface MapperLocationCandidate { id: string; weight: number }
export interface MapperLocationState {
    confidence: MapperLocationConfidence;
    candidates: MapperLocationCandidate[];
    lastConfirmedId: string | null;
}
export interface MapperMatchRoom {
    id: string;
    serverId: number;
    name: string;
    desc: string;
    terrain: string;
    area: string;
    x: number;
    y: number;
    z: number;
    exits: Record<string, MapperPreloadedExit>;
}
export interface MapperObservationIndex {
    names: Map<string, string[]>;
    descriptions: Map<string, string[]>;
    namesAndDescriptions: Map<string, Map<string, string[]>>;
    areas: Map<string, string[]>;
    incoming: Map<string, string[]>;
    allIds: string[];
}
export interface MapperLocationResult {
    id: string | null;
    source: string;
    relocation: boolean;
}
export type MapperLocationInputs = Pick<MapperRoomInfoProps, 'roomsRef' | 'preloadedCoordsRef' | 'serverIdIndexRef' | 'spatialIndexRef'>;
export type MapperTrackingInput = MapperRoomInfoInput & { characterName: string | null; executeCommand?: (cmd: string, silent?: boolean) => void };
export interface MapperMovementDetail { dir?: string; source?: string; isDark?: boolean }
