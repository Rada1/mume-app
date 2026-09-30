/**
 * @file Adapted static room mesh builder from WebCockpit.
 * Copyright (C) 2026 WebCockpit contributors; GPL-3.0-or-later.
 * Room tile rules derive from MMapper 26.06.0; GPL-2.0-or-later.
 */
// --- Logic Section ---
// Static room meshes (research §3): one instanced-quad list per z-layer,
// built once per map. Ported from MMapper 26.06.0
// display/MapCanvasRoomDrawer.cpp (visitRoom, LayerBatchBuilder;
// GPL-2.0-or-later). Pure; no GL.
//
// An instance is four Int32s: x, y, z, and `texLayer | colorId << 8`
// (MMapper's `ivec4 aVertTexCol`). Each category is a contiguous range
// of one layer's instance array, drawn in the order of LayerMeshes::render.

import { DIR_COUNT, EXIT_FLAG, ROOM_LIGHT, ROOM_SUNDEATH, type FastMapData, TERRAIN_ROAD } from '../model';
import type { FastMapView } from '../protocol';
import { NC } from './palette';
import { ARRAY_FILES, LDOTTED, L128, L256, TEX, type TexArray } from './textures';
import { exitFlagColor } from './exitFlagStyle';

export interface Range {
  first: number;
  count: number;
}

export const CATEGORIES = ['terrain', 'upDown', 'walls', 'dottedWalls'] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * The texture array each category is drawn with (webgl.ts drawLayer).
 * The tints are drawn white (the bound texture is not sampled).
 */
export const CATEGORY_TEX: Readonly<Record<Category, TexArray>> = {
  terrain: TEX.A128,
  upDown: TEX.A128,
  walls: TEX.A128,
  dottedWalls: TEX.DOTTED,
};
const FILE_ARRAYS: Partial<Record<TexArray, keyof typeof ARRAY_FILES>> = { [TEX.A128]: 'A128', [TEX.A256]: 'A256' };

export interface RoomLayerMesh {
  z: number;
  bounds: RoomMeshBounds;
  /** 4 Int32 per instance: x, y, z, texLayer | colorId << 8. */
  inst: Int32Array;
  ranges: Record<Category, Range>;
  /** Textured MOB/LOAD flag sprites: xyz, uv, texture layer. */
  flagVertices: Float32Array;
  /** 64px road-trail overlays from MMapper ROAD exit flags. */
  trailVertices: Float32Array;
  /** Door art slots are fixed 24-vertex ranges within doorVertices. */
  doorSlots: Uint32Array;
  doorVertices: Float32Array;
  /** Grey vertical-exit arrows and their dotted connector. */
  verticalExitVertices: Float32Array;
  /** Per-room ranges for refreshing vertical exit arrows when a door opens. */
  verticalExitRoomRanges: Map<number, { first: number; count: number }>;
  /** Per-room ranges for exploration visibility updates. */
  roomInstanceRanges: Map<number, Range[]>;
  flagRoomRanges: Map<number, Range>;
  trailRoomRanges: Map<number, Range>;
  doorRoomRanges: Map<number, Range>;
}

export interface RoomMeshBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Road index of a room: bit 1 << dir for every N/S/E/W exit with the ROAD flag. */
export function roadIndex(map: FastMapData, room: number): number {
  let m = 0;
  for (let d = 0; d < 4; d++) if (map.exitFlags[room * DIR_COUNT + d]! & EXIT_FLAG.ROAD) m |= 1 << d;
  return m;
}

export type RoomLists = Record<Category, number[]>;

/** The visitor, one room: appends [x, y, z, packed] to the category lists. */
export function visitRoom(map: FastMapData, r: number, out: RoomLists, state = 0): void {
  const x = map.x[r]!;
  const y = map.y[r]!;
  const z = map.z[r]!;
  const add = (cat: Category, tex: number, color: number = NC.DEFAULT) => {
    out[cat].push(x, y, z, tex | (color << 8) | (state << 12));
  };
  const terrain = map.terrain[r]!;
  const road = roadIndex(map, r);

  const roomTint = map.light?.[r] === ROOM_LIGHT.DARK
    ? NC.ROOM_DARK
    : map.sundeath?.[r] === ROOM_SUNDEATH.NO_SUNDEATH ? NC.ROOM_NO_SUNDEATH : NC.DEFAULT;
  add('terrain', terrain === TERRAIN_ROAD ? L128.road(road) : L128.terrain(terrain), roomTint);
  for (let dir = 0; dir < 4; dir++) {
    const slot = r * DIR_COUNT + dir;
    const flags = map.exitFlags[slot]!;
    const isExit = (flags & EXIT_FLAG.EXIT) !== 0;
    const hasDoor = (flags & EXIT_FLAG.DOOR) !== 0;
    const flagColor = exitFlagColor(flags);
    if (!isExit && !hasDoor) add('walls', L128.wall(dir), NC.WALL_REGULAR_EXIT);
    if (isExit && flagColor !== null) add('dottedWalls', LDOTTED.wall(dir), flagColor);
  }

}

