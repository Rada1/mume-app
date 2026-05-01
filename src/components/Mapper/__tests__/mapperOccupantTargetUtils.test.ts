/**
 * @file mapperOccupantTargetUtils.test.ts
 * @description Tests mapper command targets for duplicate GMCP occupants.
 */

import { describe, expect, it } from 'vitest';
import { getOccupantCommandTarget } from '../mapperOccupantTargetUtils';

describe('getOccupantCommandTarget', () => {
    it('adds ordinal prefixes for duplicate occupant command keywords', () => {
        const occupants = [
            { id: 26, name: 'pack horse', keyword: 'pack-horse' },
            { id: 27, name: 'pack horse', keyword: 'pack-horse' },
        ];

        expect(getOccupantCommandTarget(occupants[0], occupants, 'pack horse')).toBe('1.pack-horse');
        expect(getOccupantCommandTarget(occupants[1], occupants, 'pack horse')).toBe('2.pack-horse');
    });

    it('uses the base keyword when the occupant is unique', () => {
        const occupants = [{ id: 28, name: 'pack horse', keyword: 'pack-horse' }];

        expect(getOccupantCommandTarget(occupants[0], occupants, 'pack horse')).toBe('pack-horse');
    });

    it('uses marker-preserving capitalized keywords for enemies and neutrals', () => {
        const occupants = [
            { id: 29, name: '*an Orc*', type: 'enemy' },
            { id: 30, name: '-Brolg the dreadful Orc-', type: 'neutral' },
        ];

        expect(getOccupantCommandTarget(occupants[0], occupants, '*an Orc*')).toBe('*Orc*');
        expect(getOccupantCommandTarget(occupants[1], occupants, '-Brolg the dreadful Orc-')).toBe('-Brolg-');
    });
});
