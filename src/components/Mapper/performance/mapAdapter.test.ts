/**
 * @file Unit tests for bundled and live MUME room conversion to fast map data.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { adaptLiveRoom, adaptMumeMap, terrainIndex } from './mapAdapter';
import { DIR_COUNT, DIR_SLOT, EXIT_FLAG, TERRAIN } from './model';

const room = (
  x: number,
  y: number,
  z: number,
  terrain: string,
  exits: Readonly<Record<string, unknown>>,
  serverId: number,
): readonly unknown[] => [x, y, z, terrain, exits, 'room', serverId, [], [], 'area'];

describe('adaptMumeMap', () => {
  it('converts terrain, coordinates, floor, target links, road flags, and doors', () => {
    const adapted = adaptMumeMap({
      '100': room(1, 2, 0, 'CITY', { n: { target: '101' }, e: { target: '101', hasDoor: true, flags: ['road'] }, u: { target: '102' } }, 900),
      '101': room(2, 2, 0, 'FOREST', { w: { target: '100' } }, 901),
      '102': room(1, 2, 1, 'INDOORS', {}, 902),
    });

    expect(adapted.map.roomCount).toBe(3);
    expect(Array.from(adapted.map.x)).toEqual([1, 2, 1]);
    expect(Array.from(adapted.map.y)).toEqual([-2, -2, -2]);
    expect(Array.from(adapted.map.z)).toEqual([0, 0, 1]);
    expect(Array.from(adapted.map.terrain)).toEqual([2, 4, 1]);
    expect(adapted.map.roomIds).toEqual(['100', '101', '102']);
    expect(adapted.map.serverIds).toEqual(['900', '901', '902']);
    expect(adapted.map.names).toEqual(['room', 'room', 'room']);
    expect(adapted.map.exitTargets[0]).toBe(1);
    expect(adapted.map.exitTargetStarts[DIR_SLOT.n]).toBe(0);
    expect(adapted.map.exitTargetStarts[DIR_SLOT.n + 1]).toBe(1);
    expect(adapted.map.exitFlags[DIR_SLOT.n]).toBe(EXIT_FLAG.EXIT);
    expect(adapted.map.exitFlags[DIR_SLOT.e] & (EXIT_FLAG.EXIT | EXIT_FLAG.DOOR | EXIT_FLAG.ROAD)).toBe(EXIT_FLAG.EXIT | EXIT_FLAG.DOOR | EXIT_FLAG.ROAD);
    expect(adapted.map.exitFlags[DIR_COUNT + DIR_SLOT.w]).toBe(EXIT_FLAG.EXIT);
    expect(adapted.roomIndexById.get('102')).toBe(2);
    expect(adapted.transferables).toHaveLength(11);
  });

  it('keeps visible exits even when their destination is outside the loaded map', () => {
    const adapted = adaptMumeMap({
      '200': room(0, 0, 0, 'field', { n: { target: 778 }, s: { target: 99999 } }, 778),
      '201': room(0, -1, 0, 'field', {}, 779),
    });
    expect(adapted.map.exitFlags[DIR_SLOT.n]).toBe(EXIT_FLAG.EXIT);
    expect(adapted.map.exitFlags[DIR_SLOT.s]).toBe(EXIT_FLAG.EXIT);
    expect(adapted.map.exitTargetStarts[DIR_SLOT.s]).toBe(adapted.map.exitTargetStarts[DIR_SLOT.s + 1]);
    expect(terrainIndex('Building')).toBe(TERRAIN.indexOf('indoors'));
  });

  it('converts bundled MOB/LOAD flags and retains door names', () => {
    const adapted = adaptMumeMap({
      '300': [0, 0, 0, 'field', { n: { target: '301', doorName: 'oak door' } }, 'Tavern', 300, ['SHOP', 'RENT'], ['HERB', 'KEY'], '', 0, 0, 0, 0, 'NOT_RIDABLE'],
      '301': room(0, -1, 0, 'field', {}, 301),
    });
    expect(adapted.map.mobFlags?.[0]).toBe((1 << 0) | (1 << 1));
    expect(adapted.map.loadFlags?.[0]).toBe((1 << 5) | (1 << 6));
    expect(adapted.map.ridable?.[0]).toBe(2);
    expect(adapted.map.doorNames?.get(DIR_SLOT.n)).toBe('oak door');
    expect(adapted.map.doorOpen?.[DIR_SLOT.n]).toBe(0);
    const open = adaptMumeMap({
      '302': [0, 0, 0, 'field', { n: { target: '303', hasDoor: true, closed: false } }, 'Hall', 302],
    });
    expect(open.map.doorOpen?.[DIR_SLOT.n]).toBe(1);
  });
});

describe('adaptLiveRoom', () => {
  it('converts a live terrain and exit patch without rebuilding static map data', () => {
    const overlay = adaptLiveRoom({
      x: 10,
      y: -4,
      z: 2,
      terrain: 'Forest',
      exits: { e: { target: 'm_222', hasDoor: true, doorName: 'iron gate' }, d: { target: '223', flags: ['climb'] } },
      mobFlags: ['SHOP'],
      loadFlags: ['HERB'],
      ridable: false,
    });
    expect(overlay).not.toBeNull();
    expect(overlay?.x).toBe(10);
    expect(overlay?.y).toBe(4);
    expect(overlay?.z).toBe(2);
    expect(overlay?.terrain).toBe(TERRAIN.indexOf('forest'));
    expect(overlay?.exitFlags[DIR_SLOT.e]).toBe(EXIT_FLAG.EXIT | EXIT_FLAG.DOOR);
    expect(overlay?.exitFlags[DIR_SLOT.d]).toBe(EXIT_FLAG.EXIT | EXIT_FLAG.CLIMB);
    expect(overlay?.mobFlags).toBe(1 << 1);
    expect(overlay?.loadFlags).toBe(1 << 5);
    expect(overlay?.ridable).toBe(2);
    expect(overlay?.doorNames?.get(DIR_SLOT.e)).toBe('iron gate');
    expect(overlay?.doorOpen?.[DIR_SLOT.e]).toBe(0);
    expect(adaptLiveRoom(null)).toBeNull();
  });

  it('keeps a live exit visible when GMCP omits its destination id', () => {
    const overlay = adaptLiveRoom({
      x: 1, y: 2, z: 0, terrain: 'field',
      exits: { east: { target: '' } },
    });
    expect(overlay?.exitFlags[DIR_SLOT.e]).toBe(EXIT_FLAG.EXIT);
  });
});
