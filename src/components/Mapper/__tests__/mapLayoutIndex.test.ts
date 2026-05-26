/**
 * @file mapLayoutIndex.test.ts
 * @description Tests local mapper layout indexing ignores preloaded master-map rooms.
 */

import { describe, expect, it } from 'vitest';
import { buildLocalSpatialIndex, didLocalLayoutChange } from '../mapLayoutIndex';

// --- Logic Section ---
describe('mapLayoutIndex', () => {
    it('ignores newly visited master-map rooms when checking local layout changes', () => {
        const before = {
            local_1: { id: 'local_1', x: 0, y: 0, exits: {} },
        };
        const after = {
            ...before,
            m_123: { id: 'm_123', x: 10, y: 10, exits: {} },
            m_124: { id: 'm_124', x: 11, y: 10, exits: {} },
        };

        expect(didLocalLayoutChange(before, after)).toBe(false);
    });

    it('detects real local room topology changes', () => {
        const before = {
            local_1: { id: 'local_1', x: 0, y: 0, exits: {} },
        };
        const after = {
            local_1: { id: 'local_1', x: 1, y: 0, exits: {} },
        };

        expect(didLocalLayoutChange(before, after)).toBe(true);
    });

    it('builds the local spatial index without master-map rooms', () => {
        const index = buildLocalSpatialIndex({
            local_1: { id: 'local_1', x: 12, y: 3, z: 0, exits: {} },
            m_123: { id: 'm_123', x: 12, y: 3, z: 0, exits: {} },
        });

        expect(index).toEqual({ 0: { '2,0': ['local_1'] } });
    });
});
