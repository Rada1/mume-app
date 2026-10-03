/**
 * @file Draws textured room overlays, optionally limited to one room's vertex range.
 */
// --- Logic Section ---

import type { GpuSpriteMesh } from './rendererBuffers';
import type { WebGLProgramWithUniforms } from './webglProgram';

export function drawRoomSpriteFlags(
  gl: WebGL2RenderingContext,
  program: WebGLProgramWithUniforms,
  mesh: GpuSpriteMesh | null,
  texture: WebGLTexture | null,
  view: Float32Array,
  color: Float32Array,
  range?: { first: number; count: number },
): void {
  if (!mesh || !texture) return;
  gl.useProgram(program.program);
  gl.uniform4fv(program.uniforms.get('uView') ?? null, view);
  gl.uniform4fv(program.uniforms.get('uColor') ?? null, color);
  gl.uniform1i(program.uniforms.get('uTex') ?? null, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.bindVertexArray(mesh.vao);
  gl.drawArrays(gl.TRIANGLES, range?.first ?? 0, range?.count ?? mesh.vertexCount);
}
