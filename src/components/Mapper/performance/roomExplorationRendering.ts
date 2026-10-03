/**
 * @file Applies exploration visibility changes to the fast map's static meshes.
 */
// --- Logic Section ---

import type { FastMapData } from './model';
import { DIR_COUNT } from './model';
import { buildDoorVertices, DOOR_VERTEX_COUNT } from './doorGeometry';
import type { GpuLayer } from './rendererBuffers';
import { buildVerticalExitGeometry } from './verticalExitGeometry';
import { ROOM_VISITED } from './roomExploration';
import type { Range } from './vendor/rooms';

const FLOATS_PER_VERTEX = 7;
const INTS_PER_INSTANCE = 4;
const ROOM_STATE_SHIFT = 12;

export interface DoorLocation { layer: GpuLayer; vertexIndex: number }
export interface VerticalExitLocation { layer: GpuLayer; firstVertex: number; vertexCount: number }

export function applyRoomVisibility(gl: WebGL2RenderingContext, map: FastMapData, changedRooms: readonly number[], roomLayerByRoom: ReadonlyMap<number, GpuLayer>, getState: (room: number) => number): void {
  const roomsByLayer = new Map<GpuLayer, number[]>();
  const batchGeometry = changedRooms.length > 8;
  for (const room of changedRooms) {
    const layer = roomLayerByRoom.get(room);
    if (!layer) continue;
    const rooms = roomsByLayer.get(layer) ?? [];
    rooms.push(room);
    roomsByLayer.set(layer, rooms);
  }
  for (const [layer, rooms] of roomsByLayer) applyLayerVisibility(gl, layer, map, rooms, getState, batchGeometry);

  const changedSet = new Set(changedRooms);
  const affectedVerticalRooms = new Map<GpuLayer, Set<number>>();
  for (const room of changedRooms) {
    for (const direction of [4, 5]) {
      const slot = room * DIR_COUNT + direction;
      for (let edge = map.exitTargetStarts[slot]!; edge < map.exitTargetStarts[slot + 1]!; edge++) {
        const neighbor = map.exitTargets[edge]!;
        if (changedSet.has(neighbor)) continue;
        const layer = roomLayerByRoom.get(neighbor);
        if (!layer?.verticalExitMesh) continue;
        const rooms = affectedVerticalRooms.get(layer) ?? new Set<number>();
        rooms.add(neighbor);
        affectedVerticalRooms.set(layer, rooms);
      }
    }
  }
  for (const [layer, rooms] of affectedVerticalRooms) {
    const batch = batchGeometry || rooms.size > 8;
    for (const room of rooms) refreshVerticalRoomGeometry(gl, layer, map, room, getState(room), getState, !batch);
    if (batch) uploadVerticalGeometry(gl, layer);
  }
}

function applyLayerVisibility(gl: WebGL2RenderingContext, layer: GpuLayer, map: FastMapData, changedRooms: readonly number[], getState: (room: number) => number, batchGeometry: boolean): void {
  const instanceRanges: Range[] = [];
  const spriteRanges: Array<{ buffer: WebGLBuffer; data: Float32Array; range: Range }> = [];
  for (const room of changedRooms) {
    const state = getState(room);
    const roomRanges = layer.mesh.roomInstanceRanges.get(room) ?? [];
    for (const range of roomRanges) {
      for (let i = range.first; i < range.first + range.count; i++) {
        const packedIndex = i * INTS_PER_INSTANCE + 3;
        layer.mesh.inst[packedIndex] = (layer.mesh.inst[packedIndex]! & 0x0fff) | (state << ROOM_STATE_SHIFT);
      }
      instanceRanges.push(range);
    }
    addSpriteState(layer.flags?.buffer, layer.mesh.flagVertices, layer.mesh.flagRoomRanges.get(room), state, spriteRanges);
    addSpriteState(layer.trails?.buffer, layer.mesh.trailVertices, layer.mesh.trailRoomRanges.get(room), state, spriteRanges);
    refreshDoorRoom(gl, layer, map, room, state, !batchGeometry);
    refreshVerticalRoom(gl, layer, map, room, state, getState, !batchGeometry);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
  for (const range of mergeRanges(instanceRanges)) {
    const start = range.first * INTS_PER_INSTANCE;
    const end = (range.first + range.count) * INTS_PER_INSTANCE;
    gl.bufferSubData(gl.ARRAY_BUFFER, start * Int32Array.BYTES_PER_ELEMENT, layer.mesh.inst.subarray(start, end));
  }
  for (const item of spriteRanges) {
    const start = item.range.first * FLOATS_PER_VERTEX;
    const end = (item.range.first + item.range.count) * FLOATS_PER_VERTEX;
    gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, start * Float32Array.BYTES_PER_ELEMENT, item.data.subarray(start, end));
  }
  if (batchGeometry) {
    uploadDoorGeometry(gl, layer);
    uploadVerticalGeometry(gl, layer);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

export function refreshDoorSlot(gl: WebGL2RenderingContext, layer: GpuLayer, map: FastMapData, slot: number, state: number, doorIndex?: number, upload = true): void {
  const resolvedDoorIndex = doorIndex ?? layer.mesh.doorSlots.indexOf(slot);
  if (resolvedDoorIndex < 0 || !layer.doorMesh) return;
  const room = Math.floor(slot / 7);
  const direction = slot % 7;
  const vertices = shadeColorVertices(buildDoorVertices(map.x[room]!, map.y[room]!, map.z[room]!, direction, map.doorOpen?.[slot] === 1, 'remote'), state);
  const first = resolvedDoorIndex * DOOR_VERTEX_COUNT * FLOATS_PER_VERTEX;
  layer.mesh.doorVertices.set(vertices, first);
  if (upload) {
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.doorMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * Float32Array.BYTES_PER_ELEMENT, vertices);
  }
}

export function refreshVerticalRoomGeometry(gl: WebGL2RenderingContext, layer: GpuLayer, map: FastMapData, room: number, state: number, getState: (room: number) => number = () => ROOM_VISITED, upload = true): void {
  refreshVerticalRoom(gl, layer, map, room, state, getState, upload);
}

export function setRoomFlagRenderState(gl: WebGL2RenderingContext, layer: GpuLayer, room: number, state: number): boolean {
  const mesh = layer.flags;
  const range = layer.mesh.flagRoomRanges.get(room);
  if (!mesh || !range) return false;
  for (let vertex = range.first; vertex < range.first + range.count; vertex++) {
    layer.mesh.flagVertices[vertex * FLOATS_PER_VERTEX + 6] = state;
  }
  const start = range.first * FLOATS_PER_VERTEX;
  const end = (range.first + range.count) * FLOATS_PER_VERTEX;
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, start * Float32Array.BYTES_PER_ELEMENT, layer.mesh.flagVertices.subarray(start, end));
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return true;
}

