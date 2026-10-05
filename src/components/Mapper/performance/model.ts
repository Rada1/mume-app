/**
 * @file Compact typed model shared by the Performance Mode map adapter and worker.
 * Room mesh rules are adapted from WebCockpit and MMapper; see THIRD_PARTY_NOTICES.md.
 */
// --- Logic Section ---

import { ALIGN, DOOR_FLAG as MAPPER_DOOR_FLAG, EXIT_FLAG as MAPPER_EXIT_FLAG, LIGHT, PORTABLE, RIDABLE, SUNDEATH } from './webcockpit/model';

export const DIR_COUNT = 7;
export const DIR_SLOT = { n: 0, s: 1, e: 2, w: 3, u: 4, d: 5, unknown: 6 } as const;
export const TERRAIN = [
  'undefined', 'indoors', 'city', 'field', 'forest', 'hills', 'mountains', 'shallow',
  'water', 'rapids', 'underwater', 'road', 'brush', 'tunnel', 'cavern',
] as const;
export const TERRAIN_ROAD = 11;

/** MMapper room enums and exit masks are shared with its canonical MM2 reader. */
export const ROOM_LIGHT = LIGHT;
export const ROOM_ALIGN = ALIGN;
export const ROOM_PORTABLE = PORTABLE;
export const ROOM_RIDABLE = RIDABLE;
export const ROOM_SUNDEATH = SUNDEATH;
export const EXIT_FLAG = MAPPER_EXIT_FLAG;
export const DOOR_FLAG = MAPPER_DOOR_FLAG;

export interface FastMapData {
  roomCount: number;
  roomIds: string[];
  serverIds: string[];
  names: string[];
  descriptions: string[];
  labels?: FastMapTextLabel[];
  x: Int32Array;
  y: Int32Array;
  z: Int32Array;
  terrain: Uint8Array;
  light?: Uint8Array;
  align?: Uint8Array;
  portable?: Uint8Array;
  ridable?: Uint8Array;
  sundeath?: Uint8Array;
  /** MOB_FLAGS and LOAD_FLAGS bitsets from the source map, when available. */
  mobFlags?: Uint32Array;
  loadFlags?: Uint32Array;
  /** Door state by room-direction slot: 1=open, 0=closed. */
  doorOpen?: Uint8Array;
  /** MMapper DOOR_FLAG bitsets, one per room-direction slot. */
  doorFlags?: Uint16Array;
  doorNames?: ReadonlyMap<number, string>;
  infomarks?: FastMapInfomarks;
  exitFlags: Uint16Array;
  /** CSR offsets by room-direction slot; length is roomCount * DIR_COUNT + 1. */
  exitTargetStarts: Uint32Array;
  /** Full directed graph; multiple destinations may share one direction. */
  exitTargets: Uint32Array;
}

export interface FastMapTextLabel {
  x: number;
  y: number;
  z: number;
  text: string;
  /** Door labels can be thinned when their screen-space boxes collide. */
  kind?: 'door';
  /** Use MMapper's left-aligned baseline anchor for MM2 text infomarks. */
  anchor?: 'center' | 'mmapper';
  /** MMapper infomark text rotation, in degrees around its stored position. */
  rotation?: number;
  italic?: boolean;
  fontSize?: number;
  color?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  underline?: boolean;
  offsetX?: number;
  offsetY?: number;
  /** Room-owned labels follow that room's exploration visibility. */
  roomIndex?: number;
}

export interface FastMapGroupMember {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface FastMapInfomarks {
  count: number;
  type: Uint8Array;
  cls: Uint8Array;
  angle: Int32Array;
  x1: Int32Array;
  y1: Int32Array;
  z1: Int32Array;
  x2: Int32Array;
  y2: Int32Array;
  z2: Int32Array;
  text: string[];
}

export interface FastRoomExit {
  target?: string | number;
  hasDoor?: boolean;
  closed?: boolean;
  doorName?: string;
  name?: string;
  flags?: readonly string[];
  doorFlags?: readonly string[];
}

export interface FastLiveRoom {
  x: number;
  y: number;
  z: number;
  terrain: string | number;
  exits: Readonly<Record<string, FastRoomExit>>;
  mobFlags?: readonly string[];
  loadFlags?: readonly string[];
  light?: string | number | null;
  align?: string | number | null;
  portable?: string | boolean | number | null;
  ridable?: string | boolean | number | null;
  sundeath?: string | number | null;
}

export interface FastRoomOverlay {
  x: number;
  y: number;
  z: number;
  terrain: number;
  exitFlags: Uint16Array;
  doorFlags?: Uint16Array;
  /** Door state by direction slot: 1=open, 0=closed. */
  doorOpen?: Uint8Array;
  mobFlags?: number;
  loadFlags?: number;
  ridable?: number;
  light?: number;
  align?: number;
  portable?: number;
  sundeath?: number;
  doorNames?: ReadonlyMap<number, string>;
}
