// @vitest-environment jsdom
/** @file useCommandShop.test.tsx — Shop panel catalog requests use silent command execution. */

import React from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PopoverState } from '../types';
import { useCommandShop } from './useCommandShop';
import { useCommandShopCatalog } from './useCommandShopCatalog';
import { useCommandShopStore } from '../stores/useCommandShopStore';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import { CommandShopStock } from '../components/HUD/CommandShopStock';

vi.mock('../context/GameContext', () => ({
    useGame: () => ({ executeCommand, roomNpcs: [], entities: {}, inlineCategories: [], roomName: 'Shop' }),
    useUI: () => ({ setPopoverState: vi.fn() })
}));
vi.mock('../context/MapperContext', () => ({
    useMapper: () => ({ currentRoomId: null, rooms: {}, preloadedCoordsRef: { current: null } })
}));

// --- Request Checks ---
const executeCommand = vi.fn();
beforeEach(() => {
    vi.useFakeTimers();
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('shop-test');
});
afterEach(() => { cleanup(); useCommandShopStore.getState().resetRoom(''); usePanelDataStore.getState().setSession(null); vi.useRealTimers(); });
const finishCatalogAndBalance = () => act(() => {
    usePanelDataStore.getState().complete('shop');
    vi.advanceTimersByTime(0);
    usePanelDataStore.getState().complete('gold');
    vi.advanceTimersByTime(0);
});
it('hides initial stock, filtered catalogs, and individual variant requests', () => {
    executeCommand.mockClear();
    useCommandShopStore.getState().openCatalog();
    const target: PopoverState = { x: 0, y: 0, type: 'menu', setId: 'cat-room', category: 'cat-room', context: 'Shop' };
    const { result } = renderHook(() => {
        const shop = useCommandShop(target, true, vi.fn());
        const catalog = useCommandShopCatalog(shop);
        return { shop, catalog };
    });
    act(() => result.current.shop.browse());
    finishCatalogAndBalance();
    act(() => result.current.shop.browse('list sword'));
    finishCatalogAndBalance();
    act(() => result.current.catalog.toggleProduct(64));
    expect(executeCommand.mock.calls).toEqual(['list', 'info %g', 'list sword', 'info %g', 'list 64'].map(command => [
        command, true, true, false, true, { fromUi: true, shouldFocus: false }
    ]));
});

it('refreshes stock after a purchase and leaves closed inventory for its own section to load', () => {
    executeCommand.mockClear();
    usePanelDataStore.getState().setSession('shop-test');
    usePanelDataStore.getState().complete('inventory');
    const target: PopoverState = { x: 0, y: 0, type: 'menu', setId: 'cat-room', category: 'cat-room', context: 'Shop' };
    renderHook(() => useCommandShop(target, true, vi.fn()));
    act(() => useCommandShopStore.getState().beginOutput('buy 1', 'Buy'));
    act(() => {
        const shop = useCommandShopStore.getState();
        shop.receiveOutput(shop.requestId, []);
    });
    expect(executeCommand.mock.calls.map(call => call[0])).toEqual(['info %g']);
    act(() => { usePanelDataStore.getState().complete('gold'); vi.advanceTimersByTime(0); });
    expect(executeCommand.mock.calls.map(call => call[0])).toEqual(['info %g', 'list']);
    expect(usePanelDataStore.getState().status.inventory).toBe('idle');
    usePanelDataStore.getState().setSession(null);
});

it('sends the chosen quantity and resets it when another item is selected', () => {
    executeCommand.mockClear();
    useCommandShopStore.getState().resetRoom('quantity-test');
    useCommandShopStore.getState().openCatalog();
    useCommandShopStore.getState().selectItem({ num: 23, name: 'ten wine glasses', price: 'three gold and five silver' });
    const target: PopoverState = { x: 0, y: 0, type: 'menu', setId: 'shopitem', category: 'shopitem',
        context: '23', entityId: 'command-shop:quantity-test:23' };
    const { result } = renderHook(() => useCommandShop(target, true, vi.fn()));
    act(() => result.current.setPurchaseQuantity(3));
    expect(result.current.purchaseTotal).toBe('9 gold 15 silver');
    act(() => result.current.runStockAction('buy'));
    expect(executeCommand.mock.calls[0][0]).toBe('buy 3 23');
    act(() => useCommandShopStore.getState().selectItem({ num: 77, name: 'five rings', price: 'one gold' }));
    expect(useCommandShopStore.getState().purchaseQuantity).toBe(1);
});

it('refreshes gold whenever an already-loaded shop dropdown reopens, but not when it closes', () => {
    useCommandShopStore.getState().openCatalog();
    const target: PopoverState = { x: 0, y: 0, type: 'menu', setId: 'cat-room', category: 'cat-room', context: 'Shop' };
    const { result } = renderHook(() => useCommandShop(target, true, vi.fn()));
    const refreshBalance = vi.fn();
    const { container } = render(<CommandShopStock shop={{ ...result.current, refreshBalance }} open={false} onOpenChange={vi.fn()} />);
    const dropdown = container.querySelector('details')!;
    dropdown.open = true;
    fireEvent(dropdown, new Event('toggle'));
    expect(refreshBalance).toHaveBeenCalledTimes(1);
    dropdown.open = false;
    fireEvent(dropdown, new Event('toggle'));
    expect(refreshBalance).toHaveBeenCalledTimes(1);
    dropdown.open = true;
    fireEvent(dropdown, new Event('toggle'));
    expect(refreshBalance).toHaveBeenCalledTimes(2);
});
