// @vitest-environment jsdom
/** @file useMobileGroupControl.test.ts — Desktop group previews retain tap-to-pin behavior. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { PointerEvent } from 'react';
import { useMobileGroupControl } from './useMobileGroupControl';

// --- Game and entity boundaries ---
const game = vi.hoisted(() => ({ viewport: { isMobile: false }, isSpectateMode: false, executeCommand: vi.fn(), triggerHaptic: vi.fn() }));
vi.mock('../context/GameContext', () => ({ useGame: () => game }));
vi.mock('./useRoomEntitiesPanel', () => ({ useRoomEntitiesPanel: () => ({ members: [], otherEntities: [], entries: [] }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); Reflect.deleteProperty(document, 'elementFromPoint'); game.viewport.isMobile = false; });

// --- Preview and explicit selection ---
it('lets a hovered group menu be pinned and closed with clicks', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMobileGroupControl());
    const mouse = { pointerType: 'mouse' } as PointerEvent<HTMLElement>;
    act(() => result.current.hoverEnter(mouse));
    expect(result.current.open).toBe(true);
    act(() => result.current.click());
    act(() => { result.current.hoverLeave(mouse); vi.advanceTimersByTime(180); });
    expect(result.current.open).toBe(true);
    act(() => result.current.click());
    expect(result.current.open).toBe(false);
    expect(game.executeCommand).not.toHaveBeenCalled();
});

it('still sends the selected group target on a mobile hold and swipe', () => {
    vi.useFakeTimers();
    game.viewport.isMobile = true;
    const target = document.createElement('button');
    target.dataset.groupTarget = 'horse';
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => target) });
    const { result } = renderHook(() => useMobileGroupControl());
    const press = { button: 0, pointerId: 1, currentTarget: { setPointerCapture: vi.fn() } } as unknown as PointerEvent<HTMLButtonElement>;
    act(() => { result.current.pointerDown(press); vi.advanceTimersByTime(220); });
    expect(result.current.open).toBe(true);
    act(() => result.current.pointerMove({ clientX: 10, clientY: 10 } as PointerEvent<HTMLButtonElement>));
    act(() => result.current.pointerEnd(false));
    expect(game.executeCommand).toHaveBeenCalledExactlyOnceWith('group horse');
    expect(result.current.open).toBe(false);
});
