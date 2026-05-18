/**
 * @file playerLineTokens.test.ts
 * @description Regression tests for who/where player row tokenization.
 */

import { describe, expect, it } from 'vitest';
import { buildPlayerLineTokens } from '../playerLineTokens';

// --- Logic Section ---
const getEntityContents = (text: string) =>
    (buildPlayerLineTokens(text) || [])
        .filter(token => token.type === 'entity')
        .map(token => token.content);

describe('buildPlayerLineTokens', () => {
    it('does not treat separator dashes as a player name', () => {
        expect(buildPlayerLineTokens('-----')).toBeNull();
    });

    it('still supports hyphenated player names', () => {
        expect(getEntityContents('Star-Friend the Elf Adventurer')).toEqual(['Star-Friend']);
    });
});
