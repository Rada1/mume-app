/**
 * @file MMapper schema payload decoder ported from WebCockpit.
 * Parser behavior follows MMapper mapstorage.cpp migrations; see THIRD_PARTY_NOTICES.md.
 */
// --- Logic Section ---

import { DIR_COUNT, EXIT_FLAG, INFOMARK_SCALE, INFOMARK_TYPE, type Infomarks, type MapData, OPPOSITE } from './model';
import { buildIndexes } from './modelIndexes';
import { MM2_SCHEMA as V, MM2_VERSION, Mm2Error, NO_TARGET, TERRAIN_MAX, DEATH_TERRAIN, MOB_MASK, LOAD_MASK, EXIT_MASK, DOOR_MASK, LOAD_DEATHTRAP, clampEnum } from './mm2Format';
import { Mm2BinaryReader } from './mm2BinaryReader';

export function parseMm2Payload(u: Uint8Array, version = MM2_VERSION): MapData {
  const reader = new Mm2BinaryReader(u);
  // Schema switches (see MM2_SCHEMA).
  const hasArea = version >= V.area;
  const hasServerId = version >= V.serverId;
  const deathTerrain = version < V.deathFlag;
  const hasUpToDate = version < V.removeUpToDate;
  const hasInbound = version < V.noInboundLinks;
  const esu = version < V.newCoords; // y grows south: flip to +y north
  const wide = version >= V.largerFlags;
  const wideDoor = version >= V.doorFlags16;
  const hasRidable = version >= V.ridable;
  const dropNoMatch = version >= V.zlib && version < V.discardNoMatch;
  const ySign = esu ? -1 : 1;

  const rooms = reader.u32();
  const marks = reader.u32();
  // Each room takes at least 7 exits × 10 bytes; reject absurd counts early.
  if (rooms > reader.length / 70 || marks > reader.length / 29) throw new Mm2Error('Damaged MMapper map: impossible room or mark count');
  const selected = { x: reader.i32(), y: reader.i32() * ySign, z: reader.i32() };

  const slots = rooms * DIR_COUNT;
  const x = new Int32Array(rooms);
  const y = new Int32Array(rooms);
  const z = new Int32Array(rooms);
  const extId = new Uint32Array(rooms);
  const serverId = new Uint32Array(rooms);
  const terrain = new Uint8Array(rooms);
  const light = new Uint8Array(rooms);
  const align = new Uint8Array(rooms);
  const portable = new Uint8Array(rooms);
  const ridable = new Uint8Array(rooms);
  const sundeath = new Uint8Array(rooms);
  const mobFlags = new Uint32Array(rooms);
  const loadFlags = new Uint32Array(rooms);
  const names: string[] = new Array<string>(rooms);
  const descs: string[] = new Array<string>(rooms);
  const areas: string[] = new Array<string>(rooms);
  const exitFlags = new Uint16Array(slots);
  const doorFlags = new Uint16Array(slots);
  const doorNames = new Map<number, string>();
  const outStart = new Uint32Array(slots + 1);
  // External target ids first; resolved to indices after all rooms are read.
  let ext = new Uint32Array(Math.max(16, rooms * 2));
  let nOut = 0;
  // v < 38: inbound links as (slot, external source id) pairs.
  const inSlot: number[] = [];
  const inExt: number[] = [];

  for (let r = 0; r < rooms; r++) {
    areas[r] = hasArea ? reader.str() : '';
    names[r] = reader.str();
    descs[r] = reader.str();
    reader.skipStr(); // contents
    extId[r] = reader.u32();
    serverId[r] = hasServerId ? reader.u32() : 0;
    reader.skipStr(); // note
    const t = reader.u8();
    let death = false;
    if (deathTerrain && t === DEATH_TERRAIN) {
      death = true;
      terrain[r] = 1; // INDOORS
    } else {
      terrain[r] = clampEnum(t, TERRAIN_MAX);
    }
    light[r] = clampEnum(reader.u8(), 2);
    align[r] = clampEnum(reader.u8(), 3);
    portable[r] = clampEnum(reader.u8(), 2);
    ridable[r] = hasRidable ? clampEnum(reader.u8(), 2) : 0;
    sundeath[r] = wide ? clampEnum(reader.u8(), 2) : 0;
    mobFlags[r] = (wide ? reader.u32() : reader.u16()) & MOB_MASK;
    loadFlags[r] = ((wide ? reader.u32() : reader.u16()) & LOAD_MASK) | (death ? LOAD_DEATHTRAP : 0);
    if (hasUpToDate) reader.skip(1);
    x[r] = reader.i32();
    y[r] = reader.i32() * ySign;
    z[r] = reader.i32();
    for (let d = 0; d < DIR_COUNT; d++) {
      const s = r * DIR_COUNT + d;
      let ef = (wide ? reader.u16() : reader.u8()) & EXIT_MASK;
      if (dropNoMatch) ef &= ~EXIT_FLAG.NO_MATCH;
      exitFlags[s] = ef;
      doorFlags[s] = (wideDoor ? reader.u16() : reader.u8()) & DOOR_MASK;
      const door = reader.str();
      if (door !== '') doorNames.set(s, door);
      if (hasInbound) {
        for (let t = reader.u32(); t !== NO_TARGET; t = reader.u32()) {
          inSlot.push(s);
          inExt.push(t);
        }
      }
      outStart[s] = nOut;
      for (let t = reader.u32(); t !== NO_TARGET; t = reader.u32()) {
        if (nOut === ext.length) {
          const grown = new Uint32Array(ext.length * 2);
          grown.set(ext);
          ext = grown;
        }
        ext[nOut++] = t;
      }
    }
  }
  outStart[slots] = nOut;

  const text: string[] = new Array<string>(marks);
  const im: Infomarks = {
    count: marks,
    type: new Uint8Array(marks),
    cls: new Uint8Array(marks),
    angle: new Int32Array(marks),
    x1: new Int32Array(marks),
    y1: new Int32Array(marks),
    z1: new Int32Array(marks),
    x2: new Int32Array(marks),
    y2: new Int32Array(marks),
    z2: new Int32Array(marks),
    text,
  };
  for (let m = 0; m < marks; m++) {
    if (esu) reader.skipStr(); // name
    const t = reader.str();
    if (esu) reader.skip(9); // QDateTime (Qt 4.8 stream: u32 julian day, u32 ms, i8 spec)
    let type = reader.u8();
    if (type > INFOMARK_TYPE.ARROW) type = INFOMARK_TYPE.TEXT;
    let cls = 0;
    let angle = 0;
    if (wideDoor) {
      cls = reader.u8();
      if (cls > 9) cls = 0;
      angle = reader.i32();
      if (esu) angle = Math.trunc(angle / INFOMARK_SCALE);
    }
    let x1 = reader.i32();
    let y1 = reader.i32();
    const z1 = reader.i32();
    let x2 = reader.i32();
    let y2 = reader.i32();
    const z2 = reader.i32();
    if (esu) {
      // transformInfomarkOnLoad: offsets in the old ESU space, then flip y.
      const H = INFOMARK_SCALE / 2;
      const T = INFOMARK_SCALE / 10;
      x1 += H;
      y1 -= H;
      x2 += H;
      y2 -= H;
      if (type === INFOMARK_TYPE.TEXT) {
        x1 += T;
        y1 += 3 * T;
        x2 += T;
        y2 += 3 * T;
      } else if (type === INFOMARK_TYPE.ARROW) {
        y1 += INFOMARK_SCALE / 20;
        x2 += T;
        y2 += T;
      }
      angle = -angle;
      y1 = -y1;
      y2 = -y2;
    }
    im.type[m] = type;
    im.cls[m] = cls;
    im.angle[m] = angle;
    im.x1[m] = x1;
    im.y1[m] = y1;
    im.z1[m] = z1;
    im.x2[m] = x2;
    im.y2[m] = y2;
    im.z2[m] = z2;
    // MMapper loadMark: non-TEXT marks lose their text; empty TEXT gets a default.
    text[m] = type !== INFOMARK_TYPE.TEXT ? '' : t === '' ? 'New Marker' : t;
  }
  if (reader.position !== reader.length) throw new Mm2Error(`Damaged MMapper map: ${reader.length - reader.position} unexpected bytes after the last infomark`);

  const byExt = new Map<number, number>();
  for (let r = 0; r < rooms; r++) byExt.set(extId[r]!, r);

  // v < 38: an inbound link A → B (stored on B) without the matching
  // outgoing link on A adds it (WorldBuilder::sanitize, "missing OUT").
  const added = new Map<number, number[]>(); // slot → target indices
  let nAdded = 0;
  for (let i = 0; i < inSlot.length; i++) {
    const bSlot = inSlot[i]!;
    const from = byExt.get(inExt[i]!);
    if (from === undefined) continue;
    const b = Math.floor(bSlot / DIR_COUNT);
    const aSlot = from * DIR_COUNT + OPPOSITE[bSlot % DIR_COUNT]!;
    const bExt = extId[b]!;
    let has = false;
    for (let j = outStart[aSlot]!; j < outStart[aSlot + 1]! && !has; j++) has = ext[j] === bExt;
    const list = added.get(aSlot);
    if (has || list?.includes(b)) continue;
    if (list) list.push(b);
    else added.set(aSlot, [b]);
    nAdded++;
  }

  // Resolve external ids to indices (dangling targets are dropped) and
  // apply MMapper's exit invariants (RawExit.cpp) on the raw target counts.
  const outTo = new Uint32Array(nOut + nAdded);
  let k = 0;
  for (let s = 0; s < slots; s++) {
    const a = outStart[s]!;
    const b = outStart[s + 1]!;
    outStart[s] = k;
    for (let j = a; j < b; j++) {
      const idx = byExt.get(ext[j]!);
      if (idx !== undefined) outTo[k++] = idx;
    }
    const extra = nAdded > 0 ? added.get(s) : undefined;
    if (extra) for (const t of extra) outTo[k++] = t;
    let f = exitFlags[s]!;
    const hasOut = b > a || extra !== undefined;
    const isExit = (f & EXIT_FLAG.EXIT) !== 0;
    const unmapped = !hasOut && isExit;
    const exit = hasOut || unmapped;
    const door = exit && ((f & EXIT_FLAG.DOOR) !== 0 || doorFlags[s] !== 0 || doorNames.has(s));
    f = exit ? f | EXIT_FLAG.EXIT : f & ~EXIT_FLAG.EXIT;
    f = door ? f | EXIT_FLAG.DOOR : f & ~EXIT_FLAG.DOOR;
    f = unmapped ? f | EXIT_FLAG.UNMAPPED : f & ~EXIT_FLAG.UNMAPPED;
    exitFlags[s] = f;
    if (!door) {
      doorFlags[s] = 0;
      doorNames.delete(s);
    }
  }
  outStart[slots] = k;

  const map: MapData = {
    version,
    roomCount: rooms,
    selected,
    x,
    y,
    z,
    extId,
    serverId,
    terrain,
    light,
    align,
    portable,
    ridable,
    sundeath,
    mobFlags,
    loadFlags,
    names,
    descs,
    areas,
    exitFlags,
    doorFlags,
    doorNames,
    outStart,
    outTo: k === outTo.length ? outTo : outTo.slice(0, k),
    inStart: new Uint32Array(0),
    inFrom: new Uint32Array(0),
    infomarks: im,
    byServerId: new Map(),
    byNameDesc: new Map(),
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, count: 0 },
    layers: new Map(),
  };
  buildIndexes(map);
  return map;
}
