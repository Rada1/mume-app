/** @file useAutomaticTargetStore.test.ts — Checks explicit room auto targeting mode. */

// --- Logic Section ---
import { beforeEach, describe, expect, it } from 'vitest';
import { useAutomaticTargetStore } from './useAutomaticTargetStore';
import { useVitalsStore } from './useVitalsStore';

describe('automatic target mode', () => {
    beforeEach(() => {
        useAutomaticTargetStore.getState().setEnabled(false);
        useVitalsStore.getState().setTarget(null);
    });

    it('starts off and can be enabled explicitly', () => {
        expect(useAutomaticTargetStore.getState().enabled).toBe(false);
        useAutomaticTargetStore.getState().setEnabled(true);
        expect(useAutomaticTargetStore.getState().enabled).toBe(true);
    });

    it('turns off when a manual global target is chosen', () => {
        useAutomaticTargetStore.getState().setEnabled(true);
        useVitalsStore.getState().setTarget('orc');
        expect(useAutomaticTargetStore.getState().enabled).toBe(false);
        expect(useVitalsStore.getState().target).toBe('orc');
    });
});
