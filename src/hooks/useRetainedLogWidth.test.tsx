// @vitest-environment jsdom
/** @file useRetainedLogWidth.test.tsx — Dock closure retains the measured log width. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useRetainedLogWidth } from './useRetainedLogWidth';

// --- Log Geometry Regression ---
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--desktop-log-width');
});

it('retains the last resized width on close while allowing subsequent manual resizing', () => {
    let resized = () => {};
    vi.stubGlobal('ResizeObserver', class {
        constructor(callback: () => void) { resized = callback; }
        observe() {}
        disconnect() {}
    });
    const log = document.createElement('div');
    let width = 510;
    vi.spyOn(log, 'getBoundingClientRect').mockImplementation(() => ({ width }) as DOMRect);
    const ref = { current: log };
    const { rerender } = renderHook(({ open }) => useRetainedLogWidth(ref, false, open), {
        initialProps: { open: true }
    });
    width = 540;
    resized();
    rerender({ open: false });
    const retained = document.documentElement.style.getPropertyValue('--desktop-log-width');
    expect(parseFloat(retained) / 100 * window.innerWidth).toBeCloseTo(540);
    document.documentElement.style.setProperty('--desktop-log-width', '65vw');
    rerender({ open: false });
    expect(document.documentElement.style.getPropertyValue('--desktop-log-width')).toBe('65vw');
});
