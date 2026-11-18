/** @file DesktopShopPanel.test.tsx — Item-first shop views and actions. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CommandShopProps } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { DesktopShopPanel } from './DesktopShopPanel';

vi.mock('../../hooks/useGearPanelData', () => ({ useGearPanelData: () => ({ status: {} }) }));
vi.mock('./CommandShopStock', () => ({ CommandShopStock: ({ shop }: CommandShopProps) =>
    <button className="shop-item-row" onClick={() => shop.selectStock({ num: 23, name: 'rings', price: 'one gold' })}>Stock item</button> }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// --- Views, actions and captured responses ---
it('selects items before actions and preserves comparison across shop views', () => {
    const slot = document.createElement('div'); slot.id = 'client-panel-shop-slot'; document.body.appendChild(slot);
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 20, bottom: 100, left: 300, right: 400, width: 100, height: 80, x: 300, y: 20, toJSON: () => ({}) });
    const item = { num: 23, name: 'rings', price: 'one gold' };
    const selectStock = vi.fn(), selectEntity = vi.fn(), setCompareFirst = vi.fn(), runStockAction = vi.fn(), runInventoryAction = vi.fn(), tryCompare = vi.fn(() => true);
    const controller = { game: { viewport: { isMobile: false } }, selectEntity,
        entries: [{ id: 'item', group: 'inventory', label: 'a sword', context: 'sword' },
            { id: 'worn', group: 'worn', label: 'worn boots', context: 'boots' }],
        shop: { browsing: true, available: true, closeWorkspace: vi.fn(), selectStock, browse: vi.fn(), showBrowse: false,
            setOutputOpen: vi.fn(), setCompareFirst, runStockAction, runInventoryAction, tryCompare,
            setPurchaseQuantity: vi.fn(), purchaseQuantity: 1, purchaseLimit: 1, outputTitle: '' }
    } as unknown as ReturnType<typeof useCommandTreeController>;
    const view = render(<DesktopShopPanel controller={controller} />);
    expect(screen.getByRole('button', { name: 'Shop inventory' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByLabelText('Item actions')).toBeNull();
    fireEvent.click(screen.getByText('Stock item'));
    expect(selectStock).toHaveBeenCalledWith(item);
    view.rerender(<DesktopShopPanel controller={{ ...controller, shop: { ...controller.shop, selectedStock: item } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'compare' }));
    expect(runStockAction).toHaveBeenCalledWith('compare');
    view.rerender(<DesktopShopPanel controller={{ ...controller, shop: { ...controller.shop, selectedStock: item, compareFirst: item } }} />);
    expect(screen.getByText(/with another item in the shop/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Your inventory' }));
    expect(screen.queryByText('Stock item')).toBeNull();
    expect(screen.getByRole('button', { name: 'Your inventory' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('a sword')).toBeTruthy();
    expect(screen.queryByText('worn boots')).toBeNull();
    expect(screen.getByText(/with another item in the shop/).textContent).toContain('rings');
    fireEvent.click(screen.getByText('a sword'));
    expect(tryCompare).toHaveBeenCalledWith(expect.objectContaining({ context: 'sword' }));
    view.rerender(<DesktopShopPanel controller={{ ...controller, shop: { ...controller.shop, selectedStock: item, compareFirst: item,
        outputVisible: true, outputTitle: 'rings ↔ sword', completedCommand: 'compare 23 sword',
        outputLines: [{ id: '1', text: 'The sword is heavier.', html: 'The sword is heavier.' }] } }} />);
    expect(screen.getByText('The sword is heavier.')).toBeTruthy();
    view.rerender(<DesktopShopPanel controller={controller} />);
    tryCompare.mockReturnValueOnce(false);
    fireEvent.click(screen.getByText('a sword'));
    expect(selectEntity).toHaveBeenCalledWith(expect.objectContaining({ context: 'sword' }));
    view.rerender(<DesktopShopPanel controller={{ ...controller, shop: { ...controller.shop, inventoryTarget: 'sword' } }} />);
    fireEvent.click(screen.getByRole('button', { name: 'sell' }));
    expect(runInventoryAction).toHaveBeenCalledWith('sell');
    view.unmount(); slot.remove();
});
