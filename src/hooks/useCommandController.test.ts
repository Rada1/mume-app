// @vitest-environment jsdom
/**
 * @file useCommandController.test.ts
 * @description Unit tests for command classification helpers in useCommandController.
 */

import { describe, it, expect } from 'vitest';
import { isLookCommand, isWhoCommand, isEqOrInvCommand } from './useCommandController';

describe('useCommandController command helpers', () => {
    describe('isLookCommand', () => {
        it('matches standard look commands and abbreviations', () => {
            expect(isLookCommand('look')).toBe(true);
            expect(isLookCommand('l')).toBe(true);
            expect(isLookCommand('loo')).toBe(true);
            expect(isLookCommand('lo')).toBe(true);
            expect(isLookCommand('look at sword')).toBe(true);
            expect(isLookCommand('l corpse')).toBe(true);
            expect(isLookCommand('stand; look')).toBe(true);
            expect(isLookCommand('rest; l')).toBe(true);
        });

        it('matches examine commands and abbreviations', () => {
            expect(isLookCommand('examine')).toBe(true);
            expect(isLookCommand('examin')).toBe(true);
            expect(isLookCommand('exami')).toBe(true);
            expect(isLookCommand('exam')).toBe(true);
            expect(isLookCommand('exa')).toBe(true);
            expect(isLookCommand('ex')).toBe(true);
            expect(isLookCommand('examine sword')).toBe(true);
            expect(isLookCommand('ex corpse')).toBe(true);
            expect(isLookCommand('stand; examine')).toBe(true);
            expect(isLookCommand('rest; ex ring')).toBe(true);
        });

        it('rejects non-look and non-examine commands', () => {
            expect(isLookCommand('')).toBe(false);
            expect(isLookCommand('kill')).toBe(false);
            expect(isLookCommand('loot')).toBe(false);
            expect(isLookCommand('lock door')).toBe(false);
            expect(isLookCommand('exits')).toBe(false);
            expect(isLookCommand('exit')).toBe(false);
            expect(isLookCommand('execute')).toBe(false);
        });
    });

    describe('isWhoCommand', () => {
        it('matches who commands and abbreviations', () => {
            expect(isWhoCommand('who')).toBe(true);
            expect(isWhoCommand('wh')).toBe(true);
            expect(isWhoCommand('who pk')).toBe(true);
            expect(isWhoCommand('who 10 20')).toBe(true);
            expect(isWhoCommand('stand; who')).toBe(true);
        });

        it('matches score commands and abbreviations', () => {
            expect(isWhoCommand('score')).toBe(true);
            expect(isWhoCommand('sc')).toBe(true);
            expect(isWhoCommand('sco')).toBe(true);
            expect(isWhoCommand('scor')).toBe(true);
            expect(isWhoCommand('stand; sc')).toBe(true);
        });

        it('matches stat commands and abbreviations', () => {
            expect(isWhoCommand('stat')).toBe(true);
            expect(isWhoCommand('stats')).toBe(true);
            expect(isWhoCommand('status')).toBe(true);
            expect(isWhoCommand('st')).toBe(true);
            expect(isWhoCommand('stat troll')).toBe(true);
            expect(isWhoCommand('stand; stat')).toBe(true);
        });

        it('matches information commands and abbreviations', () => {
            expect(isWhoCommand('information')).toBe(true);
            expect(isWhoCommand('info')).toBe(true);
            expect(isWhoCommand('inf')).toBe(true);
            expect(isWhoCommand('info %O %D')).toBe(true);
            expect(isWhoCommand('stand; info')).toBe(true);
        });

        it('matches where commands and abbreviations', () => {
            expect(isWhoCommand('where')).toBe(true);
            expect(isWhoCommand('whe')).toBe(true);
            expect(isWhoCommand('wher')).toBe(true);
            expect(isWhoCommand('where orc')).toBe(true);
            expect(isWhoCommand('stand; where')).toBe(true);
        });

        it('rejects unrelated commands', () => {
            expect(isWhoCommand('')).toBe(false);
            expect(isWhoCommand('west')).toBe(false);
            expect(isWhoCommand('w')).toBe(false);
            expect(isWhoCommand('wield sword')).toBe(false);
            expect(isWhoCommand('whisper hello')).toBe(false);
            expect(isWhoCommand('stand')).toBe(false);
            expect(isWhoCommand('stab')).toBe(false);
            expect(isWhoCommand('scan')).toBe(false);
        });
    });

    describe('isEqOrInvCommand', () => {
        it('matches equipment commands', () => {
            expect(isEqOrInvCommand('equipment')).toBe(true);
            expect(isEqOrInvCommand('eq')).toBe(true);
            expect(isEqOrInvCommand('equip')).toBe(true);
            expect(isEqOrInvCommand('stand; eq')).toBe(true);
        });

        it('matches inventory commands', () => {
            expect(isEqOrInvCommand('inventory')).toBe(true);
            expect(isEqOrInvCommand('inv')).toBe(true);
            expect(isEqOrInvCommand('i')).toBe(true);
            expect(isEqOrInvCommand('stand; inv')).toBe(true);
            expect(isEqOrInvCommand('look; i')).toBe(true);
        });

        it('rejects non-equipment and non-inventory commands', () => {
            expect(isEqOrInvCommand('')).toBe(false);
            expect(isEqOrInvCommand('info')).toBe(false);
            expect(isEqOrInvCommand('identify')).toBe(false);
            expect(isEqOrInvCommand('id sword')).toBe(false);
            expect(isEqOrInvCommand('eat bread')).toBe(false);
            expect(isEqOrInvCommand('enter gate')).toBe(false);
        });
    });
});
