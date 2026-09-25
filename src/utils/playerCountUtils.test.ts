/**
 * @file playerCountUtils.test.ts
 * @description Unit tests for parsePlayerCountFromLines and getOnlinePlayerCount.
 */

import { describe, it, expect } from 'vitest';
import { parsePlayerCountFromLines, getOnlinePlayerCount } from './playerCountUtils';
import { DrawerLine } from '../types';

describe('playerCountUtils', () => {
    describe('parsePlayerCountFromLines', () => {
        it('returns 0 for empty or undefined lines', () => {
            expect(parsePlayerCountFromLines([])).toBe(0);
            expect(parsePlayerCountFromLines(undefined as any)).toBe(0);
        });

        it('parses server summary with "X players on."', () => {
            const lines: DrawerLine[] = [
                { id: '1', text: 'Players', isHeader: true },
                { id: '2', text: '-------', isHeader: true },
                { id: '3', text: '*[Mw] Ellessar (iMw)', isHeader: false },
                { id: '4', text: 'Sirgrög the Man Soldier', isHeader: false },
                { id: '5', text: '28 players on.', isHeader: false }
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(28);
        });

        it('parses single player summary "1 player on."', () => {
            const lines: DrawerLine[] = [
                { id: '1', text: 'Minions', isHeader: true },
                { id: '2', text: 'Mozgus the Inhuman', isHeader: false },
                { id: '3', text: '1 player on.', isHeader: false }
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(1);
        });

        it('parses "visible players in the world: X"', () => {
            const lines: DrawerLine[] = [
                { id: '1', text: 'Visible players in the world: 17', isHeader: true }
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(17);
        });

        it('falls back to non-header player lines when no summary exists', () => {
            const lines: DrawerLine[] = [
                { id: '1', text: 'Players in the world:', isHeader: true },
                { id: '2', text: '---------------------', isHeader: true },
                { id: '3', text: 'Ellessar', isHeader: false },
                { id: '4', text: 'Legolas', isHeader: false },
                { id: '5', text: 'Gimli', isHeader: false }
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(3);
        });
    });

    describe('getOnlinePlayerCount', () => {
        it('prefers parsed count from whoLines if available', () => {
            const whoLines: DrawerLine[] = [
                { id: '1', text: 'Ellessar', isHeader: false },
                { id: '2', text: '28 players on.', isHeader: false }
            ];
            const whoList = ['Ellessar'];
            expect(getOnlinePlayerCount(whoList, whoLines)).toBe(28);
        });

        it('falls back to whoList when whoLines is empty', () => {
            const whoList = ['Ellessar', 'Legolas', 'Gimli'];
            expect(getOnlinePlayerCount(whoList, [])).toBe(3);
        });

        it('returns 0 when neither whoLines nor whoList are provided', () => {
            expect(getOnlinePlayerCount([], [])).toBe(0);
            expect(getOnlinePlayerCount(undefined, undefined)).toBe(0);
        });
    });
});
