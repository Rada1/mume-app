/**
 * @file Structured-clone protocol for the Performance Mode map worker.
 */
// --- Logic Section ---

import type { FastMapData, FastMapGroupMember, FastMapTextLabel, FastRoomOverlay } from './model';
import type { FastMapBackground } from './mapBackground';

export interface FastMapView {
  x: number;
  y: number;
  zoom: number;
  layer: number;
}

export interface FastMapPrediction {
  roomId: string;
  directions: string[];
  firstTargetId: string | null;
}

export interface FastMapSearchPoint { x: number; y: number; z: number }

export interface FastMapSearchOverlay {
  matches: FastMapSearchPoint[];
  path: Array<FastMapSearchPoint | null>;
  target: FastMapSearchPoint | null;
  selectedRoom: FastMapSearchPoint | null;
  hovered: FastMapSearchPoint | null;
  color: readonly [number, number, number];
}

export interface FastMapFrame {
  view: FastMapView;
  player: { x: number; y: number; z: number } | null;
  deathRoom?: { x: number; y: number; z: number } | null;
  liveRoom: FastRoomOverlay | null;
  prediction: FastMapPrediction | null;
  background: FastMapBackground;
  brightness: number;
}

export type MainToFastMapWorker =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number; metrics: boolean; transparentBackground: boolean }
  | { type: 'load-map'; map: FastMapData }
  | { type: 'labels'; labels: FastMapTextLabel[] }
  | { type: 'group-members'; members: FastMapGroupMember[] }
  | { type: 'search-overlay'; overlay: FastMapSearchOverlay }
  | { type: 'door-states'; states: Uint32Array }
  | { type: 'explored-rooms'; roomIds: string[]; revealAll: boolean }
  | { type: 'visit-room'; roomId: string }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'frame'; frame: FastMapFrame }
  | { type: 'metrics'; enabled: boolean };

export interface FastMapWorkerMetrics {
  fps: number;
  frameIntervalP95Ms: number;
  frameIntervalMaxMs: number;
  renderP95Ms: number;
  renderMaxMs: number;
  staticBuildMs: number;
  mapLoads: number;
  updates: number;
  coalescedUpdates: number;
  roomCount: number;
}

export type FastMapWorkerEvent =
  | { type: 'ready' }
  | { type: 'map-loaded'; roomCount: number; staticBuildMs: number; mapLoads: number }
  | { type: 'error'; stage: 'init' | 'map' | 'render'; message: string; stack?: string }
  | { type: 'metrics'; stats: FastMapWorkerMetrics };
