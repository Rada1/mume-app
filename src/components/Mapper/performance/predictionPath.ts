/**
 * @file Resolves the queued MUME movement directions into fast-map room centers.
 */
// --- Logic Section ---

import type { FastMapData } from './model';
import type { FastMapPrediction } from './protocol';

export interface FastMapPoint {
  x: number;
  y: number;
  z: number;
}

export function createFastMapPrediction(
  roomId: string | null,
  queuedMoves: readonly { dir: string }[],
  queuedTarget: { dir: string; targetId: string } | null,
  plannedTargetId: string | null = null
): FastMapPrediction | null {
  if (!roomId || queuedMoves.length === 0) return null;
  const headDirection = DIR_SLOT[queuedMoves[0]!.dir.trim().toLowerCase()];
  const targetDirection = queuedTarget ? DIR_SLOT[queuedTarget.dir.trim().toLowerCase()] : undefined;
  const firstTargetId = queuedTarget && headDirection !== undefined && targetDirection === headDirection
    ? queuedTarget.targetId
    : plannedTargetId;
  return { roomId, directions: queuedMoves.map(move => move.dir), firstTargetId };
}

const DIR_SLOT: Readonly<Record<string, number>> = {
  n: 0, north: 0, s: 1, south: 1, e: 2, east: 2, w: 3, west: 3,
  u: 4, up: 4, d: 5, down: 5, out: 6, unknown: 6,
};

function normalizeRoomId(id: string): string {
  return id.trim().replace(/^(m_|r_)/, '');
}

export function createFastMapRoomIndex(map: FastMapData): Map<string, number> {
  const byId = new Map<string, number>();
  for (let room = 0; room < map.roomCount; room++) {
    const roomId = map.roomIds[room] ?? '';
    if (roomId) byId.set(normalizeRoomId(roomId), room);
    const serverId = map.serverIds[room] ?? '';
    if (serverId && !byId.has(normalizeRoomId(serverId))) byId.set(normalizeRoomId(serverId), room);
  }
  return byId;
}

export function resolveFastMapPredictionPoints(
  map: FastMapData,
  roomIndexById: ReadonlyMap<string, number>,
  prediction: FastMapPrediction | null
): FastMapPoint[] {
  if (!prediction || prediction.directions.length === 0) return [];
  let room = roomIndexById.get(normalizeRoomId(prediction.roomId));
  if (room === undefined) return [];

  const points: FastMapPoint[] = [{ x: map.x[room]! + 0.5, y: map.y[room]! + 0.5, z: map.z[room]! }];
  const preferredFirstTarget = prediction.firstTargetId
    ? roomIndexById.get(normalizeRoomId(prediction.firstTargetId))
    : undefined;

  for (let step = 0; step < prediction.directions.length; step++) {
    const direction = DIR_SLOT[prediction.directions[step]!.trim().toLowerCase()];
    if (direction === undefined) break;
    const slot = room * 7 + direction;
    const start = map.exitTargetStarts[slot]!;
    const end = map.exitTargetStarts[slot + 1]!;
    // A failed command contributes no segment, but later queued commands may
    // still leave this room. This matches MMapper's walk_path behavior.
    if (end <= start) continue;

    let target: number | undefined;
    if (step === 0 && preferredFirstTarget !== undefined) {
      for (let edge = start; edge < end; edge++) {
        if (map.exitTargets[edge] === preferredFirstTarget) target = preferredFirstTarget;
      }
    }
    if (target === undefined && end - start === 1) target = map.exitTargets[start]!;
    if (target === undefined) break;

    room = target;
    points.push({ x: map.x[room]! + 0.5, y: map.y[room]! + 0.5, z: map.z[room]! });
  }
  return points.length > 1 ? points : [];
}
