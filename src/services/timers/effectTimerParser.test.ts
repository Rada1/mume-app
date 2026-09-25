/** @file effectTimerParser.test.ts */
import { beforeEach, describe, expect, it } from 'vitest';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { getEndedEffectTimerEntry, parseEffectTimerLine, recordEffectTimerCommand } from './effectTimerParser';

describe('Shroud effect timer', () => {
    beforeEach(() => useEffectTimerStore.getState().clearAll());

    it('waits for the confirmed completion line before adding Shroud', () => {
        recordEffectTimerCommand("cast 'shroud'");
        expect(useEffectTimerStore.getState().timers).toHaveLength(0);

        parseEffectTimerLine('You start to concentrate...');
        expect(useEffectTimerStore.getState().timers).toHaveLength(0);

        parseEffectTimerLine('You are surrounded by a misty shroud.');
        expect(useEffectTimerStore.getState().timers.some(timer => timer.catalogId === 'spell-shroud')).toBe(true);
    });
});

describe('confirmed spell timers', () => {
    beforeEach(() => useEffectTimerStore.getState().clearAll());

    it.each([
        ["cast 'armour'", 'A blue transparent wall slowly appears around you.', 'spell-armour'],
        ["cast 'armour'", 'A blue transparent shield appears around you.', 'spell-armour'],
        ["cast 'bless'", 'You begin to feel the light of Aman shine upon you.', 'spell-bless'],
        ["cast 'shield'", 'You feel protected.', 'spell-shield'],
        ["cast 'sanctuary'", 'A white aura surrounds you.', 'spell-sanctuary'],
    ])('adds %s only after its completion message', (command, completionLine, catalogId) => {
        recordEffectTimerCommand(command);
        expect(useEffectTimerStore.getState().timers).toHaveLength(0);

        parseEffectTimerLine(completionLine);
        expect(useEffectTimerStore.getState().timers.some(timer => timer.catalogId === catalogId)).toBe(true);
    });
});

describe('effect expiry recognition', () => {
    it('identifies the Armour and Bless expiry messages for prompt cleanup', () => {
        expect(getEndedEffectTimerEntry('You feel less protected.')?.id).toBe('spell-armour');
        expect(getEndedEffectTimerEntry('The light of Aman fades away from you.')?.id).toBe('spell-bless');
    });
});
