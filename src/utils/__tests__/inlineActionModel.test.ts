/**
 * @file inlineActionModel.test.ts
 * @description Color resolution coverage for inline action categories.
 */

import { describe, expect, it } from 'vitest';
import { getInlineGlowColor } from '../inlineActionModel';
import { CategoryOverride } from '../../types';

// --- Logic Section ---

describe('getInlineGlowColor', () => {
    it('uses the room player color for in-room ally category', () => {
        expect(getInlineGlowColor('cat-ally', [], { player: '#89CFF0' })).toBe('#89CFF0');
    });

    it('keeps the remote ally category color separate from room player color', () => {
        expect(getInlineGlowColor('cat-ally-remote', [], { player: '#89CFF0' })).toBe('#22c55e');
    });

    it('lets category overrides beat the room player color', () => {
        const overrides: CategoryOverride[] = [{ id: 'cat-ally', kind: 'player', color: '#123456' }];

        expect(getInlineGlowColor('cat-ally', overrides, { player: '#89CFF0' })).toBe('#123456');
    });
});
