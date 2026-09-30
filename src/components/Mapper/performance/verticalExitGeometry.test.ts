/**
 * @file Tests grey up/down arrows and their dotted connection.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from './model';
import { buildVerticalExitGeometry } from './verticalExitGeometry';

function testMap(): FastMapData {
  return {
    roomCount: 1, roomIds: ['room'], serverIds: ['1'], names: [''], descriptions: [''],
    x: new Int32Array([0]), y: new Int32Array([0]), z: new Int32Array([0]),
    terrain: new Uint8Array([1]), exitFlags: new Uint16Array(DIR_COUNT),
    exitTargetStarts: new Uint32Array(DIR_COUNT + 1), exitTargets: new Uint32Array(),
  };
}

function connectedVerticalMap(): FastMapData {
  const map = testMap();
  map.roomCount = 2;
  map.roomIds = ['lower', 'upper'];
  map.serverIds = ['1', '2'];
  map.names = ['', ''];
  map.descriptions = ['', ''];
  map.x = new Int32Array([0, 3]);
  map.y = new Int32Array([0, 2]);
  map.z = new Int32Array([0, 1]);
  map.exitFlags = new Uint16Array(DIR_COUNT * 2);
  map.exitFlags[DIR_SLOT.u] = EXIT_FLAG.EXIT;
  map.exitFlags[DIR_COUNT + DIR_SLOT.d] = EXIT_FLAG.EXIT;
  map.exitTargetStarts = new Uint32Array(DIR_COUNT * 2 + 1);
  map.exitTargets = new Uint32Array([1, 0]);
  for (let slot = 0; slot < DIR_COUNT * 2; slot++) {
    const hasTarget = slot === DIR_SLOT.u || slot === DIR_COUNT + DIR_SLOT.d;
    map.exitTargetStarts[slot + 1] = map.exitTargetStarts[slot]! + Number(hasTarget);
  }
  return map;
}

describe('vertical exit geometry', () => {
  it("places grey arrows in the client's upper-left and lower-right positions without linking a room to itself", () => {
    const map = testMap();
    map.exitFlags[DIR_SLOT.u] = EXIT_FLAG.EXIT;
    map.exitFlags[DIR_SLOT.d] = EXIT_FLAG.EXIT;

    const vertices = buildVerticalExitGeometry(map, 0);
    expect(vertices[0]).toBeCloseTo(0.26);
    expect(vertices[1]).toBeCloseTo(0.9);
    expect(vertices[21]).toBeCloseTo(0.74);
    expect(vertices[22]).toBeCloseTo(0.1);
    expect(vertices[6]).toBeCloseTo(0.4);
    expect(vertices).toHaveLength(42);
  });

  it('draws connectors between reciprocal UP and DOWN exits in different rooms', () => {
    const map = connectedVerticalMap();
    const vertices = buildVerticalExitGeometry(map, 0);
    expect(vertices.length).toBeGreaterThan(21);
    expect(vertices[21]).toBeCloseTo(0.26);
    expect(vertices[22]).toBeCloseTo(0.9);
    expect(buildVerticalExitGeometry(map, 1).length).toBeGreaterThan(21);
  });

  it('does not draw a connector when the destination lacks a reciprocal exit', () => {
    const map = connectedVerticalMap();
    map.exitFlags[DIR_COUNT + DIR_SLOT.d] = 0;
    expect(buildVerticalExitGeometry(map, 0)).toHaveLength(21);
  });
});
