// @vitest-environment jsdom
/**
 * @file useSwipeUpToMinimize.test.ts
 * @description Verifies mobile panel swipe and scroll behavior.
 */

import { act, renderHook } from '@testing-library/react';
import type { TouchEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSwipeUpToMinimize } from './useSwipeUpToMinimize';

const touchEvent = (root: HTMLElement, target: HTMLElement, x: number, y: number): TouchEvent<HTMLElement> => ({
    currentTarget: root,
    target,
    touches: [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }],
}) as unknown as TouchEvent<HTMLElement>;

describe('useSwipeUpToMinimize', () => {
    it('minimizes on an upward swipe but ignores a sideways swipe', () => {
        const minimize = vi.fn();
        const root = document.createElement('section');
        const { result } = renderHook(() => useSwipeUpToMinimize(true, minimize));
        act(() => {
            result.current.onTouchStart(touchEvent(root, root, 50, 120));
            result.current.onTouchEnd(touchEvent(root, root, 52, 60));
            result.current.onTouchStart(touchEvent(root, root, 50, 120));
            result.current.onTouchEnd(touchEvent(root, root, 120, 60));
        });
        expect(minimize).toHaveBeenCalledTimes(1);
    });

    it('lets expanded content scroll before minimizing', () => {
        const minimize = vi.fn();
        const root = document.createElement('section');
        const scrollRegion = document.createElement('div');
        scrollRegion.className = 'this-is-you-body-wrapper';
        root.append(scrollRegion);
        Object.defineProperty(scrollRegion, 'scrollHeight', { value: 400 });
        Object.defineProperty(scrollRegion, 'clientHeight', { value: 200 });
        const { result } = renderHook(() => useSwipeUpToMinimize(true, minimize));
        act(() => {
            result.current.onTouchStart(touchEvent(root, scrollRegion, 50, 120));
            result.current.onTouchEnd(touchEvent(root, scrollRegion, 50, 60));
        });
        expect(minimize).not.toHaveBeenCalled();
    });
});
