/**
 * @file effectTimerParser.test.ts
 * @description Verifies command and text parsing for automatic effect timers.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { parseEffectTimerLine, recordEffectTimerCommand } from './effectTimerParser';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';

// --- Logic Section ---

const resetTimers = () => {
    useEffectTimerStore.setState({
        timers: [],
        timersByCharacter: {},
        currentCharacter: null,
    });
};

const timers = () => useEffectTimerStore.getState().timers;

describe('effectTimerParser', () => {
    beforeEach(() => {
        resetTimers();
    });

    it('starts bless from outgoing cast commands', () => {
        recordEffectTimerCommand("cast 'bless'");

        expect(timers()).toHaveLength(1);
        expect(timers()[0]).toMatchObject({
            catalogId: 'spell-bless',
            name: 'Bless',
            source: 'command',
        });
    });

    it('starts bless from unquoted and cleric-style commands', () => {
        recordEffectTimerCommand('cast bless');
        recordEffectTimerCommand("commune 'bless'");

        expect(timers()).toHaveLength(1);
        expect(timers()[0].catalogId).toBe('spell-bless');
        expect(timers()[0].source).toBe('command');
    });

    it('starts bless from confirmation text', () => {
        expect(parseEffectTimerLine('You feel righteous.')).toBe(true);

        expect(timers()).toHaveLength(1);
        expect(timers()[0]).toMatchObject({
            catalogId: 'spell-bless',
            source: 'parser',
        });
    });

    it('starts bless and armour from current MUME success text', () => {
        expect(parseEffectTimerLine('You feel a renewed light shine upon you.')).toBe(true);
        expect(parseEffectTimerLine('Your magic armour is revitalised.')).toBe(true);

        expect(timers().map(timer => timer.catalogId)).toEqual(['spell-armour', 'spell-bless']);
    });

    it('removes a recent command timer when the spell fails', () => {
        recordEffectTimerCommand("cast 'bless'");
        expect(timers()).toHaveLength(1);

        expect(parseEffectTimerLine('You lost your concentration.')).toBe(false);

        expect(timers()).toHaveLength(0);
    });
});
