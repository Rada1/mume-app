/**
 * @file practiceClassCatalog.test.ts
 * @description Verifies canonical MUME practice class lookup.
 */

import { describe, expect, it } from 'vitest';
import { getPracticeClassKey, getPracticeClassLabel } from '../practiceClassCatalog';

// --- Logic Section ---

describe('practiceClassCatalog', () => {
    it('maps guild skills without a class column to their canonical class', () => {
        expect(getPracticeClassKey('Bash')).toBe('warrior');
        expect(getPracticeClassKey('Cleaving weapons')).toBe('warrior');
        expect(getPracticeClassKey('Piercing Weapons')).toBe('thief');
        expect(getPracticeClassKey('Dark Oath (*)')).toBe('ranger');
    });

    it('maps mage and cleric spells', () => {
        expect(getPracticeClassLabel('Magic Missile')).toBe('Mage');
        expect(getPracticeClassLabel('Cure Light')).toBe('Cleric');
        expect(getPracticeClassLabel('Protection from Evil')).toBe('Cleric');
    });
});

