/**
 * @file affectUtils.test.ts
 * @description Regression tests for MUME affect list parsing.
 */

import { describe, expect, it } from 'vitest';
import { getAffectChipTone, parseAffectedByLines } from '../affectUtils';

describe('parseAffectedByLines', () => {
    it('extracts affect names from info %f output', () => {
        expect(parseAffectedByLines([
            { text: 'Affected by:' },
            { text: '- bless' },
            { text: '- panic' }
        ])).toEqual(['bless', 'panic']);
    });

    it('returns an empty list when the section is present without affects', () => {
        expect(parseAffectedByLines([
            { text: 'Affected by:' },
            { text: '' }
        ])).toEqual([]);
    });

    it('ignores unrelated info output', () => {
        expect(parseAffectedByLines([
            { text: 'You are a level 104 Half-elf.' }
        ])).toBeNull();
    });
});

describe('getAffectChipTone', () => {
    it('colors spell-like affects purple', () => {
        expect(getAffectChipTone('bless')).toBe('magic');
        expect(getAffectChipTone('detect evil')).toBe('magic');
        expect(getAffectChipTone('stored lightning')).toBe('magic');
        expect(getAffectChipTone('strength')).toBe('magic');
    });

    it('colors herblore affects green except strength', () => {
        expect(getAffectChipTone('heightened-senses')).toBe('herblore');
        expect(getAffectChipTone('skillful oil')).toBe('herblore');
        expect(getAffectChipTone('travelling')).toBe('herblore');
    });

    it('colors poison affects red', () => {
        expect(getAffectChipTone('arachnia')).toBe('poison');
        expect(getAffectChipTone('drake-slumber')).toBe('poison');
        expect(getAffectChipTone('poison')).toBe('poison');
    });
});
