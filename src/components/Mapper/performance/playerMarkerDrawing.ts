/**
 * @file Draws the current player-room marker through the room texture shader.
 */
// --- Logic Section ---

import type { WebGLProgramWithUniforms } from './webglProgram';
import { L256, TEX } from './vendor/textures';
import { WHITE, withAlpha } from './vendor/palette';
import { ROOM_VISITED } from './roomExploration';

const PLAYER_MARKER_ALPHA = 0.65;

export function drawPlayerMarker(
  gl: WebGL2RenderingContext,
  roomProgram: WebGLProgramWithUniforms,
  vao: WebGLVertexArrayObject,
  buffer: WebGLBuffer,
  textures: readonly (WebGLTexture | null)[],
  player: { x: number; y: number; z: number },
): void {
  const visibility = ROOM_VISITED << 12;
  const instance = new Int32Array([
    Math.round(player.x), Math.round(player.y), Math.round(player.z), L256.charRoomSel | visibility,
  ]);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, instance, gl.DYNAMIC_DRAW);
  gl.useProgram(roomProgram.program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, textures[TEX.A256]);
  gl.uniform1i(roomProgram.uniforms.get('uTex') ?? null, 0);
  gl.uniform4fv(roomProgram.uniforms.get('uColor') ?? null, withAlpha(WHITE, PLAYER_MARKER_ALPHA));
  gl.uniform1i(roomProgram.uniforms.get('uWhite') ?? null, 0);
  gl.uniform1f(roomProgram.uniforms.get('uBrightness') ?? null, 1);
  gl.bindVertexArray(vao);
  gl.vertexAttribIPointer(0, 4, gl.INT, 16, 0);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
}
