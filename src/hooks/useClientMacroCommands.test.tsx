// @vitest-environment jsdom
/** @file Prevents background commands from implicitly invoking macros. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useClientMacroCommands } from './useClientMacroCommands';
import { useClientMacroStore } from '../stores/useClientMacroStore';

// --- Invocation Source Regression ---
const originalMacros = useClientMacroStore.getState().macros;
afterEach(() => {
    cleanup();
    useClientMacroStore.setState({ macros: originalMacros });
});

it('requires input submission for bare names and permits explicit macro calls', () => {
    useClientMacroStore.setState({ macros: [{ name: 'chair', commands: ['shoot orc'], hotkey: null }] });
    const { result } = renderHook(() => useClientMacroCommands());
    const execute = vi.fn();
    const report = vi.fn();
    expect(result.current('chair', execute, report, true)).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    expect(result.current('chair', execute, report, true, true)).toBe(true);
    expect(execute).toHaveBeenCalledWith('shoot orc');
    execute.mockClear();
    expect(result.current('/chair', execute, report, true)).toBe(true);
    expect(execute).toHaveBeenCalledExactlyOnceWith('shoot orc');
});
