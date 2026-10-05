/**
 * @file Batched labels, connection marks, and room flags for the fast map.
 * Separating overlays keeps terrain mesh rendering small and predictable.
 */
// --- Logic Section ---

import type { FastMapData, FastMapGroupMember, FastMapTextLabel } from './model';
import type { FastMapSearchOverlay } from './protocol';
import type { FastRoomOverlay } from './model';
import type { GpuColorMesh, GpuSpriteMesh } from './rendererBuffers';
import { createColorMesh } from './rendererBuffers';
import { TextOverlayRenderer } from './textOverlay';
import { buildLiveDoorLabels, buildMapOverlayGeometry, buildMapTextLabels } from './mapOverlays';
import { compileProgram, type WebGLProgramWithUniforms } from './webglProgram';
import { COLOR_FS, COLOR_VS, SPRITE_FS, SPRITE_VS } from './vendor/shaders';
import { WHITE } from './vendor/palette';
import { FAST_MAP_TILE_TINT } from './fastMapStyle';
import type { FastMapPoint } from './predictionPath';
import { buildGroupMemberGeometry, buildGroupMemberLabels } from './groupMarkerGeometry';
import { drawColorGeometry } from './roomGpuDrawing';
import { buildSearchGeometry } from './searchGeometry';
import { drawRoomSpriteFlags } from './roomSpriteDrawing';
import { ROOM_VISITED } from './roomExploration';
import { declutterDoorLabels } from './doorLabelLayout';
import { buildPredictionOverlayGeometry } from './predictionOverlayGeometry';
import { DeathMarkerOverlay } from './deathMarkerOverlay';

const SPRITE_UNIFORMS = ['uView', 'uTex', 'uColor'] as const;
const COLOR_UNIFORMS = ['uView', 'uColor'] as const;
const ROOM_OVERLAY_COLOR = new Float32Array([
  FAST_MAP_TILE_TINT[0], FAST_MAP_TILE_TINT[1], FAST_MAP_TILE_TINT[2], 1,
]);

