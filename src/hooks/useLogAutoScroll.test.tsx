/** @file useLogAutoScroll.test.tsx — Live following budgets geometry and respects history. */
// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLogAutoScroll } from './useLogAutoScroll';

// --- Frame Harness Section ---
let frames: Map<number, FrameRequestCallback>;
const flush = () => act(() => {
    const pending = [...frames.values()]; frames.clear();
    pending.forEach(callback => callback(0));
});
beforeEach(() => {
    frames = new Map(); let next = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const setup = () => {
    const hook = renderHook(() => useLogAutoScroll());
    const container = document.createElement('div');
    let height = 1000;
    const read = vi.fn(() => height);
    Object.defineProperty(container, 'scrollHeight', { get: read });
    Object.defineProperty(container, 'clientHeight', { value: 200 });
    hook.result.current.scrollContainerRef.current = container;
    return { ...hook, container, read, grow: () => { height += 100; } };
};

// --- Following Regression Section ---
it('coalesces arrivals and resize requests, reading the latest height only once', () => {
    const { result, container, read, grow } = setup();
    for (let index = 0; index < 30; index++) result.current.scrollToBottom(true);
    expect(read).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    grow(); flush();
    expect(read).toHaveBeenCalledTimes(1);
    expect(container.scrollTop).toBe(900);
    expect(result.current.isAutoScrollingRef.current).toBe(true);
    flush();
    expect(result.current.isAutoScrollingRef.current).toBe(false);
});

it('leaves history in place when the reader scrolls away before a queued arrival', () => {
    const { result, container, read } = setup();
    result.current.scrollToBottom(true);
    result.current.isLockedToBottomRef.current = false;
    container.scrollTop = 100;
    flush();
    expect(read).not.toHaveBeenCalled();
    expect(container.scrollTop).toBe(100);
});

it('preserves near-bottom checks and permits an explicit return from history', () => {
    const { result, container } = setup();
    result.current.isLockedToBottomRef.current = false;
    result.current.scrollToBottom(); flush();
    expect(container.scrollTop).toBe(0);
    container.scrollTop = 780;
    result.current.scrollToBottom(); flush();
    expect(container.scrollTop).toBe(800);
    container.scrollTop = 100;
    result.current.scrollToBottom(true); flush();
    expect(container.scrollTop).toBe(800);
});

it('cancels pending scrolls and programmatic-scroll markers on unmount', () => {
    const { result, container, unmount } = setup();
    result.current.scrollToBottom(true); flush();
    result.current.scrollToBottom(true);
    expect(frames.size).toBe(2);
    unmount();
    expect(frames.size).toBe(0);
    expect(result.current.isAutoScrollingRef.current).toBe(false);
    expect(container.scrollTop).toBe(800);
});
