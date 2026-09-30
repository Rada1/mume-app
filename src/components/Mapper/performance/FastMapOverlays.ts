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
import { FAST_MAP_PREDICTION_COLOR, FAST_MAP_TILE_TINT } from './fastMapStyle';
import type { FastMapPoint } from './predictionPath';
import { buildGroupMemberGeometry, buildGroupMemberLabels } from './groupMarkerGeometry';
import { drawColorGeometry } from './roomGpuDrawing';
import { buildSearchGeometry } from './searchGeometry';

const SPRITE_UNIFORMS = ['uView', 'uTex', 'uColor'] as const;
const COLOR_UNIFORMS = ['uView', 'uColor'] as const;
const PREDICTION_ALPHA = 0.95;
const ROOM_OVERLAY_COLOR = new Float32Array([
  FAST_MAP_TILE_TINT[0], FAST_MAP_TILE_TINT[1], FAST_MAP_TILE_TINT[2], 0.9,
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

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.spriteProgram = compileProgram(gl, SPRITE_VS, SPRITE_FS, SPRITE_UNIFORMS);
    this.lineProgram = compileProgram(gl, COLOR_VS, COLOR_FS, COLOR_UNIFORMS);
    this.lineMesh = createColorMesh(gl);
    this.arrowMesh = createColorMesh(gl);
    this.predictionMesh = createColorMesh(gl);
    this.groupMesh = createColorMesh(gl);
    this.searchMesh = createColorMesh(gl);
    this.text = new TextOverlayRenderer(gl);
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
    this.refreshLabels();
    if (this.map) this.updateMapGeometry(roomStates);
  }

  private updateMapGeometry(roomStates?: Uint8Array): void {
    const map = this.map;
    if (!map) return;
    const geometry = buildMapOverlayGeometry(map, roomStates);
    const vertices: number[] = [];
    this.lineRanges.clear();
    for (const batch of geometry.lines) {
      const first = vertices.length / 7;
      for (const value of batch.vertices) vertices.push(value);
      this.lineRanges.set(batch.z, { first, count: batch.vertices.length / 7 });
    }
    this.gl.bindVertexArray(this.lineMesh.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineMesh.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, Float32Array.from(vertices), this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(null);

    const arrowVertices: number[] = [];
    this.arrowRanges.clear();
    for (const batch of geometry.arrows) {
      const first = arrowVertices.length / 7;
      for (const value of batch.vertices) arrowVertices.push(value);
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
      const room = label.roomIndex ?? this.roomIndexByPosition.get(`${Math.floor(label.x)}:${Math.floor(label.y)}:${Math.round(label.z)}`);
      if (room === undefined) return label;
      const state = this.roomStates[room] ?? 0;
      if (state === 0) return null;
      if (state !== 2) return label;
      const color = label.color ?? 0xffffff;
      const gray = Math.round((((color >> 16) & 255) * 0.299) + (((color >> 8) & 255) * 0.587) + ((color & 255) * 0.114));
      return { ...label, color: (gray << 16) | (gray << 8) | gray };
    };
    this.text.setLabels([...this.baseLabels, ...this.extraLabels].map(applyState).filter((label): label is FastMapTextLabel => label !== null));
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
    this.predictionRanges.clear();
    if (points.length < 2) return;

    const byFloor = new Map<number, number[]>();
    const appendVertex = (vertices: number[], x: number, y: number, z: number) => {
      vertices.push(x, y, z, FAST_MAP_PREDICTION_COLOR[0], FAST_MAP_PREDICTION_COLOR[1], FAST_MAP_PREDICTION_COLOR[2], PREDICTION_ALPHA);
    };
    for (let index = 1; index < points.length; index++) {
      const from = points[index - 1]!;
      const to = points[index]!;
      if (from.z !== to.z) continue;
      const vertices = byFloor.get(from.z) ?? [];
      byFloor.set(from.z, vertices);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;
      const ox = (-dy / length) * 0.05;
      const oy = (dx / length) * 0.05;
      appendVertex(vertices, from.x + ox, from.y + oy, from.z);
      appendVertex(vertices, to.x + ox, to.y + oy, to.z);
      appendVertex(vertices, from.x - ox, from.y - oy, from.z);
      appendVertex(vertices, from.x - ox, from.y - oy, from.z);
      appendVertex(vertices, to.x + ox, to.y + oy, to.z);
      appendVertex(vertices, to.x - ox, to.y - oy, to.z);
    }

    const endpoint = points[points.length - 1]!;
    const endpointVertices = byFloor.get(endpoint.z) ?? [];
    byFloor.set(endpoint.z, endpointVertices);
    const radius = 0.09;
    for (let segment = 0; segment < 12; segment++) {
      const angleA = (segment / 12) * Math.PI * 2;
      const angleB = ((segment + 1) / 12) * Math.PI * 2;
      appendVertex(endpointVertices, endpoint.x, endpoint.y, endpoint.z);
      appendVertex(endpointVertices, endpoint.x + Math.cos(angleA) * radius, endpoint.y + Math.sin(angleA) * radius, endpoint.z);
      appendVertex(endpointVertices, endpoint.x + Math.cos(angleB) * radius, endpoint.y + Math.sin(angleB) * radius, endpoint.z);
    }

    const allVertices: number[] = [];
    for (const [floor, vertices] of byFloor) {
      this.predictionRanges.set(floor, { first: allVertices.length / 7, count: vertices.length / 7 });
      for (const value of vertices) allVertices.push(value);
    }
    const gl = this.gl;
    gl.bindVertexArray(this.predictionMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.predictionMesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(allVertices), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
  }

  hasPrediction(floor: number): boolean {
    return (this.predictionRanges.get(floor)?.count ?? 0) > 0;
  }

  setLiveRoom(room: FastRoomOverlay | null): void {
    const base = new Set(this.baseLabels.map(label => `${label.x}:${label.y}:${label.z}:${label.text}`));
    const live = buildLiveDoorLabels(room).filter(label => !base.has(`${label.x}:${label.y}:${label.z}:${label.text}`));
    this.text.setLiveLabels(live);
  }

  drawRoomFlags(mesh: GpuSpriteMesh | null, texture: WebGLTexture | null, view: Float32Array): void {
    if (!mesh || !texture) return;
    const gl = this.gl;
    gl.useProgram(this.spriteProgram.program);
    gl.uniform4fv(this.spriteProgram.uniforms.get('uView') ?? null, view);
    gl.uniform4fv(this.spriteProgram.uniforms.get('uColor') ?? null, ROOM_OVERLAY_COLOR);
    gl.uniform1i(this.spriteProgram.uniforms.get('uTex') ?? null, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.bindVertexArray(mesh.vao);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

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
  ): void {
    const vertices = buildGroupMemberGeometry(this.groupMembers, view, player);
    if (vertices.length === 0) return;
    const gl = this.gl;
    gl.bindVertexArray(this.groupMesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groupMesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    drawColorGeometry(gl, this.lineProgram, this.groupMesh, vertices.length / 7);
  }

  drawLabels(floor: number, zoom: number, view: Float32Array, width: number, height: number): void {
    if (zoom >= 0.45) this.text.render(floor, view, width, height);
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
  }
}
