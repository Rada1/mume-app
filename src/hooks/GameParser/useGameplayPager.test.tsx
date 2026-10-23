// @vitest-environment jsdom
/** @file useGameplayPager.test.tsx — Viewer ownership and multi-page shop capture regressions. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameplayPager } from './useGameplayPager';
import { useShopListParser } from './useShopListParser';
import { usePanelDataStore } from '../../stores/usePanelDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { isPagerPrompt } from '../../utils/pagerPrompt';

// --- Logic Section: Fixtures ---
const viewer = '*** Return: continue, b: back, r: redisplay, q: quit, v: view (60%) ***';
beforeEach(() => {
    usePanelDataStore.getState().setSession('pager-test');
    useUIStore.setState({ shopItems: [], shopVariantRequest: null });
});
afterEach(() => {
    cleanup();
    usePanelDataStore.getState().setSession(null);
});

// --- Logic Section: Regression Checks ---
it('keeps stock across viewer prompts and starts the next request only at the game prompt', async () => {
    const sendCommand = vi.fn();
    const addMessage = vi.fn();
    let pending = true;
    const capture = { isPendingSilent: () => pending, clearPendingFlags: () => { pending = false; } };
    const { result } = renderHook(() => ({
        pager: useGameplayPager({ gameState: 'playing', sendCommand, addMessage, ownsCapture: () => false }),
        shop: useShopListParser(capture, { roomNpcs: [], registerEntity: vi.fn() }),
    }));
    const store = usePanelDataStore.getState();
    store.request('shop', sendCommand);
    store.request('inventory', sendCommand);
    await act(async () => {
        result.current.shop('You can buy:', false);
        result.current.shop('1. a sword for ten gold.', false);
        if (!result.current.pager(viewer, false)) result.current.shop(viewer, true);
        await Promise.resolve();
    });
    expect(store.isActive('shop')).toBe(true);
    expect(sendCommand.mock.calls).toEqual([['list'], ['']]);
    expect(addMessage).not.toHaveBeenCalled();
    act(() => {
        result.current.shop('2. a shield for five gold.', false);
        result.current.shop('!#>', true);
    });
    expect(useUIStore.getState().shopItems.map(item => item.num)).toEqual([1, 2]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sendCommand.mock.calls).toEqual([['list'], [''], ['inventory']]);
});

it('displays a manual pager without advancing it', async () => {
    const sendCommand = vi.fn();
    const addMessage = vi.fn();
    const { result } = renderHook(() => useGameplayPager({
        gameState: 'playing', sendCommand, addMessage, ownsCapture: () => false,
    }));
    expect(result.current(viewer, false)).toBe(true);
    await Promise.resolve();
    expect(sendCommand).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith('game', viewer);
});

it('never advances another player’s snooped viewer even during a panel request', async () => {
    const sendCommand = vi.fn();
    const addMessage = vi.fn();
    usePanelDataStore.getState().request('shop', vi.fn());
    const { result } = renderHook(() => useGameplayPager({
        gameState: 'playing', sendCommand, addMessage, ownsCapture: () => true,
    }));
    expect(result.current(viewer, true)).toBe(true);
    await Promise.resolve();
    expect(sendCommand).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith('snoop', viewer);
});

it('advances silent detail captures and recognizes colored or Hit Return prompts', async () => {
    const sendCommand = vi.fn();
    const { result } = renderHook(() => useGameplayPager({
        gameState: 'playing', sendCommand, addMessage: vi.fn(), ownsCapture: () => true,
    }));
    expect(result.current(`\x1b[33m${viewer}\x1b[0m`, false)).toBe(true);
    await Promise.resolve();
    expect(sendCommand).toHaveBeenCalledWith('');
    expect(isPagerPrompt('*** [Hit Return to continue] ***')).toBe(true);
    expect(isPagerPrompt('Someone says, "Return: continue"')).toBe(false);
    expect(result.current('!#>', false)).toBe(false);
});
