/** @file Draws MMapper-style death-room pulses and off-screen arrows. */
// --- Logic Section ---

import type { FastMapView } from './protocol';
import { buildDeathMarkerGeometry } from './deathMarkerGeometry';
import { createColorMesh, type GpuColorMesh } from './rendererBuffers';
import { drawColorGeometry } from './roomGpuDrawing';
import { compileProgram, type WebGLProgramWithUniforms } from './webglProgram';
import { COLOR_FS, COLOR_VS } from './vendor/shaders';

export class DeathMarkerOverlay {
  private readonly program: WebGLProgramWithUniforms;
  private readonly mesh: GpuColorMesh;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = compileProgram(gl, COLOR_VS, COLOR_FS, ['uView', 'uColor']);
    this.mesh = createColorMesh(gl);
  }

  draw(room: { x: number; y: number; z: number } | null | undefined, view: FastMapView, width: number, height: number, now: number): void {
    const vertices = buildDeathMarkerGeometry(room, view, width, height, now);
    if (!vertices.length) return;
    this.gl.bindVertexArray(this.mesh.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mesh.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);
    this.gl.bindVertexArray(null);
    drawColorGeometry(this.gl, this.program, this.mesh, vertices.length / 7);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.mesh.buffer);
    this.gl.deleteVertexArray(this.mesh.vao);
    this.gl.deleteProgram(this.program.program);
  }
}
