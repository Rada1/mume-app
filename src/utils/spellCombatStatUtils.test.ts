/** @file spellCombatStatUtils.test.ts */
import { describe, expect, it } from 'vitest';
import { changesCombatStatsFromSpell } from './spellCombatStatUtils';

describe('changesCombatStatsFromSpell', () => {
    it.each([
        'You begin to feel the light of Aman shine upon you.',
        'You feel less blessed.',
        'The light of Aman fades away from you.',
        'A blue transparent wall slowly appears around you.',
        'A blue transparent shield appears around you.',
        'Your armour spell wears off.',
        'You feel protected.',
        'Shield spell wears off.',
        'You are surrounded by a misty shroud.',
        'Your misty shroud slowly fades.',
        'You feel more exposed.',
    ])('refreshes stats for %s', line => expect(changesCombatStatsFromSpell(line)).toBe(true));

    it('does not refresh for unrelated spell text', () => {
        expect(changesCombatStatsFromSpell('You start to concentrate...')).toBe(false);
    });
});
