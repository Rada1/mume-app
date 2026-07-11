/**
 * @file zoneAlignment.test.ts
 * @description Tests map zone alignment lookup for atmosphere coloring.
 */

import { describe, expect, it } from 'vitest';
import { getZoneAlignment, getZoneEmberColor } from '../zoneAlignment';

// --- Test Section ---

describe('zoneAlignment', () => {
    it('maps named zones to their configured alignments', () => {
        expect(getZoneAlignment('Bree')).toBe('good');
        expect(getZoneAlignment('Dol Guldur')).toBe('evil');
        expect(getZoneAlignment('Lorien')).toBe('super-good');
        expect(getZoneAlignment('Moria')).toBe('evil');
        expect(getZoneAlignment('the Troll Warrens')).toBe('super-evil');
    });

    it('normalizes spacing and case for zone lookup', () => {
        expect(getZoneAlignment('  the   shire  ')).toBe('good');
        expect(getZoneAlignment('goblin-town')).toBe('evil');
    });

    it('falls back to neutral for untracked zones', () => {
        expect(getZoneAlignment('the Swanfleet')).toBe('neutral');
        expect(getZoneAlignment('')).toBe('neutral');
    });

    it('returns the ember profile for the active zone alignment', () => {
        expect(getZoneEmberColor('Rivendell').hue).toBe(132);
        expect(getZoneEmberColor('the Troll Warrens').hue).toBe(0);
    });
});
