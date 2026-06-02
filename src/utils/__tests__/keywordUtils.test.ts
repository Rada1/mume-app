/**
 * @file keywordUtils.test.ts
 * @description Regression tests for MUME object keyword extraction.
 */

import { describe, expect, it } from 'vitest';
import { extractMumeKeyword, formatMumeTarget } from '../keywordUtils';

describe('extractMumeKeyword', () => {
    it('uses the final object word as the command keyword', () => {
        expect(extractMumeKeyword('brown leather pants')).toBe('pants');
        expect(extractMumeKeyword('brown-leather-pants')).toBe('pants');
        expect(extractMumeKeyword('an old black bottle')).toBe('bottle');
        expect(extractMumeKeyword('a belt of pearls and crystals')).toBe('crystals');
    });
});

describe('formatMumeTarget', () => {
    it('uses the final meaningful word for phrase-style menu targets', () => {
        expect(formatMumeTarget('a man')).toBe('man');
        expect(formatMumeTarget('a-man')).toBe('man');
        expect(formatMumeTarget('2.a-man')).toBe('2.man');
    });

    it('preserves marked combat targets', () => {
        expect(formatMumeTarget('*Orc*')).toBe('*Orc*');
        expect(formatMumeTarget('2.*Orc*')).toBe('2.*Orc*');
    });

    it('preserves explicit keyword exceptions', () => {
        expect(formatMumeTarget('small pouch')).toBe('small-pouch');
        expect(formatMumeTarget('2.small pouch')).toBe('2.small-pouch');
    });
});
