// @vitest-environment jsdom
/** @file CommandShopActions.test.tsx — Shop actions share trait headers and command/syntax rows. */
import React from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PopoverState } from '../../types';
import { CommandShopActions } from './CommandShopActions';
import { useCommandShop } from '../../hooks/useCommandShop';
import { useCommandShopStore } from '../../stores/useCommandShopStore';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ executeCommand: vi.fn(), roomNpcs: [], entities: {}, inlineCategories: [], roomName: 'Shop' }),
    useUI: () => ({ setPopoverState: vi.fn() })
}));
vi.mock('../../context/MapperContext', () => ({
    useMapper: () => ({ currentRoomId: null, rooms: {}, preloadedCoordsRef: { current: null } })
}));

// --- Action Presentation and Dispatch ---
beforeEach(() => {
    useCommandShopStore.getState().resetRoom('shop-test');
    useCommandShopStore.getState().openCatalog();
    useCommandShopStore.getState().selectItem({ num: 23, name: 'ten exquisite wine glasses', price: 'three gold and five silver' });
});
afterEach(() => { cleanup(); useCommandShopStore.getState().resetRoom(''); });

const useShopModel = () => {
    const target: PopoverState = { x: 0, y: 0, type: 'menu', setId: 'shopitem', category: 'shopitem',
        context: '23', entityId: 'command-shop:shop-test:23' };
    return useCommandShop(target, true, vi.fn());
};

it('uses the existing collapsible trait header and syntax rows for selected stock', () => {
    const { result } = renderHook(useShopModel);
    const runStockAction = vi.fn();
    const { container, getByRole } = render(<CommandShopActions shop={{ ...result.current, runStockAction }} />);
    expect(container.querySelector('.inline-action-group-label')?.textContent).toBe('Shop');
    expect(container.querySelectorAll('.terminal-inspect-row')).toHaveLength(3);
    expect(container.textContent).toContain('<show 23>');
    expect(container.textContent).toContain('<compare 23 item>');
    expect(container.textContent).toContain('<buy 23>');
    expect(container.textContent).not.toContain('Quantity:');
    fireEvent.click(getByRole('button', { name: 'buy <buy 23>' }));
    expect(runStockAction).toHaveBeenCalledWith('buy');
    expect(getByRole('button', { name: 'buy <buy 23>' }).getAttribute('title')).toBe('Buy 1 · 3 gold 5 silver each');
    fireEvent.click(container.querySelector('.inline-action-group-toggle')!);
    expect(container.querySelector('.inline-action-list')?.hasAttribute('hidden')).toBe(true);
});

it('presents carried-item shop actions with the resolved command syntax', () => {
    const { result } = renderHook(useShopModel);
    const runInventoryAction = vi.fn();
    const { getByRole } = render(<CommandShopActions shop={{ ...result.current,
        selectedStock: null, inventoryTarget: 'sword', runInventoryAction }} />);
    fireEvent.click(getByRole('button', { name: 'sell <sell sword>' }));
    expect(runInventoryAction).toHaveBeenCalledWith('sell');
    expect(getByRole('button', { name: 'value <value sword>' })).toBeTruthy();
    expect(getByRole('button', { name: 'mend <mend sword>' })).toBeTruthy();
});

it('disables command rows while a shop response is pending', () => {
    const { result } = renderHook(useShopModel);
    act(() => useCommandShopStore.getState().beginOutput('show 23', 'Show'));
    const { container } = render(<CommandShopActions shop={result.current} />);
    for (const button of container.querySelectorAll('.terminal-inspect-row')) expect(button.hasAttribute('disabled')).toBe(true);
});

it('updates the buy syntax and total before purchasing and caps quantity at stock', () => {
    const { result } = renderHook(useShopModel);
    const { getByRole, getByText, rerender } = render(<CommandShopActions shop={result.current} />);
    expect(getByText('3 gold 5 silver')).toBeTruthy();
    expect(getByRole('button', { name: 'Decrease quantity' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(getByRole('button', { name: 'Increase quantity' }));
    rerender(<CommandShopActions shop={result.current} />);
    expect(getByRole('button', { name: 'buy <buy 2 23>' })).toBeTruthy();
    expect(getByText('6 gold 10 silver')).toBeTruthy();
    act(() => result.current.setPurchaseQuantity(100));
    rerender(<CommandShopActions shop={result.current} />);
    expect(getByRole('status', { name: 'Purchase quantity' }).textContent).toBe('10');
    expect(getByRole('button', { name: 'Increase quantity' }).hasAttribute('disabled')).toBe(true);
    expect(getByText('32 gold 10 silver')).toBeTruthy();
});

it('triggers onRequestHelp instead of action run when isHelpMode is active', () => {
    const { result } = renderHook(useShopModel);
    const onRequestHelp = vi.fn();
    const { getByRole } = render(<CommandShopActions shop={result.current} isHelpMode={true} onRequestHelp={onRequestHelp} />);
    const buyButton = getByRole('button', { name: 'buy <buy 23>' });
    expect(buyButton.className).toContain('is-help-mode');
    fireEvent.click(buyButton);
    expect(onRequestHelp).toHaveBeenCalledWith('buy');
});

