// @vitest-environment jsdom
/** @file useGearPanelData.test.tsx — Opening a shop does not request closed gear sections. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGearPanelData } from './useGearPanelData';
import { usePanelDataStore } from '../stores/usePanelDataStore';

vi.mock('../context/GameContext', () => ({
    useGame: () => ({ executeCommand: send, gameState: 'playing', isSpectateMode: false })
}));

// --- Section Request Checks ---
const send = vi.fn();
beforeEach(() => {
    send.mockClear();
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('shop-test');
});
afterEach(() => { cleanup(); usePanelDataStore.getState().setSession(null); });

it('requests only the gear section opened, while closed sections send nothing', () => {
    const { rerender } = renderHook(({ worn, inventory }) => useGearPanelData(worn, inventory), {
        initialProps: { worn: false, inventory: false }
    });
    expect(send).not.toHaveBeenCalled();
    rerender({ worn: true, inventory: false });
    expect(send.mock.calls.map(call => call[0])).toEqual(['equipment']);
    act(() => usePanelDataStore.getState().complete('equipment'));
    rerender({ worn: false, inventory: true });
    expect(send.mock.calls.map(call => call[0])).toEqual(['equipment', 'inventory']);
});

it('defers invalidated inventory until opened and refreshes it if already visible', () => {
    act(() => usePanelDataStore.getState().complete('inventory'));
    const { rerender } = renderHook(({ open }) => useGearPanelData(false, open), { initialProps: { open: false } });
    act(() => usePanelDataStore.getState().invalidate('inventory'));
    expect(send).not.toHaveBeenCalled();
    rerender({ open: true });
    expect(send).toHaveBeenCalledTimes(1);
    act(() => usePanelDataStore.getState().complete('inventory'));
    act(() => usePanelDataStore.getState().invalidate('inventory'));
    expect(send).toHaveBeenCalledTimes(2);
});
