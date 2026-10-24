// @vitest-environment jsdom
/** @file Guards macro shortcuts against modifier keys matching unbound macros. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useClientMacroHotkeys } from './useClientMacroHotkeys';
import { useClientMacroStore } from '../stores/useClientMacroStore';

// --- Keyboard Regression ---
const originalMacros = useClientMacroStore.getState().macros;
afterEach(() => {
    cleanup();
    useClientMacroStore.setState({ macros: originalMacros });
});

it('ignores modifier-only keys with an unbound macro and still runs assigned shortcuts', () => {
    useClientMacroStore.setState({ macros: [
        { name: 'chair', commands: ['shoot orc'], hotkey: null },
        { name: 'look', commands: ['look'], hotkey: 'Numpad5' }
    ] });
    const execute = vi.fn();
    renderHook(() => useClientMacroHotkeys(execute, true));
    for (const code of ['ShiftLeft', 'ControlLeft', 'AltLeft', 'MetaLeft']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    }
    expect(execute).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad5', bubbles: true }));
    expect(execute).toHaveBeenCalledExactlyOnceWith('/look');
});
