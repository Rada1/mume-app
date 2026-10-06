// @vitest-environment jsdom
/** @file Exercises autowalk with no visited rooms and interrupts during travel. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSmartWalk } from './useSmartWalk';
import type { NavigationMap } from '../../../types';

// --- Logic Section ---
const preloaded: NavigationMap = {
    '1': [0, 0, 0, 'city', { east: { target: '2' } }, 'Shop'],
    '2': [1, 0, 0, 'city', { east: { target: '3' } }, 'Path'],
    '3': [2, 0, 0, 'field', {}, 'Meadow'],
};
afterEach(cleanup);

function setup() {
    const execute = vi.fn((cmd: string) => {
        window.dispatchEvent(new CustomEvent('mume-command-sent', { detail: { cmd, isSystem: false } }));
    });
    const message = vi.fn();
    const hook = renderHook(({ room }) => useSmartWalk(room, {}, execute, { current: preloaded }, message, false, new Set()), {
        initialProps: { room: 'm_1' },
    });
    act(() => hook.result.current.startWalking('m_3'));
    return { ...hook, execute, message };
}

describe('autowalk control', () => {
    it('walks unvisited mapped rooms, issuing only one command per confirmed arrival', () => {
        const hook = setup();
        expect(hook.result.current.isWalking).toBe(true);
        expect(hook.execute.mock.calls.map(call => call[0])).toEqual(['e']);
        hook.rerender({ room: 'm_1' });
        expect(hook.execute).toHaveBeenCalledTimes(1);
        hook.rerender({ room: 'm_2' });
        expect(hook.execute.mock.calls.map(call => call[0])).toEqual(['e', 'e']);
        hook.rerender({ room: 'm_3' });
        expect(hook.result.current.isWalking).toBe(false);
    });

    it.each(['mume-command-sent', 'mume:numpad-command-press'])('manual input via %s cancels before a pending arrival', event => {
        const hook = setup();
        act(() => window.dispatchEvent(new CustomEvent(event, { detail: { cmd: 'n', isSystem: false } })));
        hook.rerender({ room: 'm_2' });
        expect(hook.result.current.isWalking).toBe(false);
        expect(hook.execute).toHaveBeenCalledTimes(1);
        expect(hook.message).toHaveBeenLastCalledWith('system', expect.stringContaining('manual control'));
    });

    it.each(['escape', 'failure', 'button'])('%s stops further commands after arrival', kind => {
        const hook = setup();
        act(() => {
            if (kind === 'escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            else if (kind === 'failure') window.dispatchEvent(new Event('mume-mapper-move-failed'));
            else hook.result.current.stopWalking();
        });
        hook.rerender({ room: 'm_2' });
        expect(hook.execute).toHaveBeenCalledTimes(1);
        expect(hook.result.current.isWalking).toBe(false);
    });

    it('stops on an unexpected room instead of continuing a potentially incorrect route', () => {
        const hook = setup();
        hook.rerender({ room: 'm_99' });
        expect(hook.execute).toHaveBeenCalledTimes(1);
        expect(hook.result.current.isWalking).toBe(false);
    });

    it('does not treat background system commands as manual takeover', () => {
        const hook = setup();
        act(() => window.dispatchEvent(new CustomEvent('mume-command-sent', { detail: { cmd: 'score', isSystem: true } })));
        hook.rerender({ room: 'm_2' });
        expect(hook.execute).toHaveBeenCalledTimes(2);
    });
});
