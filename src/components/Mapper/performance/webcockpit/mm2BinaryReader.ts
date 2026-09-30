/** @file Bounds-checked big-endian reader for MMapper's QDataStream payload. */
// --- Logic Section ---

import { Mm2Error, NO_TARGET } from './mm2Format';

export class Mm2BinaryReader {
  private offset = 0;
  private readonly view: DataView;
  private readonly decoder = new TextDecoder('utf-16be');

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get position(): number { return this.offset; }
  get length(): number { return this.bytes.byteLength; }

  private need(size: number): void {
    if (this.offset + size > this.length) throw new Mm2Error(`Damaged MMapper map: unexpected end of data at byte ${this.offset}`);
  }

  u8(): number { this.need(1); return this.bytes[this.offset++]!; }
  u16(): number { this.need(2); const value = this.view.getUint16(this.offset); this.offset += 2; return value; }
  u32(): number { this.need(4); const value = this.view.getUint32(this.offset); this.offset += 4; return value; }
  i32(): number { this.need(4); const value = this.view.getInt32(this.offset); this.offset += 4; return value; }

  str(): string {
    const size = this.u32();
    if (size === NO_TARGET || size === 0) return '';
    this.need(size);
    const value = this.decoder.decode(this.bytes.subarray(this.offset, this.offset + size));
    this.offset += size;
    return value;
  }

  skipStr(): void {
    const size = this.u32();
    if (size === NO_TARGET) return;
    this.skip(size);
  }

  skip(size: number): void { this.need(size); this.offset += size; }
}
