/**
 * @file Lean worker-owned WebGL2 renderer adapted from WebCockpit's MMapper renderer.
 * Copyright (C) 2026 WebCockpit contributors, GPL-3.0-or-later.
 */
// --- Logic Section ---

import type { FastMapFrame, FastMapPrediction, FastMapSearchOverlay } from './protocol';
import type { FastMapGroupMember } from './model';
import type { FastMapData } from './model';
import type { FastMapTextLabel, FastRoomOverlay } from './model';
import type { FastMapBackground } from './mapBackground';
import { NAMED_COLORS, WHITE } from './vendor/palette';
import { FAST_MAP_TILE_TINT } from './fastMapStyle';
import { FastMapOverlays } from './FastMapOverlays';
import { buildRoomMeshes, isRoomMeshVisible, CATEGORY_TEX, type Category } from './vendor/rooms';
import { ARRAY_FILES, L256, TEX } from './vendor/textures';
import { COLOR_FS, COLOR_VS, MAX_NAMED_COLORS, ROOM_FS, ROOM_VS } from './vendor/shaders';
import { createDottedWallTextureArray, createTextureArray } from './textureLoader';
import { createFlowFlagPixels } from './vendor/flowFlagPixels';
import { compileProgram, type WebGLProgramWithUniforms } from './webglProgram';
import { createColorMesh, createInstancedBuffer, createSpriteMesh, createVao, disposeLayers, disposeRoomMesh, type GpuColorMesh, type GpuLayer, type GpuRoomMesh } from './rendererBuffers';
import { updateLiveRoomCover } from './liveRoomCover';
import { createFastMapRoomIndex, resolveFastMapPredictionPoints } from './predictionPath';
import { FastMapExploration, ROOM_VISITED } from './roomExploration';
import { applyDoorStateChanges, applyRoomVisibility, type DoorLocation, type VerticalExitLocation } from './roomExplorationRendering';
import { RoomFlagFlash } from './roomFlagFlash';
import { buildLiveRoomGpuMesh } from './liveRoomGpuMesh';
import { drawColorGeometry, drawDoorGeometry, drawRoomCategory } from './roomGpuDrawing';
import { drawLiveRoomMesh } from './liveRoomDrawing';
import { drawPlayerMarker } from './playerMarkerDrawing';
import { drawPlayerRoomTrail } from './playerTrailDrawing';

const ROOM_UNIFORMS = ['uView', 'uNamed', 'uTex', 'uColor', 'uWhite', 'uBrightness'] as const;
const COLOR_UNIFORMS = ['uView', 'uColor'] as const;
const ROOM_CATEGORIES: readonly Category[] = ['terrain', 'upDown', 'walls', 'dottedWalls'];
const USED_TERRAIN_LAYERS = new Set(Array.from({ length: 96 }, (_, index) => index));
const USED_TRAIL_LAYERS = new Set(Array.from({ length: 16 }, (_, index) => index));
const USED_DOOR_LAYERS = new Set([L256.charRoomSel]);
const PROCEDURAL_FLOW_LAYERS = new Set(Array.from({ length: 12 }, (_, index) => 84 + index));

