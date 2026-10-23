// @vitest-environment jsdom
/** @file useShopBalanceRefresh.test.tsx — Gold-only shop queries update wallet state and respect capture ordering. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CaptureController } from '../types/capture';
import { useStatParser } from './GameParser/useStatParser';
import { useShopListParser } from './GameParser/useShopListParser';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import { useUIStore } from '../stores/useUIStore';
import { resetCharacterInfoRefreshTracker } from '../utils/characterInfoRefreshTracker';

// --- Gold Reply and Queue Checks ---
beforeEach(() => {
    vi.useFakeTimers();
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('balance-test');
    useUIStore.setState({ shopBalance: null });
});
afterEach(() => {
    cleanup(); usePanelDataStore.getState().setSession(null);
    resetCharacterInfoRefreshTracker(); vi.useRealTimers();
});
const useParser = () => useStatParser({ setMood: vi.fn(), setStats: vi.fn(), setCharacterInfo: vi.fn(),
    inCombatRef: { current: false }, executeCommandRef: { current: vi.fn() }, capture: {} as CaptureController });

it('sends only info %g and updates the shop balance from its tracked numeric reply', () => {
    const send = vi.fn();
    const { result } = renderHook(useParser);
    usePanelDataStore.getState().request('gold', send, true);
    expect(send.mock.calls).toEqual([['info %g']]);
    expect(result.current.parseGlobalStatus('1,234', '1,234')).toBe(true);
    expect(useUIStore.getState().shopBalance).toBe('1234 gold');
    expect(usePanelDataStore.getState().status.gold).toBe('ready');
});

it('does not consume a snooped balance as the player gold reply', () => {
    const { result } = renderHook(useParser);
    usePanelDataStore.getState().request('gold', vi.fn(), true);
    result.current.parseGlobalStatus('999', '999', false);
    expect(usePanelDataStore.getState().status.gold).toBe('loading');
    expect(useUIStore.getState().shopBalance).toBeNull();
    result.current.parseGlobalStatus('20', '20');
    expect(useUIStore.getState().shopBalance).toBe('20 gold');
});

it('does not finish a queued stock request at the gold response prompt', () => {
    const send = vi.fn();
    const stat = renderHook(useParser);
    const stock = renderHook(() => useShopListParser({ isPendingSilent: () => true, clearPendingFlags: vi.fn() },
        { roomNpcs: [], registerEntity: vi.fn() }));
    usePanelDataStore.getState().request('gold', send, true);
    usePanelDataStore.getState().request('shop', send, true);
    stat.result.current.parseGlobalStatus('20', '20');
    stock.result.current('!# C>', true);
    expect(usePanelDataStore.getState().status.shop).toBe('loading');
    vi.advanceTimersByTime(0);
    expect(send.mock.calls).toEqual([['info %g'], ['list']]);
    expect(usePanelDataStore.getState().isActive('shop')).toBe(true);
});
