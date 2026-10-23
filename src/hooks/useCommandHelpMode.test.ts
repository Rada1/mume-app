// @vitest-environment jsdom
/**
 * @file useCommandHelpMode.test.ts
 * @description Unit tests for useCommandHelpMode hook.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandHelpMode } from './useCommandHelpMode';

describe('useCommandHelpMode', () => {
    it('initializes with isHelpMode false and toggles correctly', () => {
        const dismissOutputs = vi.fn();
        const requestHelp = vi.fn();

        const { result } = renderHook(() => useCommandHelpMode({ dismissOutputs, requestHelp }));

        expect(result.current.isHelpMode).toBe(false);

        act(() => {
            result.current.toggleHelpMode();
        });
        expect(result.current.isHelpMode).toBe(true);

        act(() => {
            result.current.toggleHelpMode();
        });
        expect(result.current.isHelpMode).toBe(false);
    });

    it('resolves the help topic, closes outputs, and calls requestHelp on executeHelp', () => {
        const dismissOutputs = vi.fn();
        const requestHelp = vi.fn();

        const { result } = renderHook(() => useCommandHelpMode({ dismissOutputs, requestHelp }));

        act(() => {
            result.current.setIsHelpMode(true);
        });
        expect(result.current.isHelpMode).toBe(true);

        act(() => {
            result.current.executeHelp("cast 'cure light' %n");
        });

        expect(result.current.isHelpMode).toBe(false);
        expect(dismissOutputs).toHaveBeenCalledTimes(1);
        expect(requestHelp).toHaveBeenCalledWith('cure light');
    });

    it('resolves direct verbs and aliases', () => {
        const dismissOutputs = vi.fn();
        const requestHelp = vi.fn();

        const { result } = renderHook(() => useCommandHelpMode({ dismissOutputs, requestHelp }));

        act(() => {
            result.current.executeHelp('con %n');
        });

        expect(dismissOutputs).toHaveBeenCalledTimes(1);
        expect(requestHelp).toHaveBeenCalledWith('consider');
    });

    it('does not request help when topic cannot be resolved', () => {
        const dismissOutputs = vi.fn();
        const requestHelp = vi.fn();

        const { result } = renderHook(() => useCommandHelpMode({ dismissOutputs, requestHelp }));

        act(() => {
            result.current.executeHelp('');
        });

        expect(requestHelp).not.toHaveBeenCalled();
    });
});
