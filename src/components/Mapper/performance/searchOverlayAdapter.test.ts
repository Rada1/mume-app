/** @file Prevents saved coordinates and server ID collisions from displacing search results. */
import { describe, expect, it } from 'vitest';
import { buildSearchOverlay } from './searchOverlayAdapter';

// --- Logic Section ---
describe('search room identity', () => {
    it('uses the map tile when its map ID also happens to be another room’s server ID', () => {
        const overlay = buildSearchOverlay({
            mapSearchQuery: 'shop', matchedRoomIds: new Set(['m_10']), closestRoomId: 'm_10',
            selectedRoomId: 'm_10', filterPathIds: ['m_10'],
            rooms: { m_10: { x: 8, y: 18, z: 0 } },
            preloaded: { '10': [9, 19, 0] },
            canonical: { x: new Int32Array([99]), y: new Int32Array([99]), z: new Int32Array([0]), byServerId: new Map([[10, 0]]) },
        });
        const center = { x: 9.5, y: -18.5, z: 0 };
        expect(overlay.matches).toEqual([center]);
        expect(overlay.target).toEqual(center);
        expect(overlay.selectedRoom).toEqual(center);
        expect(overlay.path).toEqual([center]);
    });
});
