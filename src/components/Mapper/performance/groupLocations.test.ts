/**
 * @file Tests GMCP map-ID resolution for Performance Mode group markers.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { GroupMember } from '../../../types';
import { resolveFastMapGroupMembers } from './groupLocations';

function member(mapid?: number): GroupMember {
  return { id: 7, name: 'Elrond', hp: 100, mapid };
}

describe('resolveFastMapGroupMembers', () => {
  it('maps GMCP server IDs through the map index and inverts northing for the worker', () => {
    const result = resolveFastMapGroupMembers(
      [member(900)],
      { '30': [4, 6, 2] },
      {},
      { '900': '30' },
    );
    expect(result).toEqual([{ id: '7', name: 'Elrond', x: 4, y: -6, z: 2, color: 0xbbf7d0 }]);
  });

  it('falls back to a live room resolved by its GMCP ID', () => {
    const result = resolveFastMapGroupMembers(
      [member(901)],
      {},
      { 'm_31': { gmcpId: 901, x: 8, y: 3, z: -1 } },
      {},
    );
    expect(result[0]).toMatchObject({ x: 8, y: -3, z: -1 });
  });

  it('skips missing or unknown room IDs instead of inventing locations', () => {
    expect(resolveFastMapGroupMembers([member(), member(902)], {}, {}, {})).toEqual([]);
  });
});
