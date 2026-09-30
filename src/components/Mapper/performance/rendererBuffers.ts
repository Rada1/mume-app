/**
 * @file WebGL buffer allocation helpers used by the worker map renderer.
 */
// --- Logic Section ---

import type { RoomLayerMesh } from './vendor/rooms';

export interface GpuLayer {
  z: number;
  mesh: RoomLayerMesh;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  flags: GpuSpriteMesh | null;
  trails: GpuSpriteMesh | null;
  doorMesh: GpuColorMesh | null;
  doorCount: number;
  verticalExitMesh: GpuColorMesh | null;
  verticalExitVertexCount: number;
}

export interface GpuRoomMesh {
  mesh: RoomLayerMesh;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  flags: GpuSpriteMesh | null;
  trails: GpuSpriteMesh | null;
  doorMesh: GpuColorMesh | null;
  doorCount: number;
  verticalExitMesh: GpuColorMesh | null;
  verticalExitVertexCount: number;
}

export interface GpuSpriteMesh {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  vertexCount: number;
}

export interface GpuColorMesh {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
}

export function createVao(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('WebGL could not allocate a room vertex array.');
  return vao;
}

export function createInstancedBuffer(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('WebGL could not allocate a room vertex buffer.');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribDivisor(0, 1);
  gl.bindVertexArray(null);
  return buffer;
}

export function createColorMesh(gl: WebGL2RenderingContext, vertices?: Float32Array): GpuColorMesh {
  const vao = createVao(gl);
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('WebGL could not allocate a live-room buffer.');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  if (vertices) gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  else gl.bufferData(gl.ARRAY_BUFFER, 6 * 7 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  gl.bindVertexArray(null);
  return { vao, buffer };
}

export function createSpriteMesh(gl: WebGL2RenderingContext, vertices: Float32Array, usage: number = gl.STATIC_DRAW): GpuSpriteMesh | null {
  if (vertices.length === 0) return null;
  const vao = createVao(gl);
  const buffer = gl.createBuffer();
  if (!buffer) {
    gl.deleteVertexArray(vao);
    throw new Error('WebGL could not allocate a room flag buffer.');
  }
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, usage);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);
  return { vao, buffer, vertexCount: vertices.length / 7 };
}

export function disposeSpriteMesh(gl: WebGL2RenderingContext, mesh: GpuSpriteMesh | null): void {
  if (!mesh) return;
  gl.deleteBuffer(mesh.buffer);
  gl.deleteVertexArray(mesh.vao);
}

export function disposeRoomMesh(gl: WebGL2RenderingContext, mesh: GpuRoomMesh): void {
  gl.deleteBuffer(mesh.buffer);
  gl.deleteVertexArray(mesh.vao);
  disposeSpriteMesh(gl, mesh.flags);
  disposeSpriteMesh(gl, mesh.trails);
  if (mesh.doorMesh) {
    gl.deleteBuffer(mesh.doorMesh.buffer);
    gl.deleteVertexArray(mesh.doorMesh.vao);
  }
  if (mesh.verticalExitMesh) {
    gl.deleteBuffer(mesh.verticalExitMesh.buffer);
    gl.deleteVertexArray(mesh.verticalExitMesh.vao);
  }
}

export function disposeLayers(gl: WebGL2RenderingContext, layers: readonly GpuLayer[]): void {
  for (const layer of layers) {
    gl.deleteBuffer(layer.buffer);
    gl.deleteVertexArray(layer.vao);
    disposeSpriteMesh(gl, layer.flags);
    disposeSpriteMesh(gl, layer.trails);
    if (layer.doorMesh) {
      gl.deleteBuffer(layer.doorMesh.buffer);
      gl.deleteVertexArray(layer.doorMesh.vao);
    }
    if (layer.verticalExitMesh) {
      gl.deleteBuffer(layer.verticalExitMesh.buffer);
      gl.deleteVertexArray(layer.verticalExitMesh.vao);
    }
  }
}
