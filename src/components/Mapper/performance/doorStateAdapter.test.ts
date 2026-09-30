/**
 * @file Tests state synchronization for interactive worker-rendered doors.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { MapperRoom } from '../mapperTypes';
import { EXIT_FLAG, type FastMapData } from './model';
import { applyDoorCommandToSnapshot, createDoorStateSnapshot, updateDoorStateSnapshot } from './doorStateAdapter';

function doorMap(): FastMapData {
  return {
    roomCount: 1,
    roomIds: ['m_1'],
    serverIds: ['1'],
    names: [''],
    descriptions: [''],
    x: new Int32Array([0]),
    y: new Int32Array([0]),
    z: new Int32Array([0]),
    terrain: new Uint8Array([1]),
    doorOpen: new Uint8Array(7),
    exitFlags: new Uint16Array([EXIT_FLAG.EXIT | EXIT_FLAG.DOOR, 0, 0, 0, EXIT_FLAG.EXIT | EXIT_FLAG.DOOR, 0, 0]),
    exitTargetStarts: new Uint32Array(8),
    exitTargets: new Uint32Array(),
  };
}

function sharedWallDoorMap(): FastMapData {
  const map: FastMapData = {
    roomCount: 2,
    roomIds: ['m_1', 'm_2'],
    serverIds: ['1', '2'],
    names: ['', ''],
    descriptions: ['', ''],
    x: new Int32Array([0, 1]),
    y: new Int32Array([0, 0]),
    z: new Int32Array([0, 0]),
    terrain: new Uint8Array([1, 1]),
    doorOpen: new Uint8Array(14),
    exitFlags: new Uint16Array(14),
    exitTargetStarts: new Uint32Array(15),
    exitTargets: new Uint32Array([1, 0]),
  };
  map.exitFlags[0] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
  map.exitFlags[8] = EXIT_FLAG.EXIT | EXIT_FLAG.DOOR;
  for (let slot = 0; slot < 14; slot++) {
    map.exitTargetStarts[slot + 1] = map.exitTargetStarts[slot]! + Number(slot === 0 || slot === 8);
  }
  return map;
}

function room(closed: boolean): MapperRoom {
  return {
    id: 'm_1',
    gmcpId: 1,
    name: '',
    desc: '',
    x: 0,
    y: 0,
    z: 0,
    zone: '',
    terrain: 'indoors',
    exits: {
      n: { target: 'm_2', closed, hasDoor: true },
      u: { target: 'm_3', closed, hasDoor: true },
    },
    notes: '',
    createdAt: 0,
  } as MapperRoom;
}

function reciprocalRoom(id: string, direction: 'n' | 's', target: string, closed: boolean): MapperRoom {
  return {
    id,
    gmcpId: Number(target.replace(/\D/g, '')),
    name: '', desc: '', x: 0, y: 0, z: 0, zone: '', terrain: 'indoors',
    exits: { [direction]: { target, closed, hasDoor: true } },
    notes: '', createdAt: 0,
  };
}

describe('Performance Mode door state adapter', () => {
  it('initializes regular and vertical doors from the app state', () => {
    const snapshot = createDoorStateSnapshot(doorMap(), { m_1: room(false) }, {});
    expect(snapshot.open[0]).toBe(1);
    expect(snapshot.open[4]).toBe(1);
  });

  it('sends only changed door slots, including UP/DOWN slots', () => {
    const snapshot = createDoorStateSnapshot(doorMap(), { m_1: room(false) }, {});
    const changes = updateDoorStateSnapshot(snapshot, { m_1: room(true) }, {}, 'm_1');
    expect(Array.from(changes)).toEqual([(0 << 1), (4 << 1)]);
    expect(snapshot.open[0]).toBe(0);
    expect(snapshot.open[4]).toBe(0);
  });

  it('applies explicit door commands directly to the worker snapshot', () => {
    const snapshot = createDoorStateSnapshot(doorMap(), { m_1: room(true) }, {});
    const changes = applyDoorCommandToSnapshot(snapshot, 'm_1', 'n', false);
    expect(Array.from(changes)).toEqual([1]);
    expect(snapshot.open[0]).toBe(1);
    expect(applyDoorCommandToSnapshot(snapshot, 'm_1', 'n', false)).toHaveLength(0);
  });

  it('updates both sides of reciprocal doors that share a wall', () => {
    const map = sharedWallDoorMap();
    const closedRooms = {
      m_1: reciprocalRoom('m_1', 'n', 'm_2', true),
      m_2: reciprocalRoom('m_2', 's', 'm_1', true),
    };
    const snapshot = createDoorStateSnapshot(map, closedRooms, {});
    const openRooms = { ...closedRooms, m_1: reciprocalRoom('m_1', 'n', 'm_2', false) };
    const changes = updateDoorStateSnapshot(snapshot, openRooms, {}, 'm_1');
    expect(Array.from(changes)).toEqual([1, 17]);
    expect(snapshot.open[0]).toBe(1);
    expect(snapshot.open[8]).toBe(1);
  });

  it('preserves the shared door visual when only one mapped side carries the door flag', () => {
    const map = sharedWallDoorMap();
    map.exitFlags[8] = EXIT_FLAG.EXIT;
    const snapshot = createDoorStateSnapshot(map, {}, {});
    expect(snapshot.doorSlots[0]).toBe(1);
    expect(snapshot.doorSlots[8]).toBe(1);
    expect(map.exitFlags[8]! & EXIT_FLAG.DOOR).toBe(EXIT_FLAG.DOOR);
    const openOnOtherSide = createDoorStateSnapshot(map, {
      m_1: reciprocalRoom('m_1', 'n', 'm_2', true),
      m_2: reciprocalRoom('m_2', 's', 'm_1', false),
    }, {});
    expect(openOnOtherSide.open[0]).toBe(1);
    expect(openOnOtherSide.open[8]).toBe(1);
  });
});
