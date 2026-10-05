/**
 * @file Tests MMapper text annotations, named doors, and connection-line geometry.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { DIR_COUNT, DOOR_FLAG, EXIT_FLAG, type FastMapData } from './model';
import { buildMapLineBatches, buildMapTextLabels } from './mapOverlays';

function overlayMap(): FastMapData {
  return {
    roomCount: 1,
    roomIds: ['1'],
    serverIds: [''],
    names: ['Room'],
    descriptions: [''],
    x: new Int32Array([0]),
    y: new Int32Array([0]),
    z: new Int32Array([0]),
    terrain: new Uint8Array([0]),
    exitFlags: new Uint16Array(7),
    exitTargetStarts: new Uint32Array(8),
    exitTargets: new Uint32Array(),
    doorNames: new Map([[0, 'north gate']]),
    labels: [{ x: 4, y: 5, z: 0, text: 'Custom map label' }],
    infomarks: {
      count: 2,
      type: new Uint8Array([0, 2]),
      cls: new Uint8Array([0, 2]),
      angle: new Int32Array(2),
      x1: new Int32Array([200, 0]),
      y1: new Int32Array([300, 0]),
      z1: new Int32Array([0, 0]),
      x2: new Int32Array([0, 100]),
      y2: new Int32Array([0, 100]),
      z2: new Int32Array([0, 0]),
      text: ['river marker', ''],
    },
  };
}

describe('Performance Mode map overlays', () => {
  it('keeps user labels, infomark text, and named doors', () => {
    const map = overlayMap();
    map.exitFlags[0] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
    map.doorFlags = new Uint16Array([DOOR_FLAG.HIDDEN, 0, 0, 0, 0, 0, 0]);
    map.exitTargetStarts = new Uint32Array([0, 1, 1, 1, 1, 1, 1, 1]);
    map.exitTargets = new Uint32Array([0]);
    const labels = buildMapTextLabels(map);
    expect(labels.map(label => label.text)).toEqual(['Custom map label', 'river marker', 'north gate']);
    expect(labels[1]).toMatchObject({ x: 3, y: 2, z: 0 });
    expect(labels[2]).toMatchObject({ x: 0.6, y: 0.85, z: 0, backgroundColor: 0x000000, backgroundAlpha: 0.4 });
  });

  it('combines nearby hidden names once and excludes ordinary named doors', () => {
    const map = overlayMap();
    map.roomCount = 2;
    map.roomIds = ['1', '2'];
    map.x = new Int32Array([0, 0]);
    map.y = new Int32Array([0, 1]);
    map.z = new Int32Array([0, 0]);
    map.exitFlags = new Uint16Array(DIR_COUNT * 2);
    map.doorFlags = new Uint16Array(DIR_COUNT * 2);
    map.exitFlags[0] = map.exitFlags[8] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
    map.doorFlags[0] = map.doorFlags[8] = DOOR_FLAG.HIDDEN;
    map.exitTargetStarts = Uint32Array.from({ length: DIR_COUNT * 2 + 1 }, (_, slot) => slot === 0 ? 0 : slot <= 8 ? 1 : 2);
    map.exitTargets = new Uint32Array([1, 0]);
    map.doorNames = new Map([[0, 'gate'], [8, 'arch'], [2, 'visible door']]);

    const doors = buildMapTextLabels(map).filter(label => label.roomIndex !== undefined);
    expect(doors.map(label => label.text)).toEqual(['gate/arch']);
    expect(doors[0]).toMatchObject({ x: 0.6, y: 1.2, z: 0 });
  });

  it('batches arrow connection marks into one floor draw range', () => {
    const batches = buildMapLineBatches(overlayMap());
    expect(batches).toHaveLength(1);
    expect(batches[0]?.z).toBe(0);
    expect(batches[0]?.vertices).toHaveLength(42);
  });

  it('uses MMapper exit endpoints and segmented spans for a distant one-way connection', () => {
    const map = overlayMap();
    map.roomCount = 2;
    map.x = new Int32Array([0, 5]);
    map.y = new Int32Array([0, 0]);
    map.z = new Int32Array([0, 0]);
    map.exitTargetStarts = new Uint32Array([0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    map.exitTargets = new Uint32Array([1]);

    const batch = buildMapLineBatches(map)[0];
    expect(batch?.vertices.length).toBeGreaterThan(84);
    expect(batch?.vertices[42]).toBeCloseTo(0.9);
    expect(batch?.vertices[43]).toBeCloseTo(0.75);
    expect(batch?.vertices[49]).toBeCloseTo(1.1);
    expect(batch?.vertices[50]).toBeCloseTo(0.75);
    const hasPoint = (x: number, y: number) => {
      if (!batch) return false;
      for (let index = 0; index < batch.vertices.length; index += 7) {
        if (Math.abs(batch.vertices[index]! - x) < 0.001 && Math.abs(batch.vertices[index + 1]! - y) < 0.001) return true;
      }
      return false;
    };
    expect(hasPoint(5.1, 0.82)).toBe(true);
    expect(hasPoint(5.1, 0.68)).toBe(true);
  });

  it('aligns vertical connections with up-left and down-right indicators on both floors', () => {
    const map = overlayMap();
    map.roomCount = 2;
    map.x = new Int32Array([0, 0]);
    map.y = new Int32Array([0, 0]);
    map.z = new Int32Array([0, 1]);
    map.exitTargetStarts = new Uint32Array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    map.exitTargets = new Uint32Array([1]);

    const batches = buildMapLineBatches(map);
    const lower = batches.find(batch => batch.z === 0)?.vertices;
    const upper = batches.find(batch => batch.z === 1)?.vertices;

    expect(lower!.length).toBeGreaterThan(84);
    expect(upper!.length).toBeGreaterThan(42);
    // The segmented middle span begins at the up-left source cap and stops before the target cap.
    expect(lower![56]).toBeCloseTo(0.45);
    expect(lower![57]).toBeCloseTo(0.75);
    expect(lower![58]).toBe(0);
    expect(lower![63]).toBeGreaterThan(0.45);
    expect(lower![63]).toBeLessThan(0.75);
    expect(lower![64]).toBeLessThan(0.75);
    expect(lower![62]).toBeCloseTo(0.5);
    expect(lower![69]).toBeCloseTo(0.5);
  });
});
