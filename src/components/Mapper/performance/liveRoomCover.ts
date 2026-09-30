/** @file Uploads the opaque background tile beneath the live room overlay. */
// --- Logic Section ---

import type { FastMapBackground } from './mapBackground';
import type { FastRoomOverlay } from './model';
import type { GpuColorMesh } from './rendererBuffers';

export function updateLiveRoomCover(gl: WebGL2RenderingContext, mesh: GpuColorMesh, room: FastRoomOverlay, background: FastMapBackground): void {
  const inset = 0.005;
  const x1 = room.x + inset;
  const y1 = room.y + inset;
  const x2 = room.x + 1 - inset;
  const y2 = room.y + 1 - inset;
  const color = [background[0], background[1], background[2], 1];
  const vertex = (x: number, y: number) => [x, y, room.z, ...color];
  const vertices = new Float32Array([
    ...vertex(x1, y1), ...vertex(x2, y1), ...vertex(x1, y2),
    ...vertex(x1, y2), ...vertex(x2, y1), ...vertex(x2, y2),
  ]);
  gl.bindVertexArray(mesh.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(null);
}