export class FastMapOverlays {
  private readonly spriteProgram: WebGLProgramWithUniforms;
  private readonly lineProgram: WebGLProgramWithUniforms;
  private readonly lineMesh: GpuColorMesh;
  private readonly arrowMesh: GpuColorMesh;
  private readonly predictionMesh: GpuColorMesh;
  private readonly groupMesh: GpuColorMesh;
  private readonly searchMesh: GpuColorMesh;
  private readonly text: TextOverlayRenderer;
  private readonly deathMarker: DeathMarkerOverlay;
  private lineRanges = new Map<number, { first: number; count: number }>();
  private arrowRanges = new Map<number, { first: number; count: number }>();
  private predictionRanges = new Map<number, { first: number; count: number }>();
  private searchRanges = new Map<number, { first: number; count: number }>();
  private predictionSignature = '';
  private baseLabels: ReturnType<typeof buildMapTextLabels> = [];
  private groupMembers: FastMapGroupMember[] = [];
  private groupSignature = '';
  private map: FastMapData | null = null;
  private extraLabels: FastMapTextLabel[] = [];
  private roomStates: Uint8Array = new Uint8Array();
  private roomIndexByPosition = new Map<string, number>();
  private revealAll = false;
  private doorLabelZoom = 0.4;
  private liveDoorLabels: FastMapTextLabel[] = [];

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.spriteProgram = compileProgram(gl, SPRITE_VS, SPRITE_FS, SPRITE_UNIFORMS);
    this.lineProgram = compileProgram(gl, COLOR_VS, COLOR_FS, COLOR_UNIFORMS);
    this.lineMesh = createColorMesh(gl);
    this.arrowMesh = createColorMesh(gl);
    this.predictionMesh = createColorMesh(gl);
    this.groupMesh = createColorMesh(gl);
    this.searchMesh = createColorMesh(gl);
    this.text = new TextOverlayRenderer(gl);
    this.deathMarker = new DeathMarkerOverlay(gl);
  }
  setMap(map: FastMapData, roomStates?: Uint8Array): void {
    this.map = map;
    this.roomStates = roomStates ?? new Uint8Array(map.roomCount);
    this.roomIndexByPosition.clear();
    for (let room = 0; room < map.roomCount; room++) {
      this.roomIndexByPosition.set(`${map.x[room]}:${map.y[room]}:${map.z[room]}`, room);
    }
    this.baseLabels = buildMapTextLabels(map);
    this.refreshLabels();
    this.updateMapGeometry(roomStates);
  }

  setExploration(roomStates: Uint8Array): void {
    this.roomStates = roomStates;
    this.revealAll = roomStates.length > 0 && roomStates.every(state => state === ROOM_VISITED);
    this.refreshLabels();
    if (this.map) this.updateMapGeometry(roomStates);
  }

  private updateMapGeometry(roomStates?: Uint8Array): void {
    const map = this.map;
    if (!map) return;
    const geometry = buildMapOverlayGeometry(map, roomStates);
    const vertexCount = geometry.lines.reduce((total, batch) => total + batch.vertices.length, 0);
    const vertices = new Float32Array(vertexCount);
    let vertexOffset = 0;
    this.lineRanges.clear();
    for (const batch of geometry.lines) {
      const first = vertexOffset / 7;
      vertices.set(batch.vertices, vertexOffset);
      vertexOffset += batch.vertices.length;
      this.lineRanges.set(batch.z, { first, count: batch.vertices.length / 7 });
    }
    this.gl.bindVertexArray(this.lineMesh.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineMesh.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, Float32Array.from(vertices), this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(null);

    const arrowVertexCount = geometry.arrows.reduce((total, batch) => total + batch.vertices.length, 0);
    const arrowVertices = new Float32Array(arrowVertexCount);
    let arrowVertexOffset = 0;
    this.arrowRanges.clear();
    for (const batch of geometry.arrows) {
      const first = arrowVertexOffset / 7;
      arrowVertices.set(batch.vertices, arrowVertexOffset);
      arrowVertexOffset += batch.vertices.length;
      this.arrowRanges.set(batch.z, { first, count: batch.vertices.length / 7 });
    }
    this.gl.bindVertexArray(this.arrowMesh.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.arrowMesh.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, Float32Array.from(arrowVertices), this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(null);
  }

  setLabels(labels: FastMapData['labels']): void {
    this.extraLabels = [...(labels ?? [])];
    this.refreshLabels();
  }

  private refreshLabels(): void {
    const applyState = (label: FastMapTextLabel): FastMapTextLabel | null => {
      const room = label.roomIndex ?? this.nearbyVisitedRoom(label);
      if (room === undefined) return this.revealAll ? label : null;
      return (this.roomStates[room] ?? 0) === ROOM_VISITED ? label : null;
    };
    const visible = [...this.baseLabels, ...this.extraLabels].map(applyState).filter((label): label is FastMapTextLabel => label !== null);
    this.text.setLabels(declutterDoorLabels(visible, this.doorLabelZoom));
  }

  private nearbyVisitedRoom(label: FastMapTextLabel): number | undefined {
    const map = this.map;
    if (!map) return undefined;
    const centerX = label.x;
    const centerY = label.y;
    const floor = Math.round(label.z);
    const cellX = Math.floor(centerX);
    const cellY = Math.floor(centerY);
    let nearest: number | undefined;
    let nearestDistance = 1.5;
    for (let x = cellX - 2; x <= cellX + 2; x++) for (let y = cellY - 2; y <= cellY + 2; y++) {
      const room = this.roomIndexByPosition.get(`${x}:${y}:${floor}`);
      if (room === undefined || this.roomStates[room] !== ROOM_VISITED) continue;
      const distance = Math.hypot(centerX - (map.x[room]! + 0.5), centerY - (map.y[room]! + 0.5));
      if (distance <= nearestDistance) { nearest = room; nearestDistance = distance; }
    }
    return nearest;
  }

  setGroupMembers(members: FastMapGroupMember[]): void {
    const signature = members.map(member => `${member.id}:${member.name}:${member.x},${member.y},${member.z}:${member.color}`).join('|');
    if (signature === this.groupSignature) return;
    this.groupSignature = signature;
    this.groupMembers = [...members];
    this.text.setGroupLabels(buildGroupMemberLabels(members));
  }

  setSearchOverlay(overlay: FastMapSearchOverlay): void {
    const vertices: number[] = [];
    this.searchRanges.clear();
    for (const batch of buildSearchGeometry(overlay)) {
      this.searchRanges.set(batch.floor, { first: vertices.length / 7, count: batch.vertices.length / 7 });
      for (const value of batch.vertices) vertices.push(value);
    }
    const gl = this.gl;
    gl.bindVertexArray(this.searchMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.searchMesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertices), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
  }

  setPredictionPoints(points: readonly FastMapPoint[]): void {
    const signature = points.map(point => `${point.x},${point.y},${point.z}`).join(';');
    if (signature === this.predictionSignature) return;
    this.predictionSignature = signature;
    const { vertices, ranges } = buildPredictionOverlayGeometry(points);
    this.predictionRanges = ranges;
    const gl = this.gl;
    gl.bindVertexArray(this.predictionMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.predictionMesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
  }

  hasPrediction(floor: number): boolean {
    return (this.predictionRanges.get(floor)?.count ?? 0) > 0;
  }

  setLiveRoom(room: FastRoomOverlay | null): void {
    // The canonical map has already merged and placed both sides of its doors.
    // Drawing the live copy again creates a second label at another anchor.
    const onBaseMap = room && this.roomIndexByPosition.has(`${room.x}:${room.y}:${room.z}`);
    const live = onBaseMap ? [] : buildLiveDoorLabels(room);
    this.liveDoorLabels = live;
    this.text.setLiveLabels(declutterDoorLabels(live, this.doorLabelZoom));
  }

  drawRoomFlags(mesh: GpuSpriteMesh | null, texture: WebGLTexture | null, view: Float32Array, range?: { first: number; count: number }): void {
    drawRoomSpriteFlags(this.gl, this.spriteProgram, mesh, texture, view, ROOM_OVERLAY_COLOR, range);
  }

  roomIndexAt(x: number, y: number, z: number): number | undefined { return this.roomIndexByPosition.get(`${x}:${y}:${z}`); }

  drawLines(floor: number, view: Float32Array): void {
    const range = this.lineRanges.get(floor);
    if (!range?.count) return;
    const gl = this.gl;
    gl.useProgram(this.lineProgram.program);
    gl.uniform4fv(this.lineProgram.uniforms.get('uView') ?? null, view);
    gl.uniform4fv(this.lineProgram.uniforms.get('uColor') ?? null, WHITE);
    gl.bindVertexArray(this.lineMesh.vao);
    gl.drawArrays(gl.LINES, range.first, range.count);
  }

  drawExitArrows(floor: number, view: Float32Array): void {
    const range = this.arrowRanges.get(floor);
    if (!range?.count) return;
    const gl = this.gl;
    gl.useProgram(this.lineProgram.program);
    gl.uniform4fv(this.lineProgram.uniforms.get('uView') ?? null, view);
    gl.uniform4fv(this.lineProgram.uniforms.get('uColor') ?? null, WHITE);
    gl.bindVertexArray(this.arrowMesh.vao);
    gl.drawArrays(gl.TRIANGLES, range.first, range.count);
  }

  drawPrediction(floor: number, view: Float32Array): void {
    const range = this.predictionRanges.get(floor);
    if (!range?.count) return;
    const gl = this.gl;
    gl.useProgram(this.lineProgram.program);
    gl.uniform4fv(this.lineProgram.uniforms.get('uView') ?? null, view);
    gl.uniform4fv(this.lineProgram.uniforms.get('uColor') ?? null, WHITE);
    gl.bindVertexArray(this.predictionMesh.vao);
    gl.drawArrays(gl.TRIANGLES, range.first, range.count);
  }

  drawSearch(floor: number, view: Float32Array): void {
    const range = this.searchRanges.get(floor);
    if (!range?.count) return;
    const gl = this.gl;
    gl.useProgram(this.lineProgram.program);
    gl.uniform4fv(this.lineProgram.uniforms.get('uView') ?? null, view);
    gl.uniform4fv(this.lineProgram.uniforms.get('uColor') ?? null, WHITE);
    gl.bindVertexArray(this.searchMesh.vao);
    gl.drawArrays(gl.TRIANGLES, range.first, range.count);
  }
  drawGroupMembers(
    view: import('./protocol').FastMapView,
    player: { x: number; y: number; z: number } | null,
    width: number,
    height: number,
  ): void {
    const vertices = buildGroupMemberGeometry(this.groupMembers, view, player, width, height);
    if (vertices.length === 0) return;
    const gl = this.gl;
    gl.bindVertexArray(this.groupMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groupMesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    drawColorGeometry(gl, this.lineProgram, this.groupMesh, vertices.length / 7);
  }
  drawDeathMarker(room: { x: number; y: number; z: number } | null | undefined, view: import('./protocol').FastMapView, width: number, height: number, now: number): void { this.deathMarker.draw(room, view, width, height, now); }
  drawLabels(floor: number, zoom: number, view: Float32Array, width: number, height: number, pixelRatio = 1): void {
    if (zoom < 0.4) return;
    const bucket = Math.floor(zoom * 10) / 10 * pixelRatio;
    if (bucket !== this.doorLabelZoom) {
      this.doorLabelZoom = bucket;
      this.refreshLabels();
      this.text.setLiveLabels(declutterDoorLabels(this.liveDoorLabels, bucket));
    }
    this.text.render(floor, view, width, height);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.lineMesh.buffer);
    gl.deleteBuffer(this.arrowMesh.buffer);
    gl.deleteVertexArray(this.lineMesh.vao);
    gl.deleteVertexArray(this.arrowMesh.vao);
    gl.deleteBuffer(this.predictionMesh.buffer);
    gl.deleteBuffer(this.groupMesh.buffer);
    gl.deleteBuffer(this.searchMesh.buffer);
    gl.deleteVertexArray(this.predictionMesh.vao);
    gl.deleteVertexArray(this.groupMesh.vao);
    gl.deleteVertexArray(this.searchMesh.vao);
    gl.deleteProgram(this.spriteProgram.program);
    gl.deleteProgram(this.lineProgram.program);
    this.text.dispose();
    this.deathMarker.dispose();
  }
}
