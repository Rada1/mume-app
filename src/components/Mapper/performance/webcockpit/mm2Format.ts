/**
 * @file MMapper .mm2 headers and schema definitions ported from WebCockpit.
 */
// --- Logic Section ---

// MMapper `.mm2` reader, schema versions 17–42 (ADR 0020; research
// notes/research/mmapper-rendering.md §1). Pure: runs in the map worker
// and in Node tests. The inflate step is injectable; the default uses
// `DecompressionStream('deflate')` (zlib-wrapped, as qCompress writes).
//
//   0   i32 BE  magic FF B2 AF 01
//   4   u32 BE  schema version (17 … 42)
//   8   u32 BE  uncompressed length (qCompress header, v ≥ 34 only)
//   …           zlib stream to EOF (v ≥ 25) or the raw payload (v < 25)
//               → the QDataStream payload (big endian)
//
// Payload: u32 rooms, u32 marks, Coordinate selected, rooms × Room,
// marks × Infomark. Strings are QString: u32 byte length (0xFFFFFFFF =
// null) then UTF-16BE. Contents and notes are skipped by length.
//
// Older schemas are converted to the current MapData exactly as MMapper
// 26.06.0 does on load (ported from src/mapstorage/mapstorage.cpp
// loadRoom / loadExits / loadMark / transformInfomarkOnLoad and
export const MM2_MAGIC = 0xffb2af01;
/** The current schema (MMapper 25.05 and later); the writer's default. */
export const MM2_VERSION = 42;
/** The oldest schema MMapper 26.06 (and this reader) can read. */
export const MM2_MIN_VERSION = 17;

/**
 * MMapper's schema versions (mapstorage.cpp `namespace schema`). Every one
 * of these can be read; 37 and anything unlisted cannot (nor can MMapper).
 */
export const MM2_SCHEMA = {
  initial: 17, // 2.0.0 (2006)
  ridable: 24, // + ridable byte
  zlib: 25, // zlib stream without a length prefix
  doorFlags16: 32, // 16-bit door flags; infomark class and angle
  largerFlags: 33, // 16-bit exit flags, 32-bit mob/load flags, sundeath
  qCompress: 34, // qCompress: u32 length + zlib
  discardNoMatch: 35, // NO_MATCH exit flags from 25–34 were corrupt
  newCoords: 36, // 19.10: +y north (was south), infomark offsets dropped
  noInboundLinks: 38, // 25.04: inbound links no longer stored
  removeUpToDate: 39, // upToDate byte dropped
  serverId: 40, // + server room id
  deathFlag: 41, // death terrain (15) → INDOORS + DEATHTRAP load flag
  area: 42, // + area
} as const;
const SUPPORTED: ReadonlySet<number> = new Set(Object.values(MM2_SCHEMA));
const V = MM2_SCHEMA;

/** Inflates a zlib (RFC 1950) stream. */
export type Inflate = (zlib: Uint8Array) => Promise<Uint8Array>;

export class Mm2Error extends Error {
  override name = 'Mm2Error';
}

/** Default inflate: `DecompressionStream('deflate')` (browsers, workers, Node ≥ 18). */
export const inflateZlib: Inflate = async (zlib) => {
  const stream = new Blob([zlib as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

/** How a schema version stores its payload after the 8-byte magic + version. */
export type Mm2Compression = 'qcompress' | 'zlib' | 'none';

export function mm2Compression(version: number): Mm2Compression {
  return version >= V.qCompress ? 'qcompress' : version >= V.zlib ? 'zlib' : 'none';
}

export interface Mm2Header {
  version: number;
  compression: Mm2Compression;
  /** Uncompressed payload length (qCompress only), else null. */
  length: number | null;
  /** Where the zlib stream or the raw payload starts. */
  offset: number;
}

/** The header of a `.mm2` file, or an error for a version MMapper 26.06 cannot read either. */
export function readMm2Header(bytes: Uint8Array): Mm2Header {
  if (bytes.byteLength < 8) throw new Mm2Error('Not an MMapper map (.mm2): file too short');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (dv.getUint32(0) !== MM2_MAGIC) throw new Mm2Error('Not an MMapper map (.mm2): bad magic number');
  const version = dv.getUint32(4);
  if (!SUPPORTED.has(version)) {
    const why =
      version > MM2_VERSION
        ? 'it is newer than this reader knows. Save it from MMapper 26.06 (or older) instead, or report it.'
        : 'MMapper never released it. Open and save the map in a current MMapper first.';
    throw new Mm2Error(
      `Unsupported MMapper map version ${version}: versions ${MM2_MIN_VERSION}–${MM2_VERSION} ` +
        `(MMapper 2.0 to 26.06, except 37) can be read, and ${why}`,
    );
  }
  const compression = mm2Compression(version);
  if (compression !== 'qcompress') return { version, compression, length: null, offset: 8 };
  if (bytes.byteLength < 12) throw new Mm2Error('Not an MMapper map (.mm2): file too short');
  return { version, compression, length: dv.getUint32(8), offset: 12 };
}

export const NO_TARGET = 0xffffffff;
export const TERRAIN_MAX = 14;
export const DEATH_TERRAIN = 15;
export const MOB_MASK = (1 << 19) - 1;
export const LOAD_MASK = (1 << 25) - 1;
export const EXIT_MASK = (1 << 13) - 1;
export const DOOR_MASK = (1 << 11) - 1;
export const LOAD_DEATHTRAP = 1 << 24;
export const clampEnum = (value: number, max: number): number => value > max ? 0 : value;
