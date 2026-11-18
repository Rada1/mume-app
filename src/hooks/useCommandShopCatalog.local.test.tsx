/** @file useCommandShopCatalog.local.test.tsx — Desktop categories filter captured stock locally. */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { CommandShopProps } from '../types';
import { useCommandShopCatalog } from './useCommandShopCatalog';

vi.mock('../context/GameContext', () => ({ useGame: () => ({ executeCommand: vi.fn() }) }));

// --- Local catalog behavior ---
it('filters without sending a new list and falls back when stock changes', () => {
    const browse = vi.fn();
    const shop = { roomKey: 'room', shopItems: [
        { num: 1, name: 'gold rings', price: '1 gold' },
        { num: 2, name: 'a mysterious token', price: '2 gold' },
    ], browse } as unknown as CommandShopProps['shop'];
    const { result, rerender } = renderHook(({ value }) => useCommandShopCatalog(value, true), { initialProps: { value: shop } });
    expect(result.current.categories?.map(category => category.id)).toEqual(['all', 'jewelry', 'misc']);
    act(() => result.current.selectCategory('jewelry'));
    expect(result.current.items.map(item => item.num)).toEqual([1]);
    expect(browse).not.toHaveBeenCalled();
    rerender({ value: { ...shop, shopItems: [{ num: 3, name: 'a leather cloak', price: '1 gold' }] } });
    expect(result.current.category).toBe('all');
    expect(result.current.categories?.map(category => category.id)).toEqual(['all', 'clothing']);
    expect(result.current.items.map(item => item.num)).toEqual([3]);
});
