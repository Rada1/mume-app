/**
 * @file actionTimerParser.test.ts
 * @description Verifies MUME tracking text starts and ends the named action timer.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { parseActionTimerLine, recordActionTimerCommand } from './actionTimerParser';

// --- Tests Section ---

afterEach(() => {
    useActionTimerStore.getState().cancelTimer();
    useActionTimerStore.getState().clearPending();
});

describe('tracking action timer', () => {
    it('uses the actual tracking start and stop lines', () => {
        recordActionTimerCommand('track');
        expect(parseActionTimerLine('You carefully examine the ground around you, looking for tracks...')).toBe(true);
        expect(useActionTimerStore.getState().activeTimer).toMatchObject({ name: 'Tracking', isFinished: false });

        expect(parseActionTimerLine('You stop searching.')).toBe(true);
        expect(useActionTimerStore.getState().activeTimer?.isFinished).toBe(true);
    });

    it('starts from the tracking response even without a pending command', () => {
        expect(parseActionTimerLine('You carefully examine the ground around you, looking for tracks...')).toBe(true);
        expect(useActionTimerStore.getState().activeTimer).toMatchObject({ name: 'Tracking', isFinished: false });
    });
});

describe('casting action timer', () => {
    it('starts when concentration begins', () => {
        recordActionTimerCommand("c 'bless'");
        expect(parseActionTimerLine('You start to concentrate...')).toBe(true);
        expect(useActionTimerStore.getState().activeTimer).toMatchObject({
            name: 'Casting: Bless', type: 'spell', isFinished: false
        });
    });
});
