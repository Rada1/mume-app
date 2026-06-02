/**
 * @file occupantKeywordUtils.ts
 * @description Builds MUME command keywords for GMCP room occupants.
 */

import type { GmcpOccupant } from '../types';
import { extractMumeKeyword } from './keywordUtils';

// --- Logic Section ---

const LOW_VALUE_WORDS = new Set(['a', 'an', 'the', 'some']);

const stripOuterMarkers = (value: string): string => (
    value.trim().replace(/^[*-]+|[*-]+$/g, '').trim()
);

const normalizeCommandKeyword = (value: string | undefined): string => (
    extractMumeKeyword(value || '').replace(/\s+/g, '-').toLowerCase()
);

const getEnemyNeutralWord = (value: string): string => {
    const clean = stripOuterMarkers(value);
    const capitalized = clean.match(/\b[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’-]*/g) || [];
    const chosen = capitalized.find(word => !LOW_VALUE_WORDS.has(word.toLowerCase()));
    if (chosen) return chosen;

    const words = clean.split(/\s+/).filter(word => word && !LOW_VALUE_WORDS.has(word.toLowerCase()));
    return words[words.length - 1] || clean;
};

export const getOccupantCommandKeyword = (
    occupant: Pick<GmcpOccupant, 'type' | 'name' | 'keyword' | 'short' | 'shortdesc'>,
    fallback: string = ''
): string => {
    const source = occupant.name || occupant.keyword || occupant.short || occupant.shortdesc || fallback;
    const type = typeof occupant.type === 'string' ? occupant.type.toLowerCase() : '';

    if (type === 'enemy' || type === 'neutral') {
        const marker = type === 'enemy' ? '*' : '-';
        const word = getEnemyNeutralWord(source);
        return `${marker}${word}${marker}`;
    }

    return normalizeCommandKeyword(source);
};
