import { describe, it, expect } from 'vitest';
import { isGmcpCharVitals } from '../src/utils/gmcpValidation';

describe('isGmcpCharVitals', () => {
    it('returns false for null/undefined/non-objects', () => {
        expect(isGmcpCharVitals(null)).toBe(false);
        expect(isGmcpCharVitals(undefined)).toBe(false);
        expect(isGmcpCharVitals("string")).toBe(false);
        expect(isGmcpCharVitals(123)).toBe(false);
    });

    it('returns true for objects with hit point keys', () => {
        expect(isGmcpCharVitals({ hp: 100 })).toBe(true);
        expect(isGmcpCharVitals({ hits: 100 })).toBe(true);
        expect(isGmcpCharVitals({ Health: 100 })).toBe(true);
        expect(isGmcpCharVitals({ H: 100 })).toBe(true);
    });

    it('returns true for objects with mana keys', () => {
        expect(isGmcpCharVitals({ mana: 100 })).toBe(true);
        expect(isGmcpCharVitals({ SP: 100 })).toBe(true);
        expect(isGmcpCharVitals({ spirit: 100 })).toBe(true);
    });

    it('returns true for objects with movement keys', () => {
        expect(isGmcpCharVitals({ move: 100 })).toBe(true);
        expect(isGmcpCharVitals({ mv: 100 })).toBe(true);
        expect(isGmcpCharVitals({ mp: 100 })).toBe(true);
    });

    it('returns true for objects with light/terrain/pos/opp keys', () => {
        expect(isGmcpCharVitals({ light: 1 })).toBe(true);
        expect(isGmcpCharVitals({ terrain: 'forest' })).toBe(true);
        expect(isGmcpCharVitals({ position: 'Standing' })).toBe(true);
        expect(isGmcpCharVitals({ opponent: 'Orc' })).toBe(true);
    });

    it('returns false for objects without any vitals keys', () => {
        expect(isGmcpCharVitals({})).toBe(false);
        expect(isGmcpCharVitals({ name: 'Jules' })).toBe(false);
        expect(isGmcpCharVitals({ room: 1234 })).toBe(false);
    });

    it('handles case insensitivity', () => {
        expect(isGmcpCharVitals({ HP: 100 })).toBe(true);
        expect(isGmcpCharVitals({ mAxHp: 100 })).toBe(true);
        expect(isGmcpCharVitals({ MANA: 100 })).toBe(true);
    });
});
