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

/** Returns unique cast spells from newest to oldest command history entry. */
export const getRecentCastSpells = (history: string[]): string[] => {
    const recent: string[] = [];
    const seen = new Set<string>();
    for (const command of [...history].reverse()) {
        const match = command.match(/^\s*(?:cast|c)\s+['"]([^'"]+)['"]/i);
        const spell = match?.[1]?.trim();
        if (!spell || seen.has(spell.toLowerCase())) continue;
        seen.add(spell.toLowerCase());
        recent.push(spell);
    }
    return recent;
};

export const getCastSpellFragment = (input: string): string | null => {
    const match = input.match(/^\s*(?:cast|c)\s+['"]?([^'"]*)$/i);
    return match ? match[1].trim().toLowerCase() : null;
};

export const getCastSpellSuggestions = (
    input: string,
    abilities: Record<string, number>,
    characterClass: string,
    limit = 10,
    recentSpells: string[] = []
): SpellSuggestion[] => {
    const fragment = getCastSpellFragment(input);
    if (fragment === null) return [];
    const known = allSpells.filter(spell => (abilities[spell.toLowerCase()] || 0) > 0);
    const fallback = characterClass === 'mage' ? MAGE_SPELLS : characterClass === 'cleric' ? CLERIC_SPELLS : [];
    const candidates = known.length > 0 ? known : fallback;
    const recentRanks = new Map(recentSpells.map((spell, index) => [spell.toLowerCase(), index]));
    return candidates
        .filter(spell => !fragment || spell.toLowerCase().startsWith(fragment))
        .sort((a, b) => {
            const aRank = recentRanks.get(a.toLowerCase());
            const bRank = recentRanks.get(b.toLowerCase());
            if (aRank !== undefined || bRank !== undefined) return (aRank ?? Infinity) - (bRank ?? Infinity);
            return 0;
        })
        .slice(0, limit)
        .map(spell => ({ key: spell.toLowerCase(), label: spell, value: spell, meta: 'spell' }));
};

export const replaceCastSpellArgument = (input: string, spell: string) => {
    const prefix = input.match(/^\s*(?:cast|c)\s*/i)?.[0] ?? 'cast ';
    return `${prefix}'${spell.toLowerCase()}'`;
};
