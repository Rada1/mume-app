/** @file inlineActionColors.test.ts — User color choices outrank category defaults. */
import { describe, expect, it } from 'vitest';
import { getInlineGlowColor } from './inlineActionModel';

// --- Logic Section ---
describe('inline entity colors', () => {
    it('uses a selected global color for who-list players', () => {
        expect(getInlineGlowColor('cat-ally-remote', [], { ally: '#36a6e8' })).toBe('#36a6e8');
    });

    it('uses a category choice ahead of the global object color', () => {
        expect(getInlineGlowColor('cat-worn-object', [
            { id: 'cat-worn-object', kind: 'object', color: '#bb66dd' }
        ], { object: '#c9a84c' })).toBe('#bb66dd');
    });
});
