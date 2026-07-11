/**
 * @file mumeCommandCatalog.test.ts
 * @description Tests MUME command abbreviation matching for command-bar suggestions.
 */

import { describe, expect, it } from 'vitest';
import { getMumeCommandMatch, replaceMumeCommandToken } from '../mumeCommandCatalog';

// --- Test Section ---

describe('mumeCommandCatalog', () => {
    it('matches minimum abbreviations and full command prefixes', () => {
        expect(getMumeCommandMatch('l').entry?.full).toBe('look');
        expect(getMumeCommandMatch('loo').entry?.full).toBe('look');
        expect(getMumeCommandMatch('look orc').entry?.full).toBe('look');
    });

    it('keeps possible completions visible while marking the executable command', () => {
        const match = getMumeCommandMatch('h');

        expect(match.entry?.full).toBe('hide');
        expect(match.suggestions.map(entry => entry.full)).toEqual([
            'hide',
            'hang',
            'help',
            'herblores',
            'hiccup',
            'hints',
            'history',
            'hit'
        ]);
    });

    it('rejects text that is not a MUME command prefix', () => {
        expect(getMumeCommandMatch('xx hello').isValid).toBe(false);
        expect(getMumeCommandMatch('assist').isValid).toBe(true);
    });

    it('supports punctuation commands exactly', () => {
        expect(getMumeCommandMatch('!').entry?.full).toBe('!');
        expect(getMumeCommandMatch('? help').entry?.full).toBe('?');
    });

    it('replaces only the command token when a suggestion is chosen', () => {
        const match = getMumeCommandMatch('exa chest');
        expect(match.entry?.full).toBe('examine');
        expect(match.entry ? replaceMumeCommandToken('exa chest', match.entry) : '').toBe('examine chest');
    });
});
