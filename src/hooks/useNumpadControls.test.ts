// @vitest-environment jsdom
/**
 * @file useNumpadControls.test.ts
 * @description Unit tests for numpad keyboard controls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNumpadControls } from './useNumpadControls';

describe('useNumpadControls', () => {
    let executeCommand: ReturnType<typeof vi.fn<(cmd: string) => void>>;
    let getExitState: ReturnType<typeof vi.fn<(dir: string) => { hasDoor: boolean; isClosed: boolean } | null>>;

    beforeEach(() => {
        executeCommand = vi.fn<(cmd: string) => void>();
        getExitState = vi.fn<(dir: string) => { hasDoor: boolean; isClosed: boolean } | null>();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('moves while the docked command input is focused', () => {
        renderHook(() => useNumpadControls(executeCommand));
        const input = document.createElement('input');
        input.id = 'mud-input';
        input.className = 'docked-input-field input-field';
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent('keydown', {
            key: '8', code: 'Numpad8', location: 3, bubbles: true, cancelable: true
        });
        input.dispatchEvent(event);

        expect(executeCommand).toHaveBeenCalledWith('n');
        expect(event.defaultPrevented).toBe(true);
    });

    it('triggers north command on Numpad 8 when NumLock is off (key: ArrowUp, location: 3)', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'Numpad8',
            location: 3,
            bubbles: true,
            cancelable: true,
        });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        const preventSpy = vi.spyOn(event, 'preventDefault');

        window.dispatchEvent(event);

        expect(executeCommand).toHaveBeenCalledWith('n');
        expect(stopSpy).toHaveBeenCalled();
        expect(preventSpy).toHaveBeenCalled();
    });

    it('triggers south command on Numpad 2 when NumLock is off (key: ArrowDown, location: 3)', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'Numpad2',
            location: 3,
            bubbles: true,
            cancelable: true,
        });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        const preventSpy = vi.spyOn(event, 'preventDefault');

        window.dispatchEvent(event);

        expect(executeCommand).toHaveBeenCalledWith('s');
        expect(stopSpy).toHaveBeenCalled();
        expect(preventSpy).toHaveBeenCalled();
    });

    it('triggers north command on Numpad 8 when NumLock is on (key: 8, location: 3)', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const event = new KeyboardEvent('keydown', {
            key: '8',
            code: 'Numpad8',
            location: 3,
            bubbles: true,
            cancelable: true,
        });

        window.dispatchEvent(event);

        expect(executeCommand).toHaveBeenCalledWith('n');
    });

    it('does NOT trigger when standard ArrowUp is pressed (location: 0, code: ArrowUp)', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'ArrowUp',
            location: 0,
            bubbles: true,
            cancelable: true,
        });
        const stopSpy = vi.spyOn(event, 'stopPropagation');

        window.dispatchEvent(event);

        expect(executeCommand).not.toHaveBeenCalled();
        expect(stopSpy).not.toHaveBeenCalled();
    });

    it('handles numpad navigation when focused inside .input-field', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const textarea = document.createElement('textarea');
        textarea.className = 'input-field';
        document.body.appendChild(textarea);
        textarea.focus();

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'Numpad8',
            location: 3,
            bubbles: true,
            cancelable: true,
        });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        const preventSpy = vi.spyOn(event, 'preventDefault');

        textarea.dispatchEvent(event);

        expect(executeCommand).toHaveBeenCalledWith('n');
        expect(stopSpy).toHaveBeenCalled();
        expect(preventSpy).toHaveBeenCalled();
    });

    it('ignores numpad navigation when focused inside a non-chat input (e.g. search box)', () => {
        renderHook(() => useNumpadControls(executeCommand));

        const input = document.createElement('input');
        input.className = 'search-box';
        document.body.appendChild(input);
        input.focus();

        const event = new KeyboardEvent('keydown', {
            key: '8',
            code: 'Numpad8',
            location: 3,
            bubbles: true,
            cancelable: true,
        });
        const stopSpy = vi.spyOn(event, 'stopPropagation');
        const preventSpy = vi.spyOn(event, 'preventDefault');

        input.dispatchEvent(event);

        expect(executeCommand).not.toHaveBeenCalled();
        expect(stopSpy).not.toHaveBeenCalled();
        expect(preventSpy).not.toHaveBeenCalled();
    });

    it('handles Alt+numpad door toggle', () => {
        getExitState.mockReturnValue({ hasDoor: true, isClosed: true });
        renderHook(() => useNumpadControls(executeCommand, getExitState));

        const event = new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'Numpad8',
            location: 3,
            altKey: true,
            bubbles: true,
            cancelable: true,
        });

        window.dispatchEvent(event);

        expect(getExitState).toHaveBeenCalledWith('n');
        expect(executeCommand).toHaveBeenCalledWith('open n');
    });
});
