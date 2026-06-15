/**
 * @file shaperZoneInfoDiscovery.test.ts
 * @description Tests parsing Shaper zone info keyword list output.
 */

import { describe, expect, it } from 'vitest';
import { parseShaperZoneInfoKeywords } from '../shaperZoneInfoDiscovery';

// --- Test Section ---
describe('parseShaperZoneInfoKeywords', () => {
    it('extracts keyword names from simple list output', () => {
        expect(parseShaperZoneInfoKeywords(`
Keyword
=======
asciimap
history
map
`)).toEqual(['asciimap', 'history', 'map']);
    });

    it('deduplicates and ignores common list noise', () => {
        expect(parseShaperZoneInfoKeywords(`
Available zone info keywords:
asciimap  history
asciimap
`)).toEqual(['asciimap', 'history']);
    });

    it('does not treat description words as keywords', () => {
        expect(parseShaperZoneInfoKeywords(`
asciimap - ASCII map for builders
history: Zone history notes
`)).toEqual(['asciimap', 'history']);
    });
});
