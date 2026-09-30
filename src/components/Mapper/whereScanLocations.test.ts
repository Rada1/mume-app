/**
 * @file Tests nearby map-room matching for temporary `where` scan markers.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { GroupMember } from '../../types';
import { resolveWhereScanLocations } from './whereScanLocations';

const emptyGroups: GroupMember[] = [];
const playerPosition = { x: 10, y: 10, z: 0 };

describe('resolveWhereScanLocations', () => {
  it('uses room name, zone, and direction to pick a nearby room', () => {
    const markers = resolveWhereScanLocations(
      [{ name: 'Iodvin', distance: 'Very near', direction: 'West', room: 'Armour Shop' }],
      'Elénath', emptyGroups, playerPosition, 'Bree',
      {
        west: { name: 'Armour Shop', zone: 'Bree', x: 8, y: 10, z: 0 },
        east: { name: 'Armour Shop', zone: 'Bree', x: 11, y: 10, z: 0 },
        otherZone: { name: 'Armour Shop', zone: 'Moria', x: 9, y: 10, z: 0 },
      },
      {
        west: [8, 10, 0, 0, {}, 'Armour Shop', '', [], [], 'Bree'],
        east: [11, 10, 0, 0, {}, 'Armour Shop', '', [], [], 'Bree'],
        otherZone: [9, 10, 0, 0, {}, 'Armour Shop', '', [], [], 'Moria'],
      },
    );

    expect(markers.map(({ name, x, y, z }) => ({ name, x, y, z }))).toEqual([
      { name: 'Iodvin', x: 8, y: 10, z: 0 },
    ]);
  });

  it('omits the local player, groupmates, ambiguous matches, and rooms out of range', () => {
    const markers = resolveWhereScanLocations(
      [
        { name: 'Elénath', distance: 'Very near', direction: '', room: 'Current Room' },
        { name: 'Groupmate', distance: 'Very near', direction: 'East', room: 'East Room' },
        { name: 'Stranger', distance: 'Very near', direction: '', room: 'Twin Room' },
        { name: 'Faraway', distance: 'Very near', direction: '', room: 'Far Room' },
      ],
      'Elénath', [{ id: 'group', name: 'Groupmate', hp: 0 }], playerPosition, 'Bree',
      {
        current: { name: 'Current Room', zone: 'Bree', x: 10, y: 10, z: 0 },
        east: { name: 'East Room', zone: 'Bree', x: 11, y: 10, z: 0 },
        twinA: { name: 'Twin Room', zone: 'Bree', x: 9, y: 10, z: 0 },
        twinB: { name: 'Twin Room', zone: 'Bree', x: 11, y: 10, z: 0 },
        far: { name: 'Far Room', zone: 'Bree', x: 16, y: 10, z: 0 },
      },
      {},
    );

    expect(markers).toEqual([]);
  });
});
