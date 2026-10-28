// @vitest-environment jsdom
/** @file useHeldTargetHover.test.ts — Captured holds preview targets and navigate without executing leaves. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { getHeldTarget, useHeldTargetHover } from './useHeldTargetHover';
import { heldTargetPreviewRef } from '../utils/heldTargetPreview';

// --- Target lane fixtures ---
const createTargets = () => {
    const lane = document.createElement('div');
    lane.setAttribute('data-mobile-tile-target-lane', 'true');
    lane.innerHTML = '<section class="command-tree-branch"><button aria-expanded="false">Source</button><button>Final target</button><button disabled>Unavailable</button></section>';
    document.body.append(lane);
    return Array.from(lane.querySelectorAll('button'));
};
afterEach(() => { cleanup(); document.body.replaceChildren(); });

// --- Held feedback and branch navigation ---
describe('held target hover', () => {
    it('publishes the target preview through its wrapper without executing it', () => {
        const [, target] = createTargets();
        const preview = vi.fn();
        const execute = vi.fn();
        target.addEventListener('click', execute);
        const detach = heldTargetPreviewRef(preview)(target.parentElement!);
        const { result } = renderHook(() => useHeldTargetHover(vi.fn()));
        act(() => result.current.update(target));
        expect(preview).toHaveBeenCalledTimes(1);
        expect(execute).not.toHaveBeenCalled();
        if (typeof detach === 'function') detach();
    });
    it('opens a branch once on entry and only highlights its final target', () => {
        const [source, target] = createTargets();
        const navigate = vi.fn(() => source.setAttribute('aria-expanded', 'true'));
        const execute = vi.fn();
        source.addEventListener('click', navigate);
        target.addEventListener('click', execute);
        const haptic = vi.fn();
        const { result } = renderHook(() => useHeldTargetHover(haptic));
        act(() => { result.current.update(source); result.current.update(source); });
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(haptic).toHaveBeenCalledTimes(1);
        expect(source.classList.contains('mobile-target-held-hover')).toBe(true);
        act(() => result.current.update(target));
        expect(source.classList.contains('mobile-target-held-hover')).toBe(false);
        expect(target.classList.contains('mobile-target-held-hover')).toBe(true);
        expect(haptic).toHaveBeenCalledTimes(2);
        expect(execute).not.toHaveBeenCalled();
        // Explicit taps keep their normal execution handler.
        target.click();
        expect(execute).toHaveBeenCalledTimes(1);
        act(() => result.current.clear());
        expect(target.classList.contains('mobile-target-held-hover')).toBe(false);
    });

    it('navigates location selectors without repeatedly activating a selected location', () => {
        const [location] = createTargets();
        location.removeAttribute('aria-expanded');
        location.parentElement!.classList.add('is-target-location-branch');
        const choose = vi.fn(() => location.setAttribute('aria-pressed', 'true'));
        location.addEventListener('click', choose);
        const { result, unmount } = renderHook(() => useHeldTargetHover(vi.fn()));
        act(() => result.current.update(location));
        act(() => result.current.update(null));
        act(() => result.current.update(location));
        expect(choose).toHaveBeenCalledTimes(1);
        unmount();
        expect(location.classList.contains('mobile-target-held-hover')).toBe(false);
    });

    it('ignores disabled targets and commands outside the target lane', () => {
        const [, , disabled] = createTargets();
        expect(getHeldTarget(disabled)).toBeNull();
        const command = document.createElement('button');
        document.body.append(command);
        expect(getHeldTarget(command)).toBeNull();
    });
});
