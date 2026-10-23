/** @file inlineCategoryAxes.test.ts — Checks semantic entity highlight categories. */
import { describe, expect, it } from 'vitest';
import { canSetTargetChipFromCategory, getEntityHighlightKind } from './inlineCategoryAxes';

// --- Test Section ---
describe('getEntityHighlightKind', () => {
    it.each([
        ['cat-room-object', 'object'],
        ['cat-inventory-object', 'object'],
        ['cat-room', 'room'],
        ['cat-npc', 'enemy'],
        ['cat-enemy', 'enemy'],
        ['cat-ally', 'ally'],
        ['cat-ally-remote', 'ally'],
        ['cat-mount', 'ally'],
        [undefined, 'other'],
    ] as const)('maps %s to %s', (category, expected) => {
        expect(getEntityHighlightKind(category)).toBe(expected);
    });
});

describe('canSetTargetChipFromCategory', () => {
    it.each([
        ['cat-npc', true],
        ['npc', true],
        ['cat-enemy', true],
        ['enemy', true],
        ['cat-ally', false],
        ['cat-neutral', false],
        ['cat-mount', false],
        ['cat-room-object', false],
        [undefined, false],
    ] as const)('returns %s eligibility as %s', (category, expected) => {
        expect(canSetTargetChipFromCategory(category)).toBe(expected);
    });
});
