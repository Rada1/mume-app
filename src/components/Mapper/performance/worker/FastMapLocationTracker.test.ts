/**
 * @file Tests worker-owned room matching, movement direction, and learned server ids.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, type FastMapData } from '../model';
import { FastMapLocationTracker } from './FastMapLocationTracker';

function mapData(): FastMapData {
  const exitFlags = new Uint16Array(2 * DIR_COUNT);
  const exitTargetStarts = new Uint32Array(2 * DIR_COUNT + 1);
  const exitTargets = new Uint32Array([1]);
  for (let slot = 0; slot <= 2 * DIR_COUNT; slot++) exitTargetStarts[slot] = slot === 0 ? 0 : 1;
  exitFlags[DIR_SLOT.n] = EXIT_FLAG.EXIT;
  exitTargetStarts[DIR_SLOT.n + 1] = 1;
  return {
    roomCount: 2,
    roomIds: ['100', '101'],
    serverIds: ['900', ''],
    names: ['The Start', 'The Destination'],
    descriptions: ['A starting room.', 'A destination room.'],
    x: new Int32Array([0, 0]),
    y: new Int32Array([0, -1]),
    z: new Int32Array([0, 0]),
    terrain: new Uint8Array([2, 2]),
    exitFlags,
    exitTargetStarts,
    exitTargets,
  };
}

function multiExitMap(): FastMapData {
  const starts = new Uint32Array(3 * DIR_COUNT + 1);
  starts.fill(2, 1);
  starts[0] = 0;
  return {
    roomCount: 3,
    roomIds: ['100', '101', '102'],
    serverIds: ['900', '', ''],
    names: ['The Start', 'North A', 'North B'],
    descriptions: ['A starting room.', 'A destination room.', 'Another destination.'],
    x: new Int32Array([0, 0, 1]),
    y: new Int32Array([0, -1, -1]),
    z: new Int32Array([0, 0, 0]),
    terrain: new Uint8Array([2, 2, 2]),
    exitFlags: new Uint16Array([EXIT_FLAG.EXIT, ...new Array<number>(3 * DIR_COUNT - 1).fill(0)]),
    exitTargetStarts: starts,
    exitTargets: new Uint32Array([1, 2]),
  };
}

describe('FastMapLocationTracker', () => {
  it('matches directed movement and learns a room server id for later packets', () => {
    const tracker = new FastMapLocationTracker();
    tracker.setMap(mapData());
    tracker.seedRoom('m_100');
    tracker.apply('moved', { dir: 'north' });

    const first = tracker.apply('room-info', {
      num: 901,
      name: 'The Destination',
      desc: 'A destination room.',
    });
    expect(first).toEqual({ roomId: '101', matchedBy: 'direction' });

    const learned = tracker.apply('room-info', {
      num: 901,
      name: 'The Destination',
      desc: 'A destination room.',
    });
    expect(learned).toEqual({ roomId: '101', matchedBy: 'learned' });
  });

  it('blind-steps a unique exit when a second move arrives before room info', () => {
    const tracker = new FastMapLocationTracker();
    tracker.setMap(mapData());
    tracker.seedRoom('100');
    tracker.apply('moved', { dir: 'n' });

    expect(tracker.apply('moved', { dir: 'south' })).toEqual({ roomId: '101', matchedBy: 'direction' });
  });

  it('uses room text to disambiguate multiple destinations on one direction', () => {
    const map = multiExitMap();
    map.names[1] = 'North A';
    map.names[0] = 'Start';
    map.roomIds[1] = '101';
    const tracker = new FastMapLocationTracker();
    tracker.setMap(map);
    tracker.seedRoom('100');
    tracker.apply('moved', { dir: 'north' });

    expect(tracker.apply('room-info', { name: 'North A', desc: 'A destination room.' }))
      .toEqual({ roomId: '101', matchedBy: 'direction' });
  });

  it('does not blind-step when a direction has multiple possible destinations', () => {
    const tracker = new FastMapLocationTracker();
    tracker.setMap(multiExitMap());
    tracker.seedRoom('100');
    tracker.apply('moved', { dir: 'north' });

    expect(tracker.apply('moved', { dir: 'north' })).toBeNull();
  });
});
