/**
 * @file Typed payloads for short-lived nearby-player scans from `where`.
 */
// --- Logic Section ---

export interface WhereScanPlayer {
  name: string;
  distance: string;
  direction: string;
  room: string;
}

export interface WhereScanSnapshot {
  players: WhereScanPlayer[];
  startedAt: number;
}
