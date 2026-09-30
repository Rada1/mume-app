/**
 * @file Pixel-sized WebGL text overlays for MMapper infomarks, labels, and doors.
 * Text glyphs are atlased once; label geometry is uploaded once per map load.
 */
// --- Logic Section ---

import type { FastMapTextLabel } from './model';
import { GROUP_MEMBER_LABEL_FONT_SIZE } from './groupMarkerGeometry';
import { FONT_FS, FONT_VS } from './vendor/shaders';
import { compileProgram, type WebGLProgramWithUniforms } from './webglProgram';
import { createVao } from './rendererBuffers';

interface GlyphCell { u0: number; u1: number; vTop: number; vBottom: number }
interface VertexRange { first: number; count: number }

const ATLAS_WIDTH = 640;
const ATLAS_HEIGHT = 300;
const CELL_WIDTH = 40;
const CELL_HEIGHT = 50;
const STRIDE = 44;
const UNIFORMS = ['uView', 'uPhys', 'uScreen', 'uGroupLabel', 'uGroupLabelOffsetY', 'uTex'] as const;
const GROUP_MARKER_HALF_SIZE = 0.415;
const GROUP_LABEL_GAP = 2;

export class TextOverlayRenderer {
  private readonly program: WebGLProgramWithUniforms;
  private readonly atlas: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly liveVao: WebGLVertexArrayObject;
  private readonly liveBuffer: WebGLBuffer;
  private readonly groupVao: WebGLVertexArrayObject;
  private readonly groupBuffer: WebGLBuffer;
  private ranges = new Map<number, VertexRange>();
  private groupRanges = new Map<number, VertexRange>();
  private liveFloor = -1;
  private liveCount = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = compileProgram(gl, FONT_VS, FONT_FS, UNIFORMS);
    this.atlas = this.createAtlas();
    this.vao = createVao(gl);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL could not allocate a map text buffer.');
    this.buffer = buffer;
    this.configureVao(this.vao, buffer);
    this.liveVao = createVao(gl);
    const liveBuffer = gl.createBuffer();
    if (!liveBuffer) throw new Error('WebGL could not allocate a live map text buffer.');
    this.liveBuffer = liveBuffer;
    this.configureVao(this.liveVao, liveBuffer);
    this.groupVao = createVao(gl);
    const groupBuffer = gl.createBuffer();
    if (!groupBuffer) throw new Error('WebGL could not allocate group-member labels.');
    this.groupBuffer = groupBuffer;
    this.configureVao(this.groupVao, groupBuffer);
  }

  setLabels(labels: readonly FastMapTextLabel[]): void {
    const glyphs = this.glyphCells();
    const byFloor = new Map<number, number[]>();
    for (const label of labels) {
      const floor = Math.round(label.z);
      const vertices = byFloor.get(floor) ?? [];
      byFloor.set(floor, vertices);
      appendLabel(vertices, label, glyphs);
    }
    const data: number[] = [];
    this.ranges.clear();
    for (const [floor, vertices] of [...byFloor.entries()].sort((a, b) => a[0] - b[0])) {
      const first = data.length / 11;
      for (const value of vertices) data.push(value);
      this.ranges.set(floor, { first, count: vertices.length / 11 });
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  render(floor: number, view: Float32Array, width: number, height: number): void {
    const gl = this.gl;
    gl.useProgram(this.program.program);
    gl.uniform4fv(this.program.uniforms.get('uView') ?? null, view);
    gl.uniform2f(this.program.uniforms.get('uPhys') ?? null, width, height);
    gl.uniform1i(this.program.uniforms.get('uScreen') ?? null, 0);
    gl.uniform1i(this.program.uniforms.get('uGroupLabel') ?? null, 0);
    gl.uniform1f(this.program.uniforms.get('uGroupLabelOffsetY') ?? null, 0);
    gl.uniform1i(this.program.uniforms.get('uTex') ?? null, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    const range = this.ranges.get(floor);
    if (range?.count) {
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, range.first, range.count);
    }
    if (this.liveFloor === floor && this.liveCount > 0) {
      gl.bindVertexArray(this.liveVao);
      gl.drawArrays(gl.TRIANGLES, 0, this.liveCount);
    }
    const groupRange = this.groupRanges.get(floor);
    if (groupRange?.count) {
      const perspective = Math.max(1, 60 - 7 * floor);
      const pixelsPerRoom = (view[3]! * height) / (2 * perspective);
      const labelOffsetY = GROUP_MARKER_HALF_SIZE * pixelsPerRoom + GROUP_MEMBER_LABEL_FONT_SIZE / 2 + GROUP_LABEL_GAP;
      gl.uniform1i(this.program.uniforms.get('uGroupLabel') ?? null, 1);
      gl.uniform1f(this.program.uniforms.get('uGroupLabelOffsetY') ?? null, labelOffsetY);
      gl.bindVertexArray(this.groupVao);
      gl.drawArrays(gl.TRIANGLES, groupRange.first, groupRange.count);
    }
  }

  setGroupLabels(labels: readonly FastMapTextLabel[]): void {
    const glyphs = this.glyphCells();
    const byFloor = new Map<number, number[]>();
    for (const label of labels) {
      const floor = Math.round(label.z);
      const vertices = byFloor.get(floor) ?? [];
      byFloor.set(floor, vertices);
      appendLabel(vertices, label, glyphs);
    }
    const data: number[] = [];
    this.groupRanges.clear();
    for (const [floor, vertices] of [...byFloor.entries()].sort((a, b) => a[0] - b[0])) {
      const first = data.length / 11;
      for (const value of vertices) data.push(value);
      this.groupRanges.set(floor, { first, count: vertices.length / 11 });
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.groupBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(data), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  setLiveLabels(labels: readonly FastMapTextLabel[]): void {
    const glyphs = this.glyphCells();
    const vertices: number[] = [];
    for (const label of labels) appendLabel(vertices, label, glyphs);
    this.liveFloor = labels.length ? Math.round(labels[0]!.z) : -1;
    this.liveCount = vertices.length / 11;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.liveBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(vertices), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteBuffer(this.liveBuffer);
    gl.deleteBuffer(this.groupBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.liveVao);
    gl.deleteVertexArray(this.groupVao);
    gl.deleteTexture(this.atlas);
    gl.deleteProgram(this.program.program);
  }

  private createAtlas(): WebGLTexture {
    const canvas = new OffscreenCanvas(ATLAS_WIDTH, ATLAS_HEIGHT);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create the map label glyph atlas.');
    ctx.clearRect(0, 0, ATLAS_WIDTH, ATLAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let code = 32; code <= 126; code++) {
      const index = code - 32;
      const x = (index % 16) * CELL_WIDTH + CELL_WIDTH / 2;
      const y = Math.floor(index / 16) * CELL_HEIGHT + CELL_HEIGHT / 2;
      ctx.fillText(String.fromCharCode(code), x, y);
    }
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('WebGL could not allocate the map label atlas.');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private glyphCells(): ReadonlyMap<string, GlyphCell> {
    const glyphs = new Map<string, GlyphCell>();
    for (let code = 32; code <= 126; code++) {
      const index = code - 32;
      const x = (index % 16) * CELL_WIDTH;
      const y = Math.floor(index / 16) * CELL_HEIGHT;
      glyphs.set(String.fromCharCode(code), {
        u0: x / ATLAS_WIDTH,
        u1: (x + CELL_WIDTH) / ATLAS_WIDTH,
        vTop: 1 - y / ATLAS_HEIGHT,
        vBottom: 1 - (y + CELL_HEIGHT) / ATLAS_HEIGHT,
      });
    }
    return glyphs;
  }

  private configureVao(vao: WebGLVertexArrayObject, buffer: WebGLBuffer): void {
    const gl = this.gl;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const attributes = [
      [0, 3, 0], [1, 4, 12], [2, 2, 28], [3, 2, 36],
    ] as const;
    for (const [location, size, offset] of attributes) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, STRIDE, offset);
    }
    gl.bindVertexArray(null);
  }
}

function appendLabel(out: number[], label: FastMapTextLabel, glyphs: ReadonlyMap<string, GlyphCell>): void {
  const text = label.text.replace(/[^\x20-\x7e]/g, '?').slice(0, 120);
  if (!text) return;
  const size = Math.max(8, Math.min(32, label.fontSize ?? 11));
  const quadWidth = size * (CELL_WIDTH / CELL_HEIGHT);
  const advance = quadWidth * 0.45;
  const textWidth = text.length * advance;
  const color = label.color ?? 0xffffff;
  const rgba = [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255, 1];
  const offsetX = label.offsetX ?? 0;
  const offsetY = label.offsetY ?? 0;
  const italicShear = label.italic ? 1 / 6 : 0;
  const mmapperAnchor = label.anchor === 'mmapper';
  const baselineOffsetY = mmapperAnchor ? size * 0.25 : 0;
  const left = mmapperAnchor ? 0 : -textWidth / 2;
  const rotation = ((label.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotateOffset = (x: number, y: number): [number, number] => [x * cos - y * sin, x * sin + y * cos];
  const pushPixelRect = (x1: number, y1: number, x2: number, y2: number, rectColor: number, alpha: number) => {
    const rectRgba = [((rectColor >> 16) & 255) / 255, ((rectColor >> 8) & 255) / 255, (rectColor & 255) / 255, alpha];
    const vertex = (x: number, y: number) => {
      const [rx, ry] = rotateOffset(x + y * italicShear, y);
      out.push(label.x, label.y, label.z, ...rectRgba, -6, 0, rx, ry);
    };
    vertex(x1, y1);
    vertex(x2, y1);
    vertex(x1, y2);
    vertex(x1, y2);
    vertex(x2, y1);
    vertex(x2, y2);
  };
  if (label.backgroundColor !== undefined) {
    pushPixelRect(
      (mmapperAnchor ? -2 : -textWidth / 2 - 3) + offsetX,
      (mmapperAnchor ? -size * 0.34 - 2 : -size / 2 - (label.underline ? 4 : 2)) + baselineOffsetY + offsetY,
      (mmapperAnchor ? textWidth + 2 : textWidth / 2 + 3) + offsetX,
      (mmapperAnchor ? size * 0.62 + 2 : size / 2 + 2) + baselineOffsetY + offsetY,
      label.backgroundColor,
      label.backgroundAlpha ?? 1,
    );
  }
  if (label.underline) {
    pushPixelRect(
      (mmapperAnchor ? 0 : -textWidth / 2) + offsetX,
      (mmapperAnchor ? -1 : -size / 2 - 2) + offsetY,
      (mmapperAnchor ? textWidth : textWidth / 2) + offsetX,
      (mmapperAnchor ? 0 : -size / 2 - 1) + offsetY,
      color,
      1,
    );
  }
  for (let i = 0; i < text.length; i++) {
    const cell = glyphs.get(text[i]!) ?? glyphs.get('?')!;
    const x1 = left + i * advance - (quadWidth - advance) / 2 + offsetX;
    const x2 = x1 + quadWidth;
    const y1 = -size / 2 + baselineOffsetY + offsetY;
    const y2 = size / 2 + baselineOffsetY + offsetY;
    const vertex = (x: number, y: number, u: number, v: number) => {
      const [rx, ry] = rotateOffset(x + y * italicShear, y);
      out.push(label.x, label.y, label.z, ...rgba, u, v, rx, ry);
    };
    vertex(x1, y1, cell.u0, cell.vBottom);
    vertex(x2, y1, cell.u1, cell.vBottom);
    vertex(x1, y2, cell.u0, cell.vTop);
    vertex(x1, y2, cell.u0, cell.vTop);
    vertex(x2, y1, cell.u1, cell.vBottom);
    vertex(x2, y2, cell.u1, cell.vTop);
  }
}
