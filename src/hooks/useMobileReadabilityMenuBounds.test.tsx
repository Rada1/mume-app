// @vitest-environment jsdom
/** @file useMobileReadabilityMenuBounds.test.tsx — Keep landscape menus above the input without shortening the map lane. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMobileReadabilityMenuBounds } from './useMobileReadabilityMenuBounds';

// --- Logic Section ---
let notifyResize: () => void;
let frames: Map<number, FrameRequestCallback>;
const flushFrame = () => act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
});
beforeEach(() => {
    frames = new Map();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
    vi.stubGlobal('innerHeight', 376);
    vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(function(callback: () => void) {
        notifyResize = callback;
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    }));
});
afterEach(() => { cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const setup = (landscape = true) => {
    const app = document.createElement('div');
    app.className = landscape ? 'is-landscape' : '';
    app.innerHTML = '<div class="controls"></div><div class="actions"></div><div class="summary"></div><div class="command-dock-input-main"></div>';
    document.body.append(app);
    const controls = app.querySelector<HTMLElement>('.controls')!;
    const actions = app.querySelector<HTMLElement>('.actions')!;
    const summary = app.querySelector<HTMLElement>('.summary')!;
    const input = app.querySelector<HTMLElement>('.command-dock-input-main')!;
    vi.spyOn(controls, 'getBoundingClientRect').mockReturnValue(new DOMRect(724, 0, 232, 120));
    vi.spyOn(actions, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 232, 80));
    const summaryBounds = vi.spyOn(summary, 'getBoundingClientRect').mockReturnValue(new DOMRect(724, 368, 232, 8));
    const inputBounds = vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 328, 232, 48));
    const slots = { app, controls, actions, summary };
    const hook = renderHook(() => useMobileReadabilityMenuBounds(true, slots));
    return { app, inputBounds, summaryBounds, hook };
};

it('keeps landscape branches above the command input', () => {
    const { app } = setup();
    expect(app.style.getPropertyValue('--mobile-readability-menu-bottom')).toBe('52px');
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('0px');
    expect(app.style.getPropertyValue('--landscape-command-input-clearance')).toBe('52px');
});

it('increases the protected input area when the command field grows', () => {
    const { app, inputBounds } = setup();
    inputBounds.mockReturnValue(new DOMRect(0, 300, 232, 76));
    act(() => notifyResize());
    flushFrame();
    expect(app.style.getPropertyValue('--mobile-readability-menu-bottom')).toBe('80px');
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('0px');
    expect(app.style.getPropertyValue('--landscape-command-input-clearance')).toBe('80px');
});

it('leaves portrait branch geometry unchanged', () => {
    const { app } = setup(false);
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('0px');
    expect(app.style.getPropertyValue('--landscape-command-input-clearance')).toBe('');
});

it('removes layout overrides on cleanup', () => {
    const { app, hook } = setup();
    hook.unmount();
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('');
    expect(app.style.getPropertyValue('--landscape-command-input-clearance')).toBe('');
});

it('coalesces resize bursts and avoids rewriting unchanged geometry', () => {
    const { app, inputBounds } = setup();
    const writes = vi.spyOn(app.style, 'setProperty');
    inputBounds.mockClear();
    act(() => {
        notifyResize();
        window.dispatchEvent(new Event('resize'));
        notifyResize();
    });
    expect(inputBounds).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    flushFrame();
    expect(inputBounds).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled();
});

it('finishes all geometry reads before changing layout styles', () => {
    const { app, inputBounds, summaryBounds } = setup();
    const writes = vi.spyOn(app.style, 'setProperty');
    inputBounds.mockReturnValue(new DOMRect(0, 300, 232, 76));
    act(() => notifyResize());
    flushFrame();
    expect(writes).toHaveBeenCalled();
    expect(summaryBounds.mock.invocationCallOrder.at(-1)).toBeLessThan(writes.mock.invocationCallOrder[0]);
});

it('cancels pending measurements when the layout unmounts', () => {
    const { hook, inputBounds } = setup();
    act(() => notifyResize());
    inputBounds.mockClear();
    hook.unmount();
    expect(frames.size).toBe(0);
    flushFrame();
    expect(inputBounds).not.toHaveBeenCalled();
});
