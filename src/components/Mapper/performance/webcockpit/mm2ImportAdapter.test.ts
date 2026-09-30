/** @file Checks canonical MM2 data adaptation at the existing mapper boundary. */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { mapDataToLegacyImport } from './mm2ImportAdapter';
import { DIR_COUNT, EXIT_FLAG, type MapData } from './model';

function tinyMap(): MapData {
  const slots = 2 * DIR_COUNT;
  const outStart = new Uint32Array(slots + 1);
  outStart.fill(1, 1);
  return {
    version: 42,
    roomCount: 2,
    selected: { x: 0, y: 0, z: 0 },
    x: new Int32Array([0, 1]), y: new Int32Array([0, 0]), z: new Int32Array(2),
    extId: new Uint32Array([11, 12]), serverId: new Uint32Array([111, 0]),
    terrain: new Uint8Array([2, 4]), light: new Uint8Array(2), align: new Uint8Array(2),
    portable: new Uint8Array(2), ridable: new Uint8Array(2), sundeath: new Uint8Array(2),
    mobFlags: new Uint32Array(2), loadFlags: new Uint32Array(2),
    names: ['Start', 'Destination'], descs: ['', 'A destination.'], areas: ['Zone', 'Zone'],
    exitFlags: new Uint16Array([EXIT_FLAG.EXIT | EXIT_FLAG.DOOR, ...new Array<number>(slots - 1).fill(0)]),
    doorFlags: new Uint16Array(slots), doorNames: new Map([[0, 'oak door']]),
    outStart, outTo: new Uint32Array([1]), inStart: new Uint32Array(slots + 1), inFrom: new Uint32Array(0),
    infomarks: {
      count: 1, type: new Uint8Array([0]), cls: new Uint8Array(1), angle: new Int32Array(1),
      x1: new Int32Array([50]), y1: new Int32Array([100]), z1: new Int32Array(1),
      x2: new Int32Array(1), y2: new Int32Array(1), z2: new Int32Array(1), text: ['Crossroads'],
    },
    byServerId: new Map(), byNameDesc: new Map(),
    bounds: { minX: 0, maxX: 1, minY: 0, maxY: 0, minZ: 0, maxZ: 0, count: 2 },
    layers: new Map(),
  };
}

describe('MM2 import adapter', () => {
  it('preserves room IDs, links, descriptions, and text infomarks', () => {
    const result = mapDataToLegacyImport(tinyMap());
    expect(result.rooms['11']?.[4]).toMatchObject({ north: { target: '12', hasDoor: true, doorName: 'oak door' } });
    expect(result.rooms['12']?.[17]).toBe('A destination.');
    expect(Object.values(result.markers).map(marker => marker.text)).toEqual(['Crossroads']);
  });
});
