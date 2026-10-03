/**
 * @file Shared WebGL draw helpers for static and live room meshes.
 */
// --- Logic Section ---

import type { Category, RoomLayerMesh } from './vendor/rooms';
import type { WebGLProgramWithUniforms } from './webglProgram';
import type { GpuColorMesh } from './rendererBuffers';
import { DOOR_VERTEX_COUNT } from './doorGeometry';
import { WHITE } from './vendor/palette';

interface RoomGpuSource {
  mesh: RoomLayerMesh;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
}

export function drawRoomCategory(
  gl: WebGL2RenderingContext,
  program: WebGLProgramWithUniforms,
  textures: readonly (WebGLTexture | null)[],
  source: RoomGpuSource,
  category: Category,
  textureIndex: number,
  color: readonly [number, number, number, number],
  brightness = 1,
): void {
  const range = source.mesh.ranges[category];
  const texture = textures[textureIndex];
  if (!range.count || !texture) return;
  gl.useProgram(program.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.uniform1i(program.uniforms.get('uTex') ?? null, 0);
  gl.uniform4f(program.uniforms.get('uColor') ?? null, color[0], color[1], color[2], color[3]);
  gl.uniform1i(program.uniforms.get('uWhite') ?? null, 0);
  gl.uniform1f(program.uniforms.get('uBrightness') ?? null, brightness);
  gl.bindVertexArray(source.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, source.buffer);
  gl.vertexAttribIPointer(0, 4, gl.INT, 16, range.first * 16);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, range.count);
}

export function drawDoorGeometry(gl: WebGL2RenderingContext, program: WebGLProgramWithUniforms, mesh: GpuColorMesh | null, count: number): void {
  drawColorGeometry(gl, program, mesh, count * DOOR_VERTEX_COUNT);
}

export function drawColorGeometry(
  gl: WebGL2RenderingContext,
  program: WebGLProgramWithUniforms,
  mesh: GpuColorMesh | null,
  vertexCount: number,
  color: readonly [number, number, number, number] = WHITE,
): void {
  if (!mesh || vertexCount === 0) return;
  gl.useProgram(program.program);
  gl.uniform4f(program.uniforms.get('uColor') ?? null, color[0], color[1], color[2], color[3]);
  gl.bindVertexArray(mesh.vao);
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

export function drawRoomCover(gl: WebGL2RenderingContext, program: WebGLProgramWithUniforms, mesh: GpuColorMesh): void {
  gl.useProgram(program.program);
  gl.uniform4f(program.uniforms.get('uColor') ?? null, 1, 1, 1, 1);
  gl.uniform1f(program.uniforms.get('uBrightness') ?? null, 1);
  gl.bindVertexArray(mesh.vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
