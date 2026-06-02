/**
 * @file combatRechargeStore.test.ts
 * @description Tests learned combat recharge timers from confirmed combat lines.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useCombatRechargeStore } from '../useCombatRechargeStore';

const resetStore = () => useCombatRechargeStore.setState({
    active: {},
    opponentActive: {},
    stats: {},
    opponentStats: {},
    pendingAttempts: []
});

describe('useCombatRechargeStore', () => {
    beforeEach(resetStore);

    it('starts an unknown timer on first confirmation', () => {
        useCombatRechargeStore.getState().recordCombatConfirmation('shoot', 1000);

        const timer = useCombatRechargeStore.getState().active.shoot;
        expect(timer?.durationMs).toBe(4860);
        expect(timer?.confidence).toBe('unknown');
        expect(timer?.expiresAt).toBe(5860);
    });

    it('learns from repeated confirmed action intervals', () => {
        const store = useCombatRechargeStore.getState();
        store.recordCombatConfirmation('shoot', 1000);
        store.recordCombatConfirmation('shoot', 5200);
        store.recordCombatConfirmation('shoot', 9400);
        store.recordCombatConfirmation('shoot', 13600);

        const timer = useCombatRechargeStore.getState().active.shoot;
        expect(timer?.durationMs).toBe(4536);
        expect(timer?.confidence).toBe('learned');
    });

    it('records pending command attempts for blocked-line diagnostics', () => {
        const store = useCombatRechargeStore.getState();
        store.recordCommandAttempt('bash orc', 1000);
        store.recordBlockedLine('You are not ready yet.', 1500);

        expect(useCombatRechargeStore.getState().stats.bash?.lastBlockedAt).toBe(1500);
    });

    it('falls back to a pending command when a combat line has no mapped verb', () => {
        const store = useCombatRechargeStore.getState();
        store.recordCommandAttempt('shoot orc', 1000);
        store.recordCombatConfirmation(undefined, 1500);

        expect(useCombatRechargeStore.getState().active.shoot?.confidence).toBe('unknown');
    });

    it('tracks opponent recharge separately from player recharge', () => {
        const store = useCombatRechargeStore.getState();
        store.recordCombatConfirmation('slash', 1000);
        store.recordOpponentCombatConfirmation('stab', 1200);
        store.recordOpponentCombatConfirmation('stab', 5200);
        store.recordOpponentCombatConfirmation('stab', 9200);
        store.recordOpponentCombatConfirmation('stab', 13200);

        const state = useCombatRechargeStore.getState();
        expect(state.active.hit?.startedAt).toBe(1000);
        expect(state.opponentActive.hit?.durationMs).toBe(4320);
        expect(state.opponentActive.hit?.confidence).toBe('learned');
    });
});
