// @vitest-environment jsdom
/**
 * @file useGmcpGroup.test.tsx
 * @description Verifies self Group waiting remains authoritative across position updates.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { useVitalsStore } from '../../stores/useVitalsStore';
import { useGmcpGroup } from './useGmcpGroup';

// --- Tests Section ---

afterEach(() => {
    useActionTimerStore.getState().cancelTimer();
    useActionTimerStore.getState().clearPending();
    useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: false } }));
});

describe('self Group waiting', () => {
    it('starts tracking and keeps it active while position remains standing', () => {
        useVitalsStore.setState(state => ({ conditions: { ...state.conditions, waiting: false } }));
        useActionTimerStore.getState().setPendingAction('Tracking', 'skill');
        const { result } = renderHook(() => useGmcpGroup({
            characterName: 'Ellessar',
            setGroupMembers: vi.fn(),
            setStats: useVitalsStore.getState().setStats
        }));

        act(() => result.current.onGroupSet([{ id: 1, name: 'Ellessar', type: 'you', hp: 437, waiting: true }]));
        expect(useVitalsStore.getState().conditions?.waiting).toBe(true);
        expect(useActionTimerStore.getState().activeTimer?.name).toBe('Tracking');

        act(() => useVitalsStore.getState().applyCharVitals({ position: 'standing' }));
        expect(useVitalsStore.getState().conditions?.waiting).toBe(true);
        expect(useActionTimerStore.getState().activeTimer?.isFinished).toBe(false);

        act(() => result.current.onGroupUpdate({ id: 1, waiting: false }));
        expect(useVitalsStore.getState().conditions?.waiting).toBe(false);
        expect(useActionTimerStore.getState().activeTimer?.isFinished).toBe(true);
    });
});
