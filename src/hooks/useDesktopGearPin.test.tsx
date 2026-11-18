/** @file useDesktopGearPin.test.tsx — Pin state for desktop gear panels. */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useDesktopGearPin } from './useDesktopGearPin';

// --- Pin state ---
it('pins, unpins, and clears the current panel pin', () => {
    const { result } = renderHook(useDesktopGearPin);
    expect(result.current.pinned).toBe(false);
    act(() => result.current.pin());
    expect(result.current.pinned).toBe(true);
    act(() => result.current.togglePin());
    expect(result.current.pinned).toBe(false);
    act(() => result.current.togglePin());
    act(() => result.current.clearPin());
    expect(result.current.pinned).toBe(false);
});
