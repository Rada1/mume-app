/**
 * @file MMapper .mm2 reader entry point, adapted from WebCockpit.
 */
// --- Logic Section ---

import { type Inflate, inflateZlib, Mm2Error, readMm2Header } from './mm2Format';
import { parseMm2Payload } from './mm2Payload';

export * from './mm2Format';
export { parseMm2Payload } from './mm2Payload';

export async function readMm2(bytes: Uint8Array, inflate: Inflate = inflateZlib): Promise<import('./model').MapData> {
  const { version, compression, length, offset } = readMm2Header(bytes);
  let payload = bytes.subarray(offset);
  if (compression !== 'none') {
    try {
      payload = await inflate(payload);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Mm2Error(`Damaged MMapper map: decompression failed (${reason})`);
    }
  }
  if (length !== null && payload.byteLength !== length) {
    throw new Mm2Error(`Damaged MMapper map: ${payload.byteLength} bytes after decompression, header says ${length}`);
  }
  return parseMm2Payload(payload, version);
}

export async function mapHash(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
  return Array.from(digest.subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
}
