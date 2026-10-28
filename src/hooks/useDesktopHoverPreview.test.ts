// @vitest-environment jsdom
/** @file useDesktopHoverPreview.test.ts — Mouse-only previews across a floating menu gap. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useDesktopHoverPreview } from './useDesktopHoverPreview';

// --- Pointer and bridge behavior ---
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('opens for a mouse, crosses the menu gap, and closes after leaving', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDesktopHoverPreview(true));
    const mouse = { pointerType: 'mouse' } as PointerEvent<HTMLElement>;
    act(() => result.current.enter(mouse));
    expect(result.current.open).toBe(true);
    act(() => { result.current.leave(mouse); vi.advanceTimersByTime(100); result.current.enter(mouse); vi.advanceTimersByTime(200); });
    expect(result.current.open).toBe(true);
    act(() => { result.current.leave(mouse); vi.advanceTimersByTime(180); });
    expect(result.current.open).toBe(false);
});
it('ignores touch and disabled desktop previews', () => {
    const { result, rerender } = renderHook(({ enabled }) => useDesktopHoverPreview(enabled), { initialProps: { enabled: true } });
    act(() => result.current.enter({ pointerType: 'touch' } as PointerEvent<HTMLElement>));
    expect(result.current.open).toBe(false);
    rerender({ enabled: false });
    act(() => result.current.enter({ pointerType: 'mouse' } as PointerEvent<HTMLElement>));
    expect(result.current.open).toBe(false);
});
