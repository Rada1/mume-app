/**
 * @file spellSuggestionUtils.ts
 * @description Provides learned-spell candidates for cast command completion.
 */

// --- Logic Section ---
import { CLERIC_SPELLS, MAGE_SPELLS } from './spellLists';

export interface SpellSuggestion {
    key: string;
    label: string;
    value: string;
    meta: string;
}

const allSpells = Array.from(new Set([...MAGE_SPELLS, ...CLERIC_SPELLS]));

export const getCastSpellFragment = (input: string): string | null => {
    const match = input.match(/^\s*(?:cast|c)\s+['"]?([^'"]*)$/i);
    return match ? match[1].trim().toLowerCase() : null;
};

export const getCastSpellSuggestions = (
    input: string,
    abilities: Record<string, number>,
    characterClass: string,
    limit = 10
): SpellSuggestion[] => {
    const fragment = getCastSpellFragment(input);
    if (fragment === null) return [];
    const known = allSpells.filter(spell => (abilities[spell.toLowerCase()] || 0) > 0);
    const fallback = characterClass === 'mage' ? MAGE_SPELLS : characterClass === 'cleric' ? CLERIC_SPELLS : [];
    const candidates = known.length > 0 ? known : fallback;
    return candidates
        .filter(spell => !fragment || spell.toLowerCase().startsWith(fragment))
        .slice(0, limit)
        .map(spell => ({ key: spell.toLowerCase(), label: spell, value: spell, meta: 'spell' }));
};

export const replaceCastSpellArgument = (input: string, spell: string) => {
    const prefix = input.match(/^\s*(?:cast|c)\s*/i)?.[0] ?? 'cast ';
    return `${prefix}'${spell.toLowerCase()}'`;
};
