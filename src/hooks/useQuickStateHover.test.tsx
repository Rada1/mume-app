// @vitest-environment jsdom
/** @file useQuickStateHover.test.tsx — Verify quick menu hover handoffs. */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuickStateHover } from './useQuickStateHover';

// --- Test Section ---
describe('useQuickStateHover', () => {
    afterEach(() => vi.useRealTimers());

    it('allows crossing the gap and does not close a newly opened menu', () => {
        vi.useFakeTimers();
        const close = vi.fn();
        const { result, rerender, unmount } = renderHook(
            ({ active }) => useQuickStateHover(active, close),
            { initialProps: { active: 'Mood' } },
        );
        act(() => { result.current.leave('Mood', 'mouse'); vi.advanceTimersByTime(100); result.current.cancel(); vi.runAllTimers(); });
        expect(close).not.toHaveBeenCalled();
        act(() => result.current.leave('Mood', 'mouse'));
        rerender({ active: 'Cast Speed' });
        act(() => vi.runAllTimers());
        expect(close).not.toHaveBeenCalled();
        act(() => { result.current.leave('Cast Speed', 'mouse'); vi.runAllTimers(); });
        expect(close).toHaveBeenCalledOnce();
        act(() => result.current.leave('Cast Speed', 'touch'));
        unmount();
        act(() => vi.runAllTimers());
        expect(close).toHaveBeenCalledOnce();
    });
});
