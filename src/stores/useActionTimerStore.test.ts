/**
 * @file useActionTimerStore.test.ts
 * @description Verifies GMCP waiting starts the named pending action timer.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { useActionTimerStore } from './useActionTimerStore';
import { useVitalsStore } from './useVitalsStore';

// --- Tests Section ---

afterEach(() => {
    useActionTimerStore.getState().cancelTimer();
    useActionTimerStore.getState().clearPending();
    useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: false } }));
});

describe('GMCP waiting action', () => {
    it.each([
        ['Tracking', 'skill'],
        ['Casting: Bless', 'spell']
    ] as const)('starts %s when GMCP reports waiting', (name, type) => {
        useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: false } }));
        useActionTimerStore.getState().setPendingAction(name, type);

        useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: true } }));

        expect(useActionTimerStore.getState().activeTimer).toMatchObject({ name, type, isFinished: false });
        expect(useActionTimerStore.getState().pendingAction).toBeNull();

        useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: false } }));
        expect(useActionTimerStore.getState().activeTimer?.isFinished).toBe(true);
    });
});
