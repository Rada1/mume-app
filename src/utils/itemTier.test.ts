/**
 * @file itemTier.test.ts
 * @description Unit coverage for MUME equipment tier classification.
 */

import { describe, expect, it } from 'vitest';
import { classifyItemTier } from './itemTier';

describe('classifyItemTier', () => {
    it('classifies artifact, legendary, focus, and usable item names', () => {
        expect(classifyItemTier('the black sword').tier).toBe('artifact');
        expect(classifyItemTier('a pitch-black robe').tier).toBe('legendary');
        expect(classifyItemTier('an iron sapphire ring').tier).toBe('focus');
        expect(classifyItemTier('a rough wooden horn').tier).toBe('usable');
    });

    it('classifies server-tagged noun phrases without their leading article', () => {
        expect(classifyItemTier('yew longbow').tier).toBe('good');
        expect(classifyItemTier('pitch-black robe').tier).toBe('legendary');
    });

    it('normalizes tags, accents, and item state markers', () => {
        expect(classifyItemTier('<wielded> a Dúnadan blade (well-maintained)')).toMatchObject({
            tier: 'important',
            state: 'stable',
        });
    });

    it('prefers the strongest listed tier when an item appears in multiple groups', () => {
        expect(classifyItemTier('a pale blue stone').tier).toBe('important');
    });
});
