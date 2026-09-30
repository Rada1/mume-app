/**
 * @file Tests direct conversion of canonical MMapper room and exit data for Performance Mode.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { MapData } from './webcockpit/model';
import { adaptWebCockpitMap } from './adaptWebCockpitMap';

function canonicalMap(): MapData {
  const starts = new Uint32Array(22);
  starts[0] = 0;
  starts[1] = 2;
  for (let slot = 2; slot < starts.length; slot++) starts[slot] = 2;
  return {
    version: 42,
    roomCount: 3,
    selected: { x: 0, y: 0, z: 0 },
    x: new Int32Array([0, 1, 1]),
    y: new Int32Array([0, 0, 1]),
    z: new Int32Array([0, 0, 1]),
    extId: new Uint32Array([100, 101, 102]),
    serverId: new Uint32Array([900, 901, 0]),
    terrain: new Uint8Array([2, 4, 1]),
    light: new Uint8Array(3),
    align: new Uint8Array(3),
    portable: new Uint8Array(3),
    ridable: new Uint8Array(3),
    sundeath: new Uint8Array(3),
    mobFlags: new Uint32Array(3),
    loadFlags: new Uint32Array(3),
    names: ['Fork', 'North A', 'North B'],
    descs: ['Two exits north.', 'A room.', 'B room.'],
    areas: ['', '', ''],
    exitFlags: new Uint16Array([1, ...new Array<number>(20).fill(0)]),
    doorFlags: new Uint16Array(21),
    doorNames: new Map(),
    outStart: starts,
    outTo: new Uint32Array([1, 2]),
    inStart: new Uint32Array(22),
    inFrom: new Uint32Array(),
    infomarks: {
      count: 0,
      type: new Uint8Array(),
      cls: new Uint8Array(),
      angle: new Int32Array(),
      x1: new Int32Array(), y1: new Int32Array(), z1: new Int32Array(),
      x2: new Int32Array(), y2: new Int32Array(), z2: new Int32Array(),
      text: [],
    },
    byServerId: new Map(),
    byNameDesc: new Map(),
    bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1, minZ: 0, maxZ: 1, count: 3 },
    layers: new Map(),
  };
}

describe('adaptWebCockpitMap', () => {
  it('keeps full multi-target exits and maps coordinates without mutating the canonical model', () => {
    const source = canonicalMap();
    const originalX = source.x.buffer;
    const adapted = adaptWebCockpitMap(source);

    expect(Array.from(adapted.map.x)).toEqual([1, 2, 2]);
    expect(Array.from(adapted.map.y)).toEqual([-1, -1, 0]);
    expect(Array.from(adapted.map.z)).toEqual([0, 0, 1]);
    expect(adapted.map.roomIds).toEqual(['100', '101', '102']);
    expect(adapted.map.serverIds).toEqual(['900', '901', '']);
    expect(adapted.map.names[0]).toBe('Fork');
    expect(adapted.map.descriptions[0]).toBe('Two exits north.');
    expect(Array.from(adapted.map.exitTargetStarts.slice(0, 3))).toEqual([0, 2, 2]);
    expect(Array.from(adapted.map.exitTargets)).toEqual([1, 2]);
    expect(adapted.roomIndexById.get('900')).toBe(0);
    expect(adapted.transferables).toHaveLength(25);
    expect(adapted.map.mobFlags?.buffer).not.toBe(source.mobFlags.buffer);
    expect(adapted.map.infomarks?.text).toEqual([]);
    expect(adapted.map.x.buffer).not.toBe(originalX);
    expect(Array.from(source.outTo)).toEqual([1, 2]);
  });

  it('copies room flags, named doors, and text infomarks into worker-owned buffers', () => {
    const source = canonicalMap();
    source.mobFlags[0] = 1 << 1;
    source.loadFlags[0] = 1 << 5;
    source.ridable[0] = 2;
    source.doorNames.set(0, 'stone gate');
    source.infomarks = {
      count: 1,
      type: new Uint8Array([0]), cls: new Uint8Array([0]), angle: new Int32Array([0]),
      x1: new Int32Array([100]), y1: new Int32Array([200]), z1: new Int32Array([0]),
      x2: new Int32Array([0]), y2: new Int32Array([0]), z2: new Int32Array([0]), text: ['Old bridge'],
    };

    const adapted = adaptWebCockpitMap(source);

    expect(adapted.map.mobFlags?.[0]).toBe(1 << 1);
    expect(adapted.map.loadFlags?.[0]).toBe(1 << 5);
    expect(adapted.map.ridable?.[0]).toBe(2);
    expect(adapted.map.doorNames?.get(0)).toBe('stone gate');
    expect(adapted.map.infomarks?.text).toEqual(['Old bridge']);
    expect(adapted.map.infomarks?.x1.buffer).not.toBe(source.infomarks.x1.buffer);
  });
});
