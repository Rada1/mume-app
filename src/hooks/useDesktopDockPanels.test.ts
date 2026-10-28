// @vitest-environment jsdom
/** @file useDesktopDockPanels.test.ts — Independent desktop panel persistence. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useDesktopDockPanels } from './useDesktopDockPanels';

// --- Visibility and persistence ---
afterEach(() => { cleanup(); localStorage.clear(); });
it('toggles panels independently and restores their states on remount', () => {
    const first = renderHook(() => useDesktopDockPanels());
    expect(first.result.current.commandsOpen).toBe(false);
    expect(first.result.current.characterOpen).toBe(false);
    act(() => first.result.current.toggle('commands'));
    act(() => first.result.current.toggle('character'));
    act(() => first.result.current.toggle('commands'));
    first.unmount();
    const restored = renderHook(() => useDesktopDockPanels());
    expect(restored.result.current.commandsOpen).toBe(false);
    expect(restored.result.current.characterOpen).toBe(true);
});
