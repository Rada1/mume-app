/**
 * @file inlineCategoryAxes.test.ts
 * @description Category-derived inline action facts.
 */

import { describe, expect, it } from 'vitest';
import { getInlineCategoryAxes, normalizeInlineCategoryId } from '../inlineCategoryAxes';

// --- Logic Section ---

describe('inlineCategoryAxes', () => {
    it('derives room ally facts from category alone', () => {
        expect(getInlineCategoryAxes('cat-ally')).toMatchObject({
            categoryId: 'cat-ally',
            family: 'character',
            location: 'room',
            isCharacter: true,
            isTargetable: true,
        });
    });

    it('derives remote ally facts without needing a separate location field', () => {
        expect(getInlineCategoryAxes('cat-ally-remote')).toMatchObject({
            categoryId: 'cat-ally-remote',
            family: 'character',
            location: 'none',
            isCharacter: true,
        });
    });

    it('normalizes legacy inventory set ids to canonical categories', () => {
        expect(normalizeInlineCategoryId('inventorylist')).toBe('cat-inventory-object');
        expect(getInlineCategoryAxes('inventorylist')).toMatchObject({
            family: 'object',
            location: 'carried',
        });
    });

    it('normalizes legacy player drawer ids to remote ally category', () => {
        expect(normalizeInlineCategoryId('inline-player')).toBe('cat-ally-remote');
    });
});
