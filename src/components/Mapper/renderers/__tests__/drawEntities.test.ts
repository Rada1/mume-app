/**
 * @file drawEntities.test.ts
 * @description Tests mapper opponent matching for duplicate room occupants.
 */

import { describe, expect, it } from 'vitest';
import { isOpponentOccupant } from '../../mapperOpponentUtils';

describe('isOpponentOccupant', () => {
    it('matches by GMCP id even when multiple occupants share a name', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 27, name: 'pack horse' },
            { id: 28, name: 'pack horse' },
        ];

        expect(isOpponentOccupant(occupants[1], occupants, 27, 'pack horse')).toBe(true);
        expect(isOpponentOccupant(occupants[0], occupants, 27, 'pack horse')).toBe(false);
    });

    it('does not match ambiguous duplicate names without a GMCP id', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 27, name: 'pack horse' },
            { id: 28, name: 'pack horse' },
        ];

        expect(occupants.some(occupant => isOpponentOccupant(occupant, occupants, null, 'pack horse'))).toBe(false);
    });

    it('allows name fallback when exactly one visible occupant matches', () => {
        const occupants = [
            { id: 26, name: 'pack horse' },
            { id: 40, name: 'orc' },
        ];

        expect(isOpponentOccupant(occupants[1], occupants, null, 'orc')).toBe(true);
    });
});
