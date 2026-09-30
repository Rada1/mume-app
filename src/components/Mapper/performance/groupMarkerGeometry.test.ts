/**
 * @file Tests map-space geometry and labels for group location markers.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { FastMapGroupMember } from './model';
import { buildGroupMemberGeometry, buildGroupMemberLabels } from './groupMarkerGeometry';

const members: FastMapGroupMember[] = [
  { id: '1', name: 'Arwen', x: 2, y: -4, z: 0, color: 0xbbf7d0 },
  { id: '2', name: 'Gimli', x: 2, y: -4, z: 0, color: 0x86efac },
];

describe('fast map group markers', () => {
  it('renders regular-weight name labels above each room marker', () => {
    const labels = buildGroupMemberLabels(members);
    expect(labels.map(label => label.text)).toEqual(['Arwen', 'Gimli']);
    expect(labels[0]).toMatchObject({ color: 0xbbf7d0, fontSize: 18, offsetY: 0 });
    expect(labels[1]).toMatchObject({ color: 0x86efac, fontSize: 18, offsetY: 20 });
  });

  it('separates same-room members and skips other floors', () => {
    const result = buildGroupMemberGeometry(members, { x: 2.5, y: -3.5, zoom: 1, layer: 0 });
    expect(result.length).toBeGreaterThan(0);
    const otherFloor = buildGroupMemberGeometry(members, { x: 2.5, y: -3.5, zoom: 1, layer: 1 });
    expect(otherFloor).toHaveLength(0);
  });

  it('uses room-sized squares that scale with the map at every zoom', () => {
    const nearby = buildGroupMemberGeometry(members, { x: 2.5, y: -3.5, zoom: 1, layer: 0 });
    const distant = buildGroupMemberGeometry(members, { x: 2.5, y: -3.5, zoom: 0.3, layer: 0 });
    const nearbyRoomWidth = nearby[7]! - nearby[0]!;
    const distantRoomWidth = distant[7]! - distant[0]!;

    expect(nearby).toHaveLength(1008);
    expect(distant).toHaveLength(1008);
    expect(nearbyRoomWidth).toBeCloseTo(0.83);
    expect(distantRoomWidth).toBeCloseTo(0.83);
  });
});
