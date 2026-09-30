/**
 * @file Builds the current-room GPU mesh from a small live overlay.
 */
// --- Logic Section ---

import { DIR_COUNT, type FastMapData, type FastRoomOverlay } from './model';
import { buildRoomMeshes } from './vendor/rooms';
import { createColorMesh, createInstancedBuffer, createSpriteMesh, createVao, type GpuRoomMesh } from './rendererBuffers';

export function buildLiveRoomGpuMesh(gl: WebGL2RenderingContext, room: FastRoomOverlay): GpuRoomMesh | null {
  const map: FastMapData = {
    roomCount: 1,
    roomIds: ['live'],
    serverIds: [''],
    names: [''],
    descriptions: [''],
    x: new Int32Array([room.x]),
    y: new Int32Array([room.y]),
    z: new Int32Array([room.z]),
    terrain: new Uint8Array([room.terrain]),
    light: new Uint8Array([room.light ?? 0]),
    align: new Uint8Array([room.align ?? 0]),
    portable: new Uint8Array([room.portable ?? 0]),
    mobFlags: new Uint32Array([room.mobFlags ?? 0]),
    loadFlags: new Uint32Array([room.loadFlags ?? 0]),
    ridable: new Uint8Array([room.ridable ?? 0]),
    sundeath: new Uint8Array([room.sundeath ?? 0]),
    doorNames: room.doorNames,
    doorOpen: room.doorOpen,
    doorFlags: room.doorFlags,
    exitFlags: room.exitFlags,
    exitTargetStarts: new Uint32Array(DIR_COUNT + 1),
    exitTargets: new Uint32Array(),
  };
  const mesh = buildRoomMeshes(map, 'current', 1)[0];
  if (!mesh) return null;
  const vao = createVao(gl);
  const buffer = createInstancedBuffer(gl, vao);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.inst, gl.DYNAMIC_DRAW);
  gl.bindVertexArray(null);
  return {
    mesh,
    vao,
    buffer,
    flags: createSpriteMesh(gl, mesh.flagVertices, gl.DYNAMIC_DRAW),
    trails: createSpriteMesh(gl, mesh.trailVertices, gl.DYNAMIC_DRAW),
    doorMesh: mesh.doorVertices.length ? createColorMesh(gl, mesh.doorVertices) : null,
    doorCount: mesh.doorSlots.length,
    verticalExitMesh: mesh.verticalExitVertices.length ? createColorMesh(gl, mesh.verticalExitVertices) : null,
    verticalExitVertexCount: mesh.verticalExitVertices.length / 7,
  };
}
