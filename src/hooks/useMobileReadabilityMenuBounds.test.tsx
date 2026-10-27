// @vitest-environment jsdom
/** @file useMobileReadabilityMenuBounds.test.tsx — Keep landscape menus above the input without shortening the map lane. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMobileReadabilityMenuBounds } from './useMobileReadabilityMenuBounds';

// --- Logic Section ---
let notifyResize: () => void;
beforeEach(() => {
    vi.stubGlobal('innerHeight', 376);
    vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(function(callback: () => void) {
        notifyResize = callback;
        return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    }));
});
afterEach(() => { cleanup(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

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
    vi.spyOn(summary, 'getBoundingClientRect').mockReturnValue(new DOMRect(724, 368, 232, 8));
    const inputBounds = vi.spyOn(input, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 328, 232, 48));
    const slots = { app, controls, actions, summary };
    const hook = renderHook(() => useMobileReadabilityMenuBounds(true, slots));
    return { app, inputBounds, hook };
};

it('reserves the command input height for the left branch while retaining the right lane boundary', () => {
    const { app } = setup();
    expect(app.style.getPropertyValue('--mobile-readability-menu-bottom')).toBe('12px');
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('40px');
    expect(app.style.getPropertyValue('--landscape-command-input-clearance')).toBe('52px');
});

it('increases the protected input area when the command field grows', () => {
    const { app, inputBounds } = setup();
    inputBounds.mockReturnValue(new DOMRect(0, 300, 232, 76));
    act(() => notifyResize());
    expect(app.style.getPropertyValue('--mobile-readability-main-branch-bottom-inset')).toBe('68px');
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
