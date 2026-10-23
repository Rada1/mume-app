// @vitest-environment jsdom
/** @file useShopListParser.test.tsx — Panel shop captures stay out of the log while retaining stock data. */

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useShopListParser } from './useShopListParser';
import { useUIStore } from '../../stores/useUIStore';
import { useCommandShopStore } from '../../stores/useCommandShopStore';

// --- Fixtures ---
let pendingSilent = false;
const capture = {
    isPendingSilent: () => pendingSilent,
    clearPendingFlags: () => { pendingSilent = false; }
};
const deps = { roomNpcs: [], registerEntity: vi.fn() };
beforeEach(() => {
    pendingSilent = false;
    useUIStore.setState({ shopItems: [], shopVariants: {}, shopVariantRequest: null });
    useCommandShopStore.getState().resetRoom('shop-room');
});
afterEach(cleanup);

// --- Catalog Visibility ---
describe('shop list captures', () => {
    it('suppresses a panel catalog but still populates the stock and preserves the prompt', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        let hidden: boolean[] = [];
        act(() => {
            hidden = [
                result.current('You can buy:', false),
                result.current('1. a steel sword up to ten gold.', false),
                result.current('2. a leather bag up to five silver.', false)
            ];
            expect(result.current('HP:Healthy>', true)).toBe(false);
        });
        expect(hidden).toEqual([true, true, true]);
        expect(useUIStore.getState().shopItems.map(item => item.name)).toEqual(['a steel sword', 'a leather bag']);
        expect(pendingSilent).toBe(false);
    });

    it('keeps manually requested stock visible', () => {
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            expect(result.current('Items for sale:', false)).toBe(false);
            expect(result.current('1. a steel sword up to ten gold.', false)).toBe(false);
            result.current('', true);
        });
        expect(useUIStore.getState().shopItems).toHaveLength(1);
    });

    it('does not suppress unrelated gameplay or failure messages', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            expect(result.current('The shop is closed.', false)).toBe(false);
            expect(result.current('You can buy:', false)).toBe(true);
            expect(result.current('Someone tells you: hello!', false)).toBe(false);
            expect(result.current('1. a steel sword up to ten gold.', false)).toBe(true);
        });
    });

    it('finishes silently on a blank separator without hiding the next output', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            result.current('You can buy:', false);
            result.current('1. a steel sword up to ten gold.', false);
            expect(result.current('', false)).toBe(true);
            expect(result.current('You feel hungry.', false)).toBe(false);
        });
        expect(useUIStore.getState().shopItems).toHaveLength(1);
    });

    it('resets catalog capture when the player changes rooms', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            result.current('You can buy:', false);
            result.current('1. a steel sword up to ten gold.', false);
            useCommandShopStore.getState().resetRoom('another-room');
            expect(result.current('2. a leather bag up to five silver.', false)).toBe(false);
            result.current('', true);
        });
        expect(useUIStore.getState().shopItems).toEqual([]);
    });

    it('hides individual for-price rows, wrapped prices, and separators throughout the response', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        const lines = [
            'You can buy:',
            '21. an exquisite wine glass full of water for three lauren and eleven celeb.',
            '     and eleven celeb.',
            ' 34. an exquisite wine glass of water for three lauren and eleven celeb.',
            '-----', '',
            '337. a small jewel-box for fifteen lauren and seven celeb.',
            '-----', '     and fourteen celeb.',
            ' 88. a shimmering ring with a brilliantly clear gem for 124 lauren.',
            '     and seventy-two busc.', '-----', '     and thirteen celeb.',
            '164. a glittering pendant for thirteen lauren and eleven celeb.',
            '166. a golden pendant with a deep green gem for fifty lauren and four celeb.',
            '-----', '183. a silver bracer for four lauren and five celeb.', '-----',
            '333. a red ruby [blue] for fifty-two lauren and five celeb.',
            '294. a pitch-black spinel for two lauren and five celeb.'
        ];
        act(() => {
            for (const line of lines) expect(result.current(line, false), line).toBe(true);
            expect(result.current('!# C>', true)).toBe(false);
            expect(result.current('You feel hungry.', false)).toBe(false);
        });
        expect(useUIStore.getState().shopItems).toHaveLength(9);
    });

    it('can begin a silent catalog on its first stock row without a header', () => {
        pendingSilent = true;
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            expect(result.current('337. a small jewel-box for fifteen lauren and seven celeb.', false)).toBe(true);
            result.current('', true);
        });
        expect(useUIStore.getState().shopItems[0]?.num).toBe(337);
    });
});

// --- Individual Product Variants ---
describe('shop variant captures', () => {
    it('captures and hides conditionless stock until the prompt', () => {
        pendingSilent = true;
        useUIStore.setState({ shopVariantRequest: 23 });
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            expect(result.current('23. ten exquisite wine glasses:', false)).toBe(true);
            for (let num = 24; num <= 33; num += 1) {
                expect(result.current(`${num}. for three gold and five silver <o5705>.`, false)).toBe(true);
            }
            result.current('', true);
        });
        expect(useUIStore.getState().shopVariants[23]).toEqual(Array.from({ length: 10 }, (_, index) => ({
            num: index + 24, condition: '', price: 'three gold and five silver'
        })));
        expect(useUIStore.getState().shopVariantRequest).toBeNull();
    });
    it('silently imports product headers and wrapped condition/price rows', () => {
        pendingSilent = true;
        useUIStore.setState({ shopVariantRequest: 64 });
        const { result } = renderHook(() => useShopListParser(capture, deps));
        act(() => {
            expect(result.current('64. ten fine metal breastplates:', false)).toBe(true);
            expect(result.current('65. (satisfactory, new) for sixteen gold and', false)).toBe(true);
            expect(result.current('fourteen silver.', false)).toBe(true);
            expect(result.current('You feel hungry.', false)).toBe(false);
            expect(result.current('', true)).toBe(false);
        });
        expect(useUIStore.getState().shopVariants[64]).toEqual([
            { num: 65, condition: 'satisfactory, new', price: 'sixteen gold and fourteen silver' }
        ]);
        expect(useUIStore.getState().shopVariantRequest).toBeNull();
    });
});
