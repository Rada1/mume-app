/**
 * @file Tests canonical MMapper graph routing for Performance Mode Smart Walk.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { MapperRoom } from '../mapperTypes';
import { DIR_COUNT, EXIT_FLAG, type MapData } from '../performance/webcockpit/model';
import { findCanonicalSmartWalkPath, getCanonicalSmartWalkDirection } from './canonicalSmartWalk';

interface TestEdge {
  from: number;
  direction: number;
  to: number;
}

function makeMap(edges: TestEdge[], terrain = [2, 8, 2, 2, 2]): MapData {
  const roomCount = 5;
  const slotCount = roomCount * DIR_COUNT;
  const bySlot = Array.from({ length: slotCount }, () => [] as number[]);
  const exitFlags = new Uint16Array(slotCount);
  for (const edge of edges) {
    const slot = edge.from * DIR_COUNT + edge.direction;
    bySlot[slot]!.push(edge.to);
    exitFlags[slot] = exitFlags[slot]! | EXIT_FLAG.EXIT;
  }
  const outStart = new Uint32Array(slotCount + 1);
  const outTo: number[] = [];
  for (let slot = 0; slot < slotCount; slot++) {
    outStart[slot] = outTo.length;
    outTo.push(...bySlot[slot]!);
  }
  outStart[slotCount] = outTo.length;

  return {
    version: 42,
    roomCount,
    selected: { x: 0, y: 0, z: 0 },
    x: new Int32Array([0, 1, 0, 1, 2]),
    y: new Int32Array([0, 0, 1, 1, 1]),
    z: new Int32Array(roomCount),
    extId: new Uint32Array([10, 20, 30, 40, 50]),
    serverId: new Uint32Array([900, 0, 0, 0, 0]),
    terrain: new Uint8Array(terrain),
    light: new Uint8Array(roomCount),
    align: new Uint8Array(roomCount),
    portable: new Uint8Array(roomCount),
    ridable: new Uint8Array(roomCount),
    sundeath: new Uint8Array(roomCount),
    mobFlags: new Uint32Array(roomCount),
    loadFlags: new Uint32Array(roomCount),
    names: ['Start', 'Water route', 'City route', 'Goal', 'Far goal'],
    descs: ['', '', '', '', ''],
    areas: ['', '', '', '', ''],
    exitFlags,
    doorFlags: new Uint16Array(slotCount),
    doorNames: new Map(),
    outStart,
    outTo: new Uint32Array(outTo),
    inStart: new Uint32Array(slotCount + 1),
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
    bounds: { minX: 0, maxX: 2, minY: 0, maxY: 1, minZ: 0, maxZ: 0, count: roomCount },
    layers: new Map(),
  };
}

function liveRoomWithClosedNorthExit(): MapperRoom {
  return {
    id: 'm_10', gmcpId: 900, name: 'Start', desc: '', x: 0, y: 0, z: 0,
    zone: '', terrain: 'city', exits: { north: { target: 'm_20', closed: true } },
    notes: '', createdAt: 0,
  };
}

describe('canonical Smart Walk graph', () => {
  it('does not route through a random exit with multiple destinations', () => {
    const map = makeMap([
      { from: 0, direction: 0, to: 1 },
      { from: 0, direction: 0, to: 2 },
      { from: 1, direction: 2, to: 3 },
      { from: 2, direction: 2, to: 3 },
    ]);

    expect(findCanonicalSmartWalkPath(map, 'm_900', 'm_40', {}, { revealAll: true })).toBeNull();
  });

  it('does not issue a direction into a random exit', () => {
    const map = makeMap([
      { from: 0, direction: 0, to: 1 },
      { from: 0, direction: 0, to: 2 },
    ]);

    expect(getCanonicalSmartWalkDirection(map, 'm_900', 'm_30', {})).toBeNull();
  });

  it('keeps MMapper unknown-direction exits walkable through the client out command', () => {
    const map = makeMap([{ from: 0, direction: 6, to: 3 }]);

    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_40', {}, { revealAll: true })).toMatchObject({
      dirs: ['out'],
      ids: ['m_10', 'm_40'],
    });
  });

  it('honors a live closed-exit update over the static imported edge', () => {
    const map = makeMap([{ from: 0, direction: 0, to: 1 }]);

    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_20', { m_10: liveRoomWithClosedNorthExit() })).toBeNull();
  });

  it('takes more rooms when they cost fewer movement points', () => {
    const map = makeMap([
      { from: 0, direction: 0, to: 1 }, { from: 1, direction: 0, to: 4 },
      { from: 0, direction: 2, to: 2 }, { from: 2, direction: 2, to: 3 },
      { from: 3, direction: 2, to: 4 },
    ], [2, 8, 11, 2, 3]);
    // Water + field = 5 points; road + city + field = 4.
    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_50', {})?.ids)
      .toEqual(['m_10', 'm_30', 'm_40', 'm_50']);
  });

  it('prefers revealed rooms unless reveal all is enabled', () => {
    const map = makeMap([
      { from: 0, direction: 0, to: 1 }, { from: 1, direction: 2, to: 3 },
      { from: 0, direction: 2, to: 2 }, { from: 2, direction: 0, to: 3 },
    ], [2, 11, 2, 2, 2]);
    const exploredVnums = new Set(['10', '30', '40']);
    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_40', {}, { exploredVnums })?.ids)
      .toEqual(['m_10', 'm_30', 'm_40']);
    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_40', {}, { exploredVnums, revealAll: true })?.ids)
      .toEqual(['m_10', 'm_20', 'm_40']);
  });

  it('avoids a no-ride room while mounted when the detour is modest', () => {
    const map = makeMap([
      { from: 0, direction: 0, to: 1 }, { from: 1, direction: 2, to: 3 },
      { from: 0, direction: 2, to: 2 }, { from: 2, direction: 0, to: 3 },
    ], [2, 11, 2, 2, 2]);
    map.ridable[1] = 2;
    expect(findCanonicalSmartWalkPath(map, 'm_10', 'm_40', {}, { riding: true, revealAll: true })?.ids)
      .toEqual(['m_10', 'm_30', 'm_40']);
  });
});
