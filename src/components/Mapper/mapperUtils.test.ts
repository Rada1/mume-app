import { describe, expect, it } from 'vitest';
import { getRoomPortableState, getRoomRidableState } from './mapperUtils';

describe('mapper room travel flags', () => {
    it.each([getRoomPortableState, getRoomRidableState])('decodes numeric MMapper enums without treating unknown as forbidden', normalize => {
        expect(normalize(0)).toBeNull();
        expect(normalize('0')).toBeNull();
        expect(normalize(1)).toBe(true);
        expect(normalize('1')).toBe(true);
        expect(normalize(2)).toBe(false);
        expect(normalize('2')).toBe(false);
    });
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
