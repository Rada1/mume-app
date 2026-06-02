/**
 * @file occupantKeywordUtils.test.ts
 * @description Tests command keyword extraction for GMCP occupants.
 */

import { describe, expect, it } from 'vitest';
import { getOccupantCommandKeyword } from '../occupantKeywordUtils';

describe('getOccupantCommandKeyword', () => {
    it('uses the final meaningful word for normal NPC command keywords', () => {
        expect(getOccupantCommandKeyword({ type: 'npc', name: 'pack horse' })).toBe('horse');
        expect(getOccupantCommandKeyword({ type: 'npc', name: 'a man' })).toBe('man');
        expect(getOccupantCommandKeyword({ type: 'npc', name: 'a-man' })).toBe('man');
    });

    it('uses first meaningful capitalized word for enemies and preserves markers', () => {
        expect(getOccupantCommandKeyword({ type: 'enemy', name: '*an Orc*' })).toBe('*Orc*');
        expect(getOccupantCommandKeyword({ type: 'enemy', name: '*Brolg the dreadful Orc*' })).toBe('*Brolg*');
    });

    it('uses first meaningful capitalized word for neutrals and preserves markers', () => {
        expect(getOccupantCommandKeyword({ type: 'neutral', name: '-an Orc-' })).toBe('-Orc-');
    });
});
