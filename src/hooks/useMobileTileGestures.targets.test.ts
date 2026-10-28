// @vitest-environment jsdom
/** @file useMobileTileGestures.targets.test.ts — Held target navigation and single execution on release. */
import type React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMobileTileGestures } from './useMobileTileGestures';
import { COMMAND_TREE_SOCIAL_BUTTON } from '../utils/commandTreeSocial';

vi.mock('./useGearPanelData', () => ({ useGearPanelData: () => {} }));
const edgeScrollStart = vi.hoisted(() => vi.fn());
vi.mock('./useHeldCommandEdgeScroll', () => ({ useHeldCommandEdgeScroll: () => ({
    scrollRef: { current: null }, start: edgeScrollStart, stop: vi.fn(), update: vi.fn()
}) }));

// --- Captured hold fixture ---
const setup = () => {
    vi.useFakeTimers();
    const tile = { id: 'gear', label: 'Gear', button: { id: 'give', command: 'give %n', label: 'Give' },
        commands: [{ id: 'give', command: 'give %n', label: 'Give' }] } as unknown as Parameters<typeof useMobileTileGestures>[0][number];
    const sent = { current: false };
    const execute = vi.fn();
    const haptic = vi.fn();
    const button = document.createElement('button');
    button.setPointerCapture = vi.fn();
    button.hasPointerCapture = () => true;
    button.releasePointerCapture = vi.fn();
    document.body.innerHTML = '<div data-mobile-tile-target-lane><section class="command-tree-branch"><button aria-expanded="false">Source</button><button>Recipient</button></section></div>';
    const [source, recipient] = Array.from(document.querySelectorAll('button'));
    let underFinger: Element | null = source;
    const originalHitTest = document.elementFromPoint;
    document.elementFromPoint = () => underFinger;
    const event = { button: 0, pointerId: 1, clientX: 200, clientY: 100, currentTarget: button } as unknown as React.PointerEvent<HTMLButtonElement>;
    const { result } = renderHook(() => useMobileTileGestures([tile], vi.fn(), execute, haptic, sent));
    act(() => result.current.handlers(tile).onPointerDown(event));
    act(() => vi.advanceTimersByTime(220));
    return { result, tile, event, source, recipient, execute, sent,
        move: (element: Element) => { underFinger = element; act(() => result.current.handlers(tile).onPointerMove(event)); },
        restore: () => { document.elementFromPoint = originalHitTest; } };
};
afterEach(() => { cleanup(); edgeScrollStart.mockClear(); vi.useRealTimers(); document.body.replaceChildren(); });

// --- Staged target execution ---
describe('mobile held targets', () => {
    it('sends the chosen social on tap and opens the themed chooser on hold', () => {
        vi.useFakeTimers();
        const smile = { ...COMMAND_TREE_SOCIAL_BUTTON, id: 'v2-social-smile', command: 'smile', label: 'Smile' };
        const tile = { id: 'social', label: 'Social', button: smile,
            commands: [smile] } as unknown as Parameters<typeof useMobileTileGestures>[0][number];
        const openTarget = vi.fn();
        const execute = vi.fn();
        const button = document.createElement('button');
        button.setPointerCapture = vi.fn();
        button.hasPointerCapture = () => true;
        button.releasePointerCapture = vi.fn();
        const event = { button: 0, pointerId: 1, clientX: 100, clientY: 100, currentTarget: button } as unknown as React.PointerEvent<HTMLButtonElement>;
        const { result } = renderHook(() => useMobileTileGestures([tile], openTarget, execute, vi.fn(), { current: false }));
        act(() => result.current.handlers(tile).onPointerDown(event));
        act(() => result.current.handlers(tile).onPointerUp(event));
        expect(execute).toHaveBeenCalledWith(smile, event);
        expect(result.current.activeTile).toBeUndefined();
        act(() => result.current.handlers(tile).onPointerDown(event));
        act(() => vi.advanceTimersByTime(220));
        expect(openTarget).toHaveBeenLastCalledWith(COMMAND_TREE_SOCIAL_BUTTON);
        expect(result.current.activeTile?.id).toBe('social');
    });

    it('starts edge scrolling only after deliberate movement following menu reveal', () => {
        const hold = setup();
        expect(edgeScrollStart).not.toHaveBeenCalled();
        act(() => hold.result.current.handlers(hold.tile).onPointerMove({ ...hold.event, clientY: 105 }));
        expect(edgeScrollStart).not.toHaveBeenCalled();
        act(() => hold.result.current.handlers(hold.tile).onPointerMove({ ...hold.event, clientY: 113 }));
        expect(edgeScrollStart).toHaveBeenCalledTimes(1);
        hold.restore();
    });
    it('opens a source while held and executes only the final recipient on release', () => {
        const hold = setup();
        const navigate = vi.fn(() => hold.source.setAttribute('aria-expanded', 'true'));
        const fire = vi.fn(() => { hold.sent.current = true; });
        hold.source.addEventListener('click', navigate);
        hold.recipient.addEventListener('click', fire);
        hold.move(hold.source);
        expect(navigate).toHaveBeenCalledTimes(1);
        hold.move(hold.recipient);
        expect(fire).not.toHaveBeenCalled();
        act(() => hold.result.current.handlers(hold.tile).onPointerUp(hold.event));
        act(() => vi.runAllTimers());
        expect(fire).toHaveBeenCalledTimes(1);
        expect(hold.execute).not.toHaveBeenCalled();
        hold.restore();
    });

    it('does not repeat a target action already fired by a second finger', () => {
        const hold = setup();
        const fire = vi.fn(() => { hold.sent.current = true; });
        hold.recipient.addEventListener('click', fire);
        hold.move(hold.recipient);
        act(() => hold.recipient.click());
        act(() => hold.result.current.handlers(hold.tile).onPointerUp(hold.event));
        act(() => vi.runAllTimers());
        expect(fire).toHaveBeenCalledTimes(1);
        expect(hold.execute).not.toHaveBeenCalled();
        hold.restore();
    });
});
