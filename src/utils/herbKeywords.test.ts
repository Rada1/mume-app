/** @file herbKeywords.test.ts — Verifies listed MUME herbs resolve to the Herb trait. */

// --- Test Section ---
import { describe, expect, it } from 'vitest';
import { getTraitsForName } from './inlineActionModel';
import { HERB_DESCRIPTIVE_KEYWORDS, MUME_HERB_KEYWORDS } from './herbKeywords';

describe('MUME herb trait keywords', () => {
    it.each(MUME_HERB_KEYWORDS)('matches listed herb name "%s"', keyword => {
        expect(getTraitsForName(keyword).map(trait => trait.id)).toContain('trait-herb');
    });

    it.each(HERB_DESCRIPTIVE_KEYWORDS)('matches descriptive keyword "%s"', keyword => {
        expect(getTraitsForName(keyword).map(trait => trait.id)).toContain('trait-herb');
    });
});