export function applyDoorStateChanges(
  gl: WebGL2RenderingContext,
  map: FastMapData,
  states: Uint32Array,
  doorLocations: ReadonlyMap<number, DoorLocation>,
  verticalExitLocations: ReadonlyMap<number, VerticalExitLocation>,
  getRoomState: (room: number) => number,
): void {
  if (!map.doorOpen) return;
  for (const packed of states) {
    const slot = packed >>> 1;
    const isOpen = (packed & 1) === 1;
    if (slot >= map.doorOpen.length || map.doorOpen[slot] === Number(isOpen)) continue;
    map.doorOpen[slot] = Number(isOpen);
    const room = Math.floor(slot / DIR_COUNT);
    const direction = slot % DIR_COUNT;
    if (direction > 5) continue;
    const location = doorLocations.get(slot);
    if (location?.layer.doorMesh) refreshDoorSlot(gl, location.layer, map, slot, getRoomState(room), location.vertexIndex);
    if (direction === 4 || direction === 5) {
      const exitLocation = verticalExitLocations.get(room);
      if (exitLocation?.layer.verticalExitMesh) refreshVerticalRoomGeometry(gl, exitLocation.layer, map, room, getRoomState(room), getRoomState);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function addSpriteState(buffer: WebGLBuffer | undefined, data: Float32Array, range: Range | undefined, state: number, out: Array<{ buffer: WebGLBuffer; data: Float32Array; range: Range }>): void {
  if (!buffer || !range) return;
  for (let vertex = range.first; vertex < range.first + range.count; vertex++) data[vertex * FLOATS_PER_VERTEX + 6] = state;
  out.push({ buffer, data, range });
}

function refreshDoorRoom(gl: WebGL2RenderingContext, layer: GpuLayer, map: FastMapData, room: number, state: number, upload: boolean): void {
  const range = layer.mesh.doorRoomRanges.get(room);
  if (!range || !layer.doorMesh) return;
  const firstSlot = range.first / DOOR_VERTEX_COUNT;
  const slots = range.count / DOOR_VERTEX_COUNT;
  for (let i = 0; i < slots; i++) refreshDoorSlot(gl, layer, map, layer.mesh.doorSlots[firstSlot + i]!, state, firstSlot + i, upload);
}

function refreshVerticalRoom(gl: WebGL2RenderingContext, layer: GpuLayer, map: FastMapData, room: number, state: number, getState: (room: number) => number, upload: boolean): void {
  const range = layer.mesh.verticalExitRoomRanges.get(room);
  if (!range || !layer.verticalExitMesh) return;
  const vertices = shadeColorVertices(buildVerticalExitGeometry(map, room, target => getState(target) === ROOM_VISITED), state, true);
  if (vertices.length !== range.count * FLOATS_PER_VERTEX) return;
  const first = range.first * FLOATS_PER_VERTEX;
  layer.mesh.verticalExitVertices.set(vertices, first);
  if (upload) {
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.verticalExitMesh.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, first * Float32Array.BYTES_PER_ELEMENT, vertices);
  }
}

function uploadDoorGeometry(gl: WebGL2RenderingContext, layer: GpuLayer): void {
  if (!layer.doorMesh || layer.mesh.doorVertices.length === 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, layer.doorMesh.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, layer.mesh.doorVertices);
}

function uploadVerticalGeometry(gl: WebGL2RenderingContext, layer: GpuLayer): void {
  if (!layer.verticalExitMesh || layer.mesh.verticalExitVertices.length === 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, layer.verticalExitMesh.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, layer.mesh.verticalExitVertices);
}

function shadeColorVertices(vertices: Float32Array, state: number, hideAdjacent = false): Float32Array {
  const result = new Float32Array(vertices);
  for (let i = 0; i < result.length; i += FLOATS_PER_VERTEX) {
    if (state === 0) result[i + 6] = 0;
    else if (hideAdjacent && state !== ROOM_VISITED) result[i + 6] = 0;
    else if (state === 2) {
      const gray = result[i + 3]! * 0.299 + result[i + 4]! * 0.587 + result[i + 5]! * 0.114;
      result[i + 3] = gray;
      result[i + 4] = gray;
      result[i + 5] = gray;
    }
  }
  return result;
}

function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.first - b.first);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.first <= last.first + last.count) last.count = Math.max(last.first + last.count, range.first + range.count) - last.first;
    else merged.push({ ...range });
  }
  return merged;
}
