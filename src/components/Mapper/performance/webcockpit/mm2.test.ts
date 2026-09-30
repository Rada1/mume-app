/** @file Minimal checks for the vendored MMapper MM2 reader boundary. */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { MM2_MAGIC, Mm2Error, readMm2, readMm2Header } from './mm2';

function mm2File(version: number, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.length);
  const header = new DataView(bytes.buffer);
  header.setUint32(0, MM2_MAGIC);
  header.setUint32(4, version);
  bytes.set(payload, 8);
  return bytes;
}

describe('WebCockpit MMapper MM2 reader', () => {
  it('accepts a raw version 17 file and builds an empty canonical map', async () => {
    const payload = new Uint8Array(20);
    const map = await readMm2(mm2File(17, payload));
    expect(map.roomCount).toBe(0);
    expect(map.selected.x).toBe(0);
    expect(Math.abs(map.selected.y)).toBe(0);
    expect(map.selected.z).toBe(0);
    expect(map.byServerId.size).toBe(0);
  });

  it('reports unsupported versions and malformed payloads', async () => {
    expect(() => readMm2Header(mm2File(37, new Uint8Array()))).toThrow(/Unsupported MMapper map version 37/);
    await expect(readMm2(mm2File(17, new Uint8Array(3)))).rejects.toBeInstanceOf(Mm2Error);
  });

  it('reads the qCompress header length for schema 34 and later', () => {
    const bytes = new Uint8Array(12);
    const header = new DataView(bytes.buffer);
    header.setUint32(0, MM2_MAGIC);
    header.setUint32(4, 42);
    header.setUint32(8, 1234);
    expect(readMm2Header(bytes)).toMatchObject({ version: 42, compression: 'qcompress', length: 1234, offset: 12 });
  });
});
