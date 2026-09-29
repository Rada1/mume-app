/**
 * @file playerCountUtils.test.ts
 * @description Unit tests for parsePlayerCountFromLines and getOnlinePlayerCount.
 */

import { describe, it, expect } from 'vitest';
import { parsePlayerCountFromLines, getOnlinePlayerCount } from './playerCountUtils';
import { DrawerLine } from '../types';

const makeLine = (id: string, text: string, isHeader: boolean): DrawerLine => ({ id, text, html: text, isHeader });

describe('playerCountUtils', () => {
    describe('parsePlayerCountFromLines', () => {
        it('returns 0 for empty or undefined lines', () => {
            expect(parsePlayerCountFromLines([])).toBe(0);
            expect(parsePlayerCountFromLines(undefined as any)).toBe(0);
        });

        it('parses server summary with "X players on."', () => {
            const lines: DrawerLine[] = [
                makeLine('1', 'Players', true),
                makeLine('2', '-------', true),
                makeLine('3', '*[Mw] Ellessar (iMw)', false),
                makeLine('4', 'Sirgrög the Man Soldier', false),
                makeLine('5', '28 players on.', false)
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(28);
        });

        it('parses single player summary "1 player on."', () => {
            const lines: DrawerLine[] = [
                makeLine('1', 'Minions', true),
                makeLine('2', 'Mozgus the Inhuman', false),
                makeLine('3', '1 player on.', false)
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(1);
        });

        it('parses "visible players in the world: X"', () => {
            const lines: DrawerLine[] = [
                makeLine('1', 'Visible players in the world: 17', true)
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(17);
        });

        it('falls back to non-header player lines when no summary exists', () => {
            const lines: DrawerLine[] = [
                makeLine('1', 'Players in the world:', true),
                makeLine('2', '---------------------', true),
                makeLine('3', 'Ellessar', false),
                makeLine('4', 'Legolas', false),
                makeLine('5', 'Gimli', false)
            ];
            expect(parsePlayerCountFromLines(lines)).toBe(3);
        });
    });

    describe('getOnlinePlayerCount', () => {
        it('prefers parsed count from whoLines if available', () => {
            const whoLines: DrawerLine[] = [
                makeLine('1', 'Ellessar', false),
                makeLine('2', '28 players on.', false)
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