export class FastMapRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly roomProgram: WebGLProgramWithUniforms;
  private readonly colorProgram: WebGLProgramWithUniforms;
  private readonly cover: GpuColorMesh;
  private readonly overlays: FastMapOverlays;
  private readonly playerVao: WebGLVertexArrayObject;
  private readonly playerBuffer: WebGLBuffer;
  private readonly textureArrays: Array<WebGLTexture | null> = [null, null, null, null];
  private layers: GpuLayer[] = [];
  private map: FastMapData | null = null;
  private roomIndexById = new Map<string, number>();
  private doorLocations = new Map<number, DoorLocation>();
  private verticalExitLocations = new Map<number, VerticalExitLocation>();
  private roomLayerByRoom = new Map<number, GpuLayer>();
  private readonly exploration = new FastMapExploration();
  private readonly roomFlagFlash = new RoomFlagFlash();
  private predictionKey: string | null = null;
  private liveRoom: FastRoomOverlay | null = null;
  private liveRoomMesh: GpuRoomMesh | null = null;
  private liveRoomKey = '';
  private width = 1;
  private height = 1;
  private dpr = 1;
  buildMs = 0;

  get mapRoomCount(): number {
    return this.map?.roomCount ?? 0;
  }

  get needsAnimation(): boolean { return this.roomFlagFlash.isActive; }

  constructor(private readonly canvas: OffscreenCanvas, private readonly transparentBackground = false) {
    const gl = canvas.getContext('webgl2', { alpha: transparentBackground, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('This browser could not create an OffscreenCanvas WebGL2 context.');
    this.gl = gl;
    this.roomProgram = compileProgram(gl, ROOM_VS, ROOM_FS, ROOM_UNIFORMS);
    this.colorProgram = compileProgram(gl, COLOR_VS, COLOR_FS, COLOR_UNIFORMS);
    this.cover = createColorMesh(gl);
    this.overlays = new FastMapOverlays(gl);
    this.playerVao = createVao(gl);
    this.playerBuffer = createInstancedBuffer(gl, this.playerVao);
    this.configureRoomProgram();
    this.resize(canvas.width, canvas.height, 1);
  }

  async initialize(): Promise<void> {
    const gl = this.gl;
    this.textureArrays[TEX.A64] = await createTextureArray(gl, ARRAY_FILES.A64.files, ARRAY_FILES.A64.size, USED_TRAIL_LAYERS);
    this.textureArrays[TEX.A128] = await createTextureArray(gl, ARRAY_FILES.A128.files, ARRAY_FILES.A128.size, USED_TERRAIN_LAYERS, PROCEDURAL_FLOW_LAYERS, createFlowFlagPixels);
    this.textureArrays[TEX.A256] = await createTextureArray(gl, ARRAY_FILES.A256.files, ARRAY_FILES.A256.size, USED_DOOR_LAYERS);
    this.textureArrays[TEX.DOTTED] = createDottedWallTextureArray(gl);
  }

  setMap(map: FastMapData): void {
    const start = performance.now();
    this.freeLayers();
    this.map = map;
    const changedRooms = this.exploration.setMap(map);
    this.doorLocations.clear();
    this.verticalExitLocations.clear();
    this.roomIndexById = createFastMapRoomIndex(map);
    this.predictionKey = null;
    this.overlays.setMap(map, this.exploration.getRoomStates());
    this.overlays.setLiveRoom(null);
    for (const mesh of buildRoomMeshes(map)) {
      const vao = createVao(this.gl);
      const buffer = createInstancedBuffer(this.gl, vao);
      const gl = this.gl;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.inst, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const layer: GpuLayer = {
        z: mesh.z, mesh, vao, buffer,
        flags: createSpriteMesh(gl, mesh.flagVertices),
        trails: createSpriteMesh(gl, mesh.trailVertices),
        doorMesh: mesh.doorVertices.length ? createColorMesh(gl, mesh.doorVertices) : null,
        doorCount: mesh.doorSlots.length,
        verticalExitMesh: mesh.verticalExitVertices.length ? createColorMesh(gl, mesh.verticalExitVertices) : null,
        verticalExitVertexCount: mesh.verticalExitVertices.length / 7,
      };
      this.layers.push(layer);
      mesh.roomInstanceRanges.forEach((_ranges, room) => this.roomLayerByRoom.set(room, layer));
      mesh.doorSlots.forEach((slot, vertexIndex) => this.doorLocations.set(slot, { layer, vertexIndex }));
      mesh.verticalExitRoomRanges.forEach((range, room) => this.verticalExitLocations.set(room, {
        layer, firstVertex: range.first, vertexCount: range.count,
      }));
    }
    applyRoomVisibility(this.gl, map, changedRooms, this.roomLayerByRoom, room => this.exploration.getRoomState(room));
    this.buildMs = performance.now() - start;
  }

  setExploredRooms(roomIds: readonly string[], revealAll: boolean): void {
    const changed = this.exploration.setVisitedRooms(roomIds, revealAll);
    if (this.map && changed.length) {
      applyRoomVisibility(this.gl, this.map, changed, this.roomLayerByRoom, room => this.exploration.getRoomState(room));
      this.overlays.setExploration(this.exploration.getRoomStates());
    }
  }

  visitRoom(roomId: string): void {
    const changed = this.exploration.visitRoom(roomId);
    const discoveredRoom = changed.find(room => this.exploration.getRoomState(room) === ROOM_VISITED);
    if (this.map) applyRoomVisibility(this.gl, this.map, changed, this.roomLayerByRoom, room => this.exploration.getRoomState(room));
    if (changed.length) this.overlays.setExploration(this.exploration.getRoomStates());
    if (discoveredRoom !== undefined) {
      const layer = this.roomLayerByRoom.get(discoveredRoom);
      if (layer) this.roomFlagFlash.start(this.gl, layer, discoveredRoom);
    }
  }

  setDoorStates(states: Uint32Array): void {
    if (this.map) applyDoorStateChanges(this.gl, this.map, states, this.doorLocations, this.verticalExitLocations, room => this.exploration.getRoomState(room));
  }

  setLabels(labels: FastMapTextLabel[]): void { this.overlays.setLabels(labels); }

  setGroupMembers(members: FastMapGroupMember[]): void { this.overlays.setGroupMembers(members); }

  setSearchOverlay(overlay: FastMapSearchOverlay): void { this.overlays.setSearchOverlay(overlay); }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.dpr = dpr > 0 ? dpr : 1;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.gl.viewport(0, 0, this.width, this.height);
  }

  render(frame: FastMapFrame): void {
    if (this.gl.isContextLost()) throw new Error('The worker WebGL2 context was lost.');
    this.roomFlagFlash.update(this.gl, this.roomLayerByRoom, room => this.exploration.getRoomState(room));
    const background = frame.background;
    this.updateLiveRoom(frame.liveRoom, background);
    this.updatePrediction(frame.prediction);
    const gl = this.gl;
    const cssWidth = this.width / this.dpr;
    const cssHeight = this.height / this.dpr;
    const projection = this.projection(frame, cssWidth, cssHeight);

    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    if (this.transparentBackground) gl.clearColor(0, 0, 0, 0);
    else gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (this.transparentBackground) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.setView(this.roomProgram, projection);
    this.setView(this.colorProgram, projection);

    for (const layer of this.layers) {
      if (isRoomMeshVisible(layer.mesh.bounds, layer.z, frame.view, cssWidth, cssHeight)) {
        this.drawRoomCategories(layer, frame.brightness);
        this.overlays.drawRoomFlags(layer.trails, this.textureArrays[TEX.A64], projection);
        drawDoorGeometry(gl, this.colorProgram, layer.doorMesh, layer.doorCount);
        this.overlays.drawRoomFlags(layer.flags, this.textureArrays[TEX.A128], projection);
        drawColorGeometry(gl, this.colorProgram, layer.verticalExitMesh, layer.verticalExitVertexCount, FAST_MAP_TILE_TINT);
      }
    }
    if (this.liveRoomMesh && this.liveRoom?.z === frame.view.layer) {
      drawLiveRoomMesh(gl, this.roomProgram, this.colorProgram, this.textureArrays, this.cover, this.liveRoomMesh, this.overlays, projection, frame.brightness);
    }
    this.overlays.drawLines(frame.view.layer, projection);
    this.overlays.drawExitArrows(frame.view.layer, projection);
    this.overlays.drawPrediction(frame.view.layer, projection);
    this.overlays.drawSearch(frame.view.layer, projection);
    this.overlays.drawGroupMembers(frame.view, frame.player);
    if (frame.player && Math.round(frame.player.z) === frame.view.layer) {
      drawPlayerMarker(gl, this.roomProgram, this.playerVao, this.playerBuffer, this.textureArrays, frame.player);
      drawPlayerRoomTrail(this.overlays, this.roomLayerByRoom, frame.player, this.liveRoom, this.liveRoomMesh, this.textureArrays[TEX.A64], projection);
    }
    this.overlays.drawLabels(frame.view.layer, frame.view.zoom, projection, this.width, this.height, this.dpr);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.freeLayers();
    if (this.liveRoomMesh) disposeRoomMesh(this.gl, this.liveRoomMesh);
    const gl = this.gl;
    for (const texture of this.textureArrays) if (texture) gl.deleteTexture(texture);
    gl.deleteBuffer(this.cover.buffer);
    gl.deleteBuffer(this.playerBuffer);
    gl.deleteVertexArray(this.cover.vao);
    gl.deleteVertexArray(this.playerVao);
    gl.deleteProgram(this.roomProgram.program);
    gl.deleteProgram(this.colorProgram.program);
    this.overlays.dispose();
  }

  private projection(frame: FastMapFrame, cssWidth: number, cssHeight: number): Float32Array {
    const { view } = frame;
    const kx = (5280 * view.zoom) / Math.max(1, cssWidth);
    const ky = (5280 * view.zoom) / Math.max(1, cssHeight);
    return new Float32Array([view.x, view.y, kx, ky]);
  }

  private updatePrediction(prediction: FastMapPrediction | null): void {
    const key = prediction
      ? `${prediction.roomId}\u0000${prediction.firstTargetId ?? ''}\u0000${prediction.directions.join('\u0000')}`
      : '';
    if (key === this.predictionKey) return;
    this.predictionKey = key;
    this.overlays.setPredictionPoints(this.map
      ? resolveFastMapPredictionPoints(this.map, this.roomIndexById, prediction)
      : []);
  }

  private setView(program: WebGLProgramWithUniforms, view: Float32Array): void {
    const gl = this.gl;
    gl.useProgram(program.program);
    gl.uniform4fv(program.uniforms.get('uView') ?? null, view);
  }

  private drawRoomCategories(layer: GpuLayer, brightness: number): void {
    for (const category of ROOM_CATEGORIES) this.drawCategory(layer, category, brightness);
  }

  private drawCategory(layer: GpuLayer, category: Category, brightness: number): void {
    drawRoomCategory(this.gl, this.roomProgram, this.textureArrays, layer, category, CATEGORY_TEX[category], category === 'terrain' || category === 'walls' || category === 'dottedWalls' ? FAST_MAP_TILE_TINT : WHITE, brightness);
  }

  private updateLiveRoom(room: FastRoomOverlay | null, background: FastMapBackground): void {
    const signature = room ? `${room.x},${room.y},${room.z},${room.terrain},${room.light ?? 0},${room.sundeath ?? 0},${room.align ?? 0},${room.portable ?? 0},${room.mobFlags ?? 0},${room.loadFlags ?? 0},${room.ridable ?? 0},${Array.from(room.exitFlags).join(',')},${Array.from(room.doorFlags ?? []).join(',')},${Array.from(room.doorOpen ?? []).join(',')},${Array.from(room.doorNames ?? []).flat().join('|')},${background.join(',')}` : '';
    if (signature === this.liveRoomKey) return;
    this.liveRoomKey = signature;
    this.liveRoom = room;
    this.overlays.setLiveRoom(room);
    if (this.liveRoomMesh) disposeRoomMesh(this.gl, this.liveRoomMesh);
    this.liveRoomMesh = null;
    if (!room) return;

    this.liveRoomMesh = buildLiveRoomGpuMesh(this.gl, room);
    if (!this.liveRoomMesh) return;
    updateLiveRoomCover(this.gl, this.cover, room, background);
  }

  private configureRoomProgram(): void {
    const gl = this.gl;
    const colors = new Float32Array(MAX_NAMED_COLORS * 4);
    NAMED_COLORS.forEach((color, index) => colors.set(color, index * 4));
    gl.useProgram(this.roomProgram.program);
    gl.uniform4fv(this.roomProgram.uniforms.get('uNamed') ?? null, colors);
    gl.uniform1i(this.roomProgram.uniforms.get('uTex') ?? null, 0);
  }

  private freeLayers(): void {
    disposeLayers(this.gl, this.layers);
    this.layers = [];
    this.roomLayerByRoom.clear();
    this.roomFlagFlash.clear();
    this.doorLocations.clear();
  }
}
