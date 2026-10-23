/** @file useLootSelection.test.tsx — Selection stays local and preserves ordinal command ordering. */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLootSelection } from './useLootSelection';
// --- Test Section ---
const rows = [{ id: 'one', label: 'a knife', commandTarget: 'knife' }, { id: 'two', label: 'another knife', commandTarget: '2.knife' }];
describe('loot selection', () => {
    it('selects without executing and takes duplicate items from the highest ordinal first', () => {
        const execute = vi.fn();
        const { result } = renderHook(() => useLootSelection(rows, 'horse', execute));
        act(() => { result.current.toggle('one'); result.current.toggle('two'); });
        expect(execute).not.toHaveBeenCalled();
        act(() => result.current.transfer(false));
        expect(execute).toHaveBeenCalledWith('get 2.knife; get knife');
        expect(result.current.selected).toHaveLength(0);
    });
    it('transfers ground loot to the chosen recipient after taking it', () => {
        const execute = vi.fn();
        const { result } = renderHook(() => useLootSelection(rows, 'horse', execute));
        act(() => result.current.toggle('two'));
        act(() => result.current.transfer(true));
        expect(execute).toHaveBeenCalledWith('get 2.knife; give knife horse');
    });
    it('uses the selected corpse selector and prunes items that disappear', () => {
        const execute = vi.fn();
        const { result, rerender } = renderHook(({ items }) => useLootSelection(items, 'mount', execute, '2.orc'), { initialProps: { items: rows } });
        act(() => result.current.toggle('one'));
        act(() => result.current.transfer(false));
        expect(execute).toHaveBeenCalledWith('get knife 2.orc');
        act(() => result.current.toggle('two'));
        rerender({ items: rows.slice(0, 1) });
        expect(result.current.selected).toHaveLength(0);
    });
});
