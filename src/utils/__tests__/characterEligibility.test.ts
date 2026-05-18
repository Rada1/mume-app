/**
 * @file characterEligibility.test.ts
 * @description Coverage for race and subrace button eligibility.
 */

import { describe, expect, it } from 'vitest';
import { CharacterInfo } from '../../types';
import { isButtonEligibleForCharacter } from '../characterEligibility';

// --- Test Data ---

const baseCharacter: CharacterInfo = {
    name: 'Ellessar',
    level: 1,
    xp: 0,
    xpMax: 0,
    tnl: 0,
    tp: 0,
    tpMax: 0,
    tpnl: 0,
    race: 'Man',
    subrace: 'Numenorean',
    subclass: '',
    class: 'Warrior',
    gold: 0
};

// --- Logic Section ---

describe('isButtonEligibleForCharacter', () => {
    it('allows buttons with no character requirement', () => {
        expect(isButtonEligibleForCharacter(undefined, baseCharacter)).toBe(true);
    });

    it('matches race and subrace requirements case-insensitively', () => {
        expect(isButtonEligibleForCharacter({
            race: ['man'],
            subrace: ['numenorean']
        }, baseCharacter)).toBe(true);
    });

    it('normalizes spaces, hyphens, and underscores in subrace names', () => {
        expect(isButtonEligibleForCharacter({
            subrace: ['black_numenorean']
        }, { ...baseCharacter, subrace: 'Black-Numenorean' })).toBe(true);
    });

    it('blocks buttons when the current subrace is not allowed', () => {
        expect(isButtonEligibleForCharacter({
            subrace: ['Beorning']
        }, baseCharacter)).toBe(false);
    });
});
