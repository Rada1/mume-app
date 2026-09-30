/**
 * @file Tests MUME queued-move prediction adaptation and graph resolution.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { FastMapData } from './model';
import { createFastMapPrediction, createFastMapRoomIndex, resolveFastMapPredictionPoints } from './predictionPath';

function predictionMap(): FastMapData {
  const destinations = new Map<number, number[]>([
    [0, [1, 2]],
    [9, [3]],
    [16, [3]],
  ]);
  const starts = new Uint32Array(29);
  let targetCount = 0;
  for (let slot = 0; slot < 28; slot++) {
    starts[slot] = targetCount;
    targetCount += destinations.get(slot)?.length ?? 0;
  }
  starts[28] = targetCount;
  return {
    roomCount: 4,
    roomIds: ['10', '20', '30', '40'],
    serverIds: ['900', '', '', ''],
    names: ['', '', '', ''],
    descriptions: ['', '', '', ''],
    x: new Int32Array([0, 0, 0, 1]),
    y: new Int32Array([0, 1, 2, 2]),
    z: new Int32Array([0, 0, 0, 0]),
    terrain: new Uint8Array(4),
    exitFlags: new Uint16Array(28),
    exitTargetStarts: starts,
    exitTargets: new Uint32Array([1, 2, 3, 3]),
  };
}

describe('Performance Mode queued-move prediction', () => {
  it('adapts the live queue and resolves an explicitly selected first destination', () => {
    const map = predictionMap();
    const prediction = createFastMapPrediction('m_900', [{ dir: 'north' }, { dir: 'east' }], { dir: 'n', targetId: 'm_30' });

    expect(prediction).toEqual({ roomId: 'm_900', directions: ['north', 'east'], firstTargetId: 'm_30' });
    expect(resolveFastMapPredictionPoints(map, createFastMapRoomIndex(map), prediction)).toEqual([
      { x: 0.5, y: 0.5, z: 0 },
      { x: 0.5, y: 2.5, z: 0 },
      { x: 1.5, y: 2.5, z: 0 },
    ]);
  });

  it('does not draw a guessed route through an ambiguous exit', () => {
    const map = predictionMap();
    const prediction = createFastMapPrediction('900', [{ dir: 'n' }], null);

    expect(resolveFastMapPredictionPoints(map, createFastMapRoomIndex(map), prediction)).toEqual([]);
  });

  it('stops cleanly at a missing exit and hides an empty queue', () => {
    const map = predictionMap();
    const index = createFastMapRoomIndex(map);

    expect(resolveFastMapPredictionPoints(map, index, createFastMapPrediction('m_900', [{ dir: 'n' }], { dir: 'n', targetId: 'm_30' }))).toHaveLength(2);
    expect(createFastMapPrediction('m_900', [{ dir: 'north' }], { dir: 'east', targetId: 'm_30' })?.firstTargetId).toBeNull();
    expect(createFastMapPrediction('m_900', [], null)).toBeNull();
    expect(createFastMapPrediction(null, [{ dir: 'north' }], null)).toBeNull();
  });
});
