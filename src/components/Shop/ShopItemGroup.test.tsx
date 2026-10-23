// @vitest-environment jsdom
/** @file ShopItemGroup.test.tsx — Compact stock toggles remain separate from product selection. */
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ShopItemGroup } from './ShopItemGroup';

// --- Stock Interaction Checks ---
afterEach(cleanup);
it('expands stock from the minimal count control without selecting the product', () => {
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    const { getByRole, container } = render(<ShopItemGroup
        item={{ num: 77, name: 'eleven rings of silver', price: 'ten silver and twenty-five copper', vnum: 'o4004' }}
        compact expanded={false} loading={false} selectedNum={null} compareNum={null} targeting={false}
        onSelect={onSelect} onToggle={onToggle} onInspect={vi.fn()} />);
    const toggle = getByRole('button', { name: 'Show 11 in stock for rings of silver' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.querySelector('svg')).toBeTruthy();
    fireEvent.pointerDown(toggle);
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(77);
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.querySelector('.shop-item-name')?.textContent).toBe('rings of silver');
    expect(container.querySelector('.shop-item-price')?.textContent).toBe('10 silver 25 copper');
    expect(container.querySelector('.shop-item-price')?.getAttribute('title')).toBe('ten silver and twenty-five copper');
});
