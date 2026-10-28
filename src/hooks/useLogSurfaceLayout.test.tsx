/** @file useLogSurfaceLayout.test.tsx — Internal scrolling must not invalidate surface geometry. */
// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLogSurfaceLayout } from './useLogSurfaceLayout';

// --- Geometry Harness Section ---
let frames: Map<number, FrameRequestCallback>;
let notifyResize: () => void;
const flush = () => act(() => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
});
beforeEach(() => {
    vi.useFakeTimers();
    frames = new Map(); let next = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('ResizeObserver', class {
        constructor(callback: () => void) { notifyResize = callback; }
        observe() {} disconnect() {}
    });
});
afterEach(() => {
    cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
    document.body.replaceChildren(); document.documentElement.removeAttribute('style');
});

const setup = () => {
    const parent = document.createElement('div');
    parent.innerHTML = '<div class="log"><div class="text"></div><div class="command-dock-input-main"></div></div><div class="menu"></div><div class="mobile-map-panel"></div>';
    document.body.append(parent);
    const log = parent.querySelector<HTMLDivElement>('.log')!;
    const map = parent.querySelector<HTMLElement>('.mobile-map-panel')!;
    const bounds = vi.spyOn(log, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 20, 400, 600));
    const mapBounds = vi.spyOn(map, 'getBoundingClientRect').mockReturnValue(new DOMRect(420, 20, 200, 600));
    const hook = renderHook(() => useLogSurfaceLayout({ current: log }));
    flush();
    const writes = vi.spyOn(document.documentElement.style, 'setProperty');
    bounds.mockClear(); mapBounds.mockClear();
    return { ...hook, parent, log, map, bounds, mapBounds, writes };
};

// --- Scheduling Regression Section ---
it('does no surface work for log output scrolling, map contents or menu scrolling', () => {
    const { parent, log, map, bounds, writes } = setup();
    for (const target of [log, log.querySelector('.text')!, map, parent.querySelector('.menu')!]) {
        target.dispatchEvent(new Event('scroll'));
    }
    expect(frames.size).toBe(0);
    expect(bounds).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
});

it('coalesces ancestor scrolling and resizing and skips unchanged root CSS writes', () => {
    const { parent, bounds, mapBounds, writes } = setup();
    act(() => {
        for (let index = 0; index < 30; index++) {
            parent.dispatchEvent(new Event('scroll'));
            notifyResize();
            window.dispatchEvent(new Event('resize'));
        }
    });
    expect(frames.size).toBe(1);
    flush();
    expect(bounds).toHaveBeenCalledTimes(1);
    expect(mapBounds).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled();
});

it('updates changed bounds after completing log and map measurements', () => {
    const { bounds, mapBounds, writes } = setup();
    bounds.mockReturnValue(new DOMRect(15, 25, 400, 600));
    act(() => notifyResize()); flush();
    expect(document.documentElement.style.getPropertyValue('--message-log-left')).toBe('15px');
    expect(mapBounds.mock.invocationCallOrder[0]).toBeLessThan(writes.mock.invocationCallOrder[0]);
});

it('cancels frames and settlement timers when unmounted', () => {
    const { unmount, bounds } = setup();
    act(() => notifyResize());
    unmount();
    expect(frames.size).toBe(0);
    act(() => vi.runAllTimers());
    expect(frames.size).toBe(0);
    expect(bounds).not.toHaveBeenCalled();
});
