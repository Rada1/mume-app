/**
 * @file keywordUtils.test.ts
 * @description Regression tests for MUME object keyword extraction.
 */

import { describe, expect, it } from 'vitest';
import { extractMumeKeyword } from '../keywordUtils';

describe('extractMumeKeyword', () => {
    it('uses the final object word as the command keyword', () => {
        expect(extractMumeKeyword('brown leather pants')).toBe('pants');
        expect(extractMumeKeyword('brown-leather-pants')).toBe('pants');
        expect(extractMumeKeyword('an old black bottle')).toBe('bottle');
        expect(extractMumeKeyword('a belt of pearls and crystals')).toBe('crystals');
    });
});
