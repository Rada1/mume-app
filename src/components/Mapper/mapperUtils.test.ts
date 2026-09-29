import { describe, expect, it } from 'vitest';
import { getRoomPortableState, getRoomRidableState } from './mapperUtils';

describe('mapper room travel flags', () => {
    it('normalizes mapper enum strings and boolean values', () => {
        expect(getRoomPortableState('PORTABLE')).toBe(true);
        expect(getRoomPortableState('NOT_PORTABLE')).toBe(false);
        expect(getRoomPortableState(false)).toBe(false);
        expect(getRoomRidableState('RIDABLE')).toBe(true);
        expect(getRoomRidableState('NOT_RIDABLE')).toBe(false);
        expect(getRoomRidableState(true)).toBe(true);
    });

    it('leaves unknown or missing values unspecified', () => {
        expect(getRoomPortableState('unknown')).toBeNull();
        expect(getRoomRidableState(undefined)).toBeNull();
    });
});