export function flagVerticesForRoom(map: FastMapData, room: number, incomingFlowMask: number, out: number[], state: number): void {
  const mobs = map.mobFlags?.[room] ?? 0;
  const loads = map.loadFlags?.[room] ?? 0;
  const noRide = map.ridable?.[room] === 2;
  // Slightly inset the sprites to keep adjacent room details from crowding.
  const size = 0.9;
  const inset = (1 - size) / 2;
  const x = map.x[room]! + inset;
  const y = map.y[room]! + inset;
  for (let i = 0; i < 19; i++) if ((mobs & (1 << i)) !== 0) appendTexturedQuad(out, x, y, map.z[room]!, size, L128.mob(i), state);
  for (let i = 0; i < 25; i++) if ((loads & (1 << i)) !== 0) appendTexturedQuad(out, x, y, map.z[room]!, size, L128.load(i), state);
  if (noRide) appendTexturedQuad(out, x, y, map.z[room]!, size, L128.noRide, state);
  for (let dir = 0; dir < 6; dir++) {
    const slot = room * DIR_COUNT + dir;
    if (map.exitFlags[slot]! & EXIT_FLAG.FLOW) appendTexturedQuad(out, x, y, map.z[room]!, size, L128.streamOut(dir), state);
    if (incomingFlowMask & (1 << dir)) appendTexturedQuad(out, x, y, map.z[room]!, size, L128.streamIn(dir), state);
  }
}

export function trailVerticesForRoom(map: FastMapData, room: number, out: number[], state: number): void {
  const mask = roadIndex(map, room);
  if (mask === 0 || map.terrain[room] === TERRAIN_ROAD) return;
  appendTexturedQuad(out, map.x[room]!, map.y[room]!, map.z[room]!, 1, mask, state);
}

function appendTexturedQuad(out: number[], x: number, y: number, z: number, size: number, layer: number, state = 0): void {
  const x2 = x + size;
  const y2 = y + size;
  const v = (px: number, py: number, u: number, tv: number) => out.push(px, py, z, u, tv, layer, state);
  v(x, y, 0, 0); v(x2, y, 1, 0); v(x, y2, 0, 1);
  v(x, y2, 0, 1); v(x2, y, 1, 0); v(x2, y2, 1, 1);
}

export const emptyRoomLists = (): RoomLists => {
  const l = {} as RoomLists;
  for (const c of CATEGORIES) l[c] = [];
  return l;
};

/** Rooms grouped by z, ascending z (MMapper draws layers in ascending order). */
export function roomsByLayer(map: FastMapData): Map<number, number[]> {
  const by = new Map<number, number[]>();
  for (let r = 0; r < map.roomCount; r++) {
    const z = map.z[r]!;
    const l = by.get(z);
    if (l) l.push(r);
    else by.set(z, [r]);
  }
  return new Map([...by.entries()].sort((a, b) => a[0] - b[0]));
}

/** True when a room chunk intersects the current WebCockpit camera frustum. */
export function isRoomMeshVisible(bounds: RoomMeshBounds, z: number, view: FastMapView, width: number, height: number): boolean {
  if (z !== view.layer) return false;
  const perspective = Math.max(1, 60 - 7 * z);
  const scale = Math.max(0.01, view.zoom) * 5280;
  const halfWidth = Math.max(1, width) * perspective / scale;
  const halfHeight = Math.max(1, height) * perspective / scale;
  return bounds.maxX + 1 >= view.x - halfWidth
    && bounds.minX <= view.x + halfWidth
    && bounds.maxY + 1 >= view.y - halfHeight
    && bounds.minY <= view.y + halfHeight;
}

/**
 * The upstream pixmaps sampled by these static room meshes.
 */
export function roomMeshPixmaps(meshes: readonly RoomLayerMesh[]): Set<string> {
  const out = new Set<string>();
  for (const m of meshes) {
    const mapFiles = ARRAY_FILES.A128.files;
    for (let i = 0; i < m.flagVertices.length; i += 7) {
      const layer = Math.round(m.flagVertices[i + 5]!);
      if (mapFiles[layer]) out.add(`pixmaps/${mapFiles[layer]!}`);
    }
    for (const cat of CATEGORIES) {
      const arr = FILE_ARRAYS[CATEGORY_TEX[cat]];
      if (!arr) continue;
      const files = ARRAY_FILES[arr].files;
      const { first, count } = m.ranges[cat];
      for (let i = first; i < first + count; i++) out.add(`pixmaps/${files[m.inst[i * 4 + 3]! & 0xff]!}`);
    }
  }
  return out;
}

export { buildRoomMeshes } from './roomMeshBuilder';
