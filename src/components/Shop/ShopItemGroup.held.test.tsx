/** @file ShopItemGroup.held.test.tsx — Held stock selection waits for a click so scrolling cannot buy. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {ShopItemGroup} from './ShopItemGroup';

// --- Held Stock Interaction ---
it('does not select held-menu stock on pointer down or up, and selects once on click', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const onSelect = vi.fn();
    const item = {num: 1, name: 'a sword', price: 'one silver'};
    try {
        await act(async () => root.render(<ShopItemGroup item={item} expanded={false} loading={false}
            selectedNum={null} compareNum={null} targeting={false} selectOnClick
            onSelect={onSelect} onToggle={vi.fn()} onInspect={vi.fn()}/>));
        const row = host.querySelector<HTMLElement>('.shop-item-row')!;
        await act(async () => {
            row.dispatchEvent(new Event('pointerdown', {bubbles: true}));
            row.dispatchEvent(new Event('pointerup', {bubbles: true}));
        });
        expect(onSelect).not.toHaveBeenCalled();
        await act(async () => row.click());
        expect(onSelect).toHaveBeenCalledExactlyOnceWith(item);
    } finally { await act(async () => root.unmount()); }
});
