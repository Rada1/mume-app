/**
 * @file Draws the worker's current-room mesh over its map tile.
 */
// --- Logic Section ---

import type { FastMapOverlays } from './FastMapOverlays';
import { drawDoorGeometry, drawRoomCategory, drawRoomCover, drawColorGeometry } from './roomGpuDrawing';
import type { GpuColorMesh, GpuRoomMesh } from './rendererBuffers';
import { CATEGORY_TEX, type Category } from './vendor/rooms';
import { FAST_MAP_TILE_TINT } from './fastMapStyle';
import { WHITE } from './vendor/palette';
import { TEX } from './vendor/textures';

const CATEGORIES: readonly Category[] = ['terrain', 'upDown', 'walls'];

export function drawLiveRoomMesh(
  gl: WebGL2RenderingContext,
  roomProgram: Parameters<typeof drawRoomCategory>[1],
  colorProgram: Parameters<typeof drawColorGeometry>[1],
  textures: readonly (WebGLTexture | null)[],
  cover: GpuColorMesh,
  room: GpuRoomMesh,
  overlays: FastMapOverlays,
  projection: Float32Array,
  brightness: number,
): void {
  drawRoomCover(gl, roomProgram, cover);
  for (const category of CATEGORIES) {
    drawRoomCategory(gl, roomProgram, textures, room, category, CATEGORY_TEX[category], category === 'terrain' || category === 'walls' || category === 'dottedWalls' ? FAST_MAP_TILE_TINT : WHITE, brightness);
  }
  overlays.drawRoomFlags(room.trails, textures[TEX.A64] ?? null, projection);
  drawDoorGeometry(gl, colorProgram, room.doorMesh, room.doorCount);
  overlays.drawRoomFlags(room.flags, textures[TEX.A128] ?? null, projection);
  drawColorGeometry(gl, colorProgram, room.verticalExitMesh, room.verticalExitVertexCount, FAST_MAP_TILE_TINT);
}
