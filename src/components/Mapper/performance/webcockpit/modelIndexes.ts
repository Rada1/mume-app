/**
 * @file MMapper map lookup and derived-index helpers ported from WebCockpit.
 */
// --- Logic Section ---

import { DIR_COUNT, OPPOSITE, type Dir, type MapData } from './model';

/** Collapses whitespace runs to one space and trims (ADR 0020 locator). */
export function normalizeText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** True for the characters `\s` matches in `normalizeText` (ASCII and the common Unicode spaces). */
function isSpace(c: number): boolean {
  return c === 32 || (c >= 9 && c <= 13) || c === 0xa0 || c === 0xfeff || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000;
}

/** FNV-1a over `s` as `normalizeText(s)` would read, continuing from `h`. */
function hashNormalized(s: string, h: number): number {
  let pending = false;
  let started = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (isSpace(c)) {
      pending = started;
      continue;
    }
    if (pending) {
      h = Math.imul(h ^ 32, 0x01000193);
      pending = false;
    }
    started = true;
    h = Math.imul(h ^ c, 0x01000193);
  }
  return h;
}

/** FNV-1a 32-bit hash of the normalised name and description (no string is built). */
export function nameDescHash(name: string, desc: string): number {
  let h = hashNormalized(name, 0x811c9dc5);
  h = Math.imul(h ^ 10, 0x01000193);
  return hashNormalized(desc, h) >>> 0;
}

/** Rooms whose normalised name and description equal these (hash checked against the text). */
export function roomsByNameDesc(map: MapData, name: string, desc: string): number[] {
  const hit = map.byNameDesc.get(nameDescHash(name, desc));
  if (!hit) return [];
  const n = normalizeText(name);
  const d = normalizeText(desc);
  return hit.filter((i) => normalizeText(map.names[i]!) === n && normalizeText(map.descs[i]!) === d);
}

/** Outgoing target rooms of `room` towards `dir`. */
export function exitTargets(map: MapData, room: number, dir: Dir): Uint32Array {
  const slot = room * DIR_COUNT + dir;
  return map.outTo.subarray(map.outStart[slot]!, map.outStart[slot + 1]!);
}

/** Rooms with an exit towards `room` that arrives from `dir` (i.e. their exit `opposite(dir)`). */
export function exitSources(map: MapData, room: number, dir: Dir): Uint32Array {
  const slot = room * DIR_COUNT + dir;
  return map.inFrom.subarray(map.inStart[slot]!, map.inStart[slot + 1]!);
}

/** Builds the derived indexes (incoming exits, server ids, name hash, bounds) in place. */
export function buildIndexes(map: MapData): void {
  const n = map.roomCount;
  const slots = n * DIR_COUNT;

  // Incoming: count, prefix sum, fill.
  const inCount = new Uint32Array(slots + 1);
  for (let r = 0; r < n; r++) {
    for (let d = 0; d < DIR_COUNT; d++) {
      const s = r * DIR_COUNT + d;
      const opp = OPPOSITE[d]!;
      for (let k = map.outStart[s]!; k < map.outStart[s + 1]!; k++) {
        inCount[map.outTo[k]! * DIR_COUNT + opp]!++;
      }
    }
  }
  const inStart = new Uint32Array(slots + 1);
  for (let s = 0; s < slots; s++) inStart[s + 1] = inStart[s]! + inCount[s]!;
  const inFrom = new Uint32Array(inStart[slots]!);
  const fill = inStart.slice(0, slots);
  for (let r = 0; r < n; r++) {
    for (let d = 0; d < DIR_COUNT; d++) {
      const s = r * DIR_COUNT + d;
      const opp = OPPOSITE[d]!;
      for (let k = map.outStart[s]!; k < map.outStart[s + 1]!; k++) {
        inFrom[fill[map.outTo[k]! * DIR_COUNT + opp]!++] = r;
      }
    }
  }
  map.inStart = inStart;
  map.inFrom = inFrom;

  map.byServerId = new Map();
  map.byNameDesc = new Map();
  map.layers = new Map();
  const b = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, count: n };
  for (let r = 0; r < n; r++) {
    const sid = map.serverId[r]!;
    if (sid !== 0) map.byServerId.set(sid, r);
    const h = nameDescHash(map.names[r]!, map.descs[r]!);
    const list = map.byNameDesc.get(h);
    if (list) list.push(r);
    else map.byNameDesc.set(h, [r]);

    const x = map.x[r]!;
    const y = map.y[r]!;
    const z = map.z[r]!;
    if (r === 0) {
      b.minX = b.maxX = x;
      b.minY = b.maxY = y;
      b.minZ = b.maxZ = z;
    } else {
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
      if (z < b.minZ) b.minZ = z;
      if (z > b.maxZ) b.maxZ = z;
    }
    const layer = map.layers.get(z);
    if (!layer) map.layers.set(z, { minX: x, maxX: x, minY: y, maxY: y, count: 1 });
    else {
      if (x < layer.minX) layer.minX = x;
      if (x > layer.maxX) layer.maxX = x;
      if (y < layer.minY) layer.minY = y;
      if (y > layer.maxY) layer.maxY = y;
      layer.count++;
    }
  }
  map.bounds = b;
}
