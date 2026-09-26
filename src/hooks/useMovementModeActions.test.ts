/**
 * @file useMovementModeActions.test.ts
 * @description Verifies GMCP ride updates drive the movement toggle command.
 */

// --- Logic Section ---
import { beforeEach, describe, expect, it } from 'vitest';
import { useVitalsStore } from '../stores/useVitalsStore';
import { getMovementModeActions } from './useMovementModeActions';

describe('ride movement control', () => {
    beforeEach(() => useVitalsStore.getState().setIsRiding(false));

    it('uses Char.Vitals ride to show On and sends lead to turn it off', () => {
        useVitalsStore.getState().applyCharVitals({ ride: true, position: 'standing' });
        const ride = getMovementModeActions(useVitalsStore.getState()).find(mode => mode.id === 'ride');
        expect(ride).toMatchObject({ active: true, command: 'lead' });
    });

    it('shows Off and sends ride after Char.Vitals clears riding', () => {
        useVitalsStore.getState().applyCharVitals({ ride: true });
        useVitalsStore.getState().applyCharVitals({ ride: false });
        const ride = getMovementModeActions(useVitalsStore.getState()).find(mode => mode.id === 'ride');
        expect(ride).toMatchObject({ active: false, command: 'ride' });
    });
});
