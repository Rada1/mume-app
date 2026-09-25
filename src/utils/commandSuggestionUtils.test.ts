import { describe, it, expect } from 'vitest';
import {
    replaceCommandArgumentToken,
    suggestionHotkeyForIndex
} from './commandSuggestionUtils';
import { getMumeCommandMatch } from './mumeCommandCatalog';

describe('commandSuggestionUtils', () => {
    describe('suggestionHotkeyForIndex', () => {
        it('maps index 0 to hotkey 1 and index 8 to hotkey 9', () => {
            expect(suggestionHotkeyForIndex(0)).toBe('1');
            expect(suggestionHotkeyForIndex(8)).toBe('9');
            expect(suggestionHotkeyForIndex(9)).toBe('0');
            expect(suggestionHotkeyForIndex(10)).toBeNull();
        });
    });

    describe('replaceCommandArgumentToken', () => {
        it('replaces target argument in command string', () => {
            expect(replaceCommandArgumentToken('kill or', 'orc')).toBe('kill orc ');
            expect(replaceCommandArgumentToken('examine ch', 'chest')).toBe('examine chest ');
        });

        it('appends target argument if none was typed yet', () => {
            expect(replaceCommandArgumentToken('kill ', 'troll')).toBe('kill troll ');
        });
    });

    describe('getMumeCommandMatch prediction', () => {
        it('predicts full command for single-letter prefixes', () => {
            const matchL = getMumeCommandMatch('l');
            expect(matchL.entry?.full).toBe('look');
            expect(matchL.isValid).toBe(true);

            const matchK = getMumeCommandMatch('k');
            expect(matchK.entry?.full).toBe('kill');
            expect(matchK.isValid).toBe(true);

            const matchSc = getMumeCommandMatch('sc');
            expect(matchSc.entry?.full).toBe('score');
            expect(matchSc.isValid).toBe(true);
        });

        it('recognizes valid execution for minimum prefixes', () => {
            const matchEx = getMumeCommandMatch('ex');
            expect(matchEx.entry?.full).toBe('exits');
            expect(matchEx.isValid).toBe(true);
        });
    });
});
