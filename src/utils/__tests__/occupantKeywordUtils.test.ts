/**
 * @file occupantKeywordUtils.test.ts
 * @description Tests command keyword extraction for GMCP occupants.
 */

import { describe, expect, it } from 'vitest';
import { getOccupantCommandKeyword } from '../occupantKeywordUtils';

describe('getOccupantCommandKeyword', () => {
    it('keeps NPC keywords hyphenated from the full GMCP name', () => {
        expect(getOccupantCommandKeyword({ type: 'npc', name: 'pack horse' })).toBe('pack-horse');
    });

    it('uses first meaningful capitalized word for enemies and preserves markers', () => {
        expect(getOccupantCommandKeyword({ type: 'enemy', name: '*an Orc*' })).toBe('*Orc*');
        expect(getOccupantCommandKeyword({ type: 'enemy', name: '*Brolg the dreadful Orc*' })).toBe('*Brolg*');
    });

    it('uses first meaningful capitalized word for neutrals and preserves markers', () => {
        expect(getOccupantCommandKeyword({ type: 'neutral', name: '-an Orc-' })).toBe('-Orc-');
    });
});
