/**
 * @file Keeps the current room's MUME road trail visible above the player marker.
 */
// --- Logic Section ---

import type { FastMapOverlays } from './FastMapOverlays';
import type { FastRoomOverlay } from './model';
import type { GpuLayer, GpuRoomMesh } from './rendererBuffers';

export function drawPlayerRoomTrail(
  overlays: FastMapOverlays,
  roomLayerByRoom: ReadonlyMap<number, GpuLayer>,
  player: { x: number; y: number; z: number } | null,
  liveRoom: FastRoomOverlay | null,
  liveRoomMesh: GpuRoomMesh | null,
  texture: WebGLTexture | null,
  projection: Float32Array,
): void {
  if (!player || !texture) return;
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const z = Math.round(player.z);
  if (liveRoom && liveRoomMesh?.trails && liveRoom.x === x && liveRoom.y === y && liveRoom.z === z) {
    overlays.drawRoomFlags(liveRoomMesh.trails, texture, projection);
    return;
  }

  const roomIndex = overlays.roomIndexAt(x, y, z);
  if (roomIndex === undefined) return;
  const layer = roomLayerByRoom.get(roomIndex);
  const range = layer?.mesh.trailRoomRanges.get(roomIndex);
  if (layer?.trails && range) overlays.drawRoomFlags(layer.trails, texture, projection, range);
}
