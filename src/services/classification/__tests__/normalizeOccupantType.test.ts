import { describe, it, expect } from 'vitest';
import { normalizeOccupantType } from '../normalizeOccupantType';

describe('normalizeOccupantType', () => {
    describe('explicit type wins', () => {
        it('returns the type field when present', () => {
            expect(normalizeOccupantType({ type: 'ally' })).toBe('ally');
            expect(normalizeOccupantType({ type: 'enemy' })).toBe('enemy');
            expect(normalizeOccupantType({ type: 'neutral' })).toBe('neutral');
            expect(normalizeOccupantType({ type: 'npc' })).toBe('npc');
            expect(normalizeOccupantType({ type: 'you' })).toBe('you');
        });

        it('preserves an explicit type even when pc is also set', () => {
            // type is documented; pc is the legacy fallback. Don't let pc override.
            expect(normalizeOccupantType({ type: 'enemy', pc: true })).toBe('enemy');
            expect(normalizeOccupantType({ type: 'ally', pc: false })).toBe('ally');
        });
    });

    describe('falls back to pc field', () => {
        it('infers ally from pc:true', () => {
            expect(normalizeOccupantType({ pc: true })).toBe('ally');
        });

        it('infers ally from pc:1 (numeric)', () => {
            expect(normalizeOccupantType({ pc: 1 })).toBe('ally');
        });

        it('infers npc from pc:false', () => {
            expect(normalizeOccupantType({ pc: false })).toBe('npc');
        });

        it('infers npc from pc:0 (numeric)', () => {
            expect(normalizeOccupantType({ pc: 0 })).toBe('npc');
        });
    });

    describe('returns undefined when no signal present', () => {
        it('handles empty object', () => {
            expect(normalizeOccupantType({})).toBeUndefined();
        });

        it('handles missing type and pc', () => {
            expect(normalizeOccupantType({ name: 'Frodo', id: 1 })).toBeUndefined();
        });

        it('ignores empty-string type', () => {
            expect(normalizeOccupantType({ type: '' })).toBeUndefined();
        });

        it('ignores non-string non-empty type values', () => {
            // Defensive: don't coerce numbers/objects/etc into a type string.
            expect(normalizeOccupantType({ type: 1 })).toBeUndefined();
            expect(normalizeOccupantType({ type: null })).toBeUndefined();
            expect(normalizeOccupantType({ type: {} })).toBeUndefined();
        });

        it('ignores ambiguous pc values (e.g. strings, null)', () => {
            expect(normalizeOccupantType({ pc: 'yes' })).toBeUndefined();
            expect(normalizeOccupantType({ pc: null })).toBeUndefined();
            expect(normalizeOccupantType({ pc: undefined })).toBeUndefined();
        });

        it('handles null/undefined input', () => {
            expect(normalizeOccupantType(null)).toBeUndefined();
            expect(normalizeOccupantType(undefined)).toBeUndefined();
        });

        it('handles non-object input', () => {
            expect(normalizeOccupantType('Frodo')).toBeUndefined();
            expect(normalizeOccupantType(42)).toBeUndefined();
        });
    });
});
