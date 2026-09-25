/** @file spellSuggestionUtils.test.ts */
import { describe, expect, it } from 'vitest';
import { getCastSpellSuggestions, getRecentCastSpells, replaceCastSpellArgument } from './spellSuggestionUtils';

describe('cast spell suggestions', () => {
    it('uses learned spells and narrows them by the typed fragment', () => {
        const suggestions = getCastSpellSuggestions('cast sh', { shroud: 75, shield: 60 }, 'mage');
        expect(suggestions.map(suggestion => suggestion.value)).toEqual(['Shroud', 'Shield']);
    });

    it('falls back to the character class catalog and inserts quoted spells', () => {
        expect(getCastSpellSuggestions('c ', {}, 'cleric')[0].value).toBe('Cure Light');
        expect(replaceCastSpellArgument(' c sh', 'Shroud')).toBe(" c 'shroud'");
    });

    it('puts most recently used matching spells first', () => {
        const recent = getRecentCastSpells(["cast 'shield'", "cast 'shroud'", "cast 'shield'"]);
        expect(recent).toEqual(['shield', 'shroud']);
        expect(getCastSpellSuggestions('cast sh', { shroud: 75, shield: 60 }, 'mage', 10, recent)
            .map(suggestion => suggestion.value))
            .toEqual(['Shield', 'Shroud']);
    });
});
