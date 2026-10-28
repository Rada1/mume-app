// @vitest-environment jsdom
/** @file useMobileTargetPopoverPosition.test.tsx — Mobile target anchor placement and scrolling. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { positionMobileTargetPopover, useMobileTargetPopoverPosition } from './useMobileTargetPopoverPosition';
import type { PopoverState } from '../types';

// --- Placement ---
it('places the popover near the text and keeps it within its bounds', () => {
    const bounds = { left: 8, top: 20, width: 300, height: 400 };
    expect(positionMobileTargetPopover({ left: 280, top: 40, width: 20, height: 20 }, bounds, 180, 100))
        .toEqual({ left: 128, top: 20 });
    expect(positionMobileTargetPopover({ left: 40, top: 390, width: 30, height: 20 }, bounds, 180, 100))
        .toEqual({ left: 40, top: 284 });
});

afterEach(() => { cleanup(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

it('stays in place when the selected log text moves or leaves the log', () => {
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { nextFrame = callback; return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const log = document.createElement('div');
    log.className = 'message-log';
    log.getBoundingClientRect = () => new DOMRect(0, 100, 320, 400);
    const source = document.createElement('span');
    source.className = 'inline-btn';
    let sourceTop = 200;
    source.getBoundingClientRect = () => new DOMRect(50, sourceTop, 40, 20);
    log.append(source);
    const panel = document.createElement('div');
    Object.defineProperties(panel, { offsetWidth: { value: 200 }, offsetHeight: { value: 100 } });
    document.body.append(log, panel);
    const request: PopoverState = { x: 70, y: 220, setId: 'cat-npc', entityId: 'elf',
        sourceRect: { left: 50, top: 200, width: 40, height: 20 } };
    const ref = { current: panel };
    renderHook(() => useMobileTargetPopoverPosition(ref, true, request));
    expect(panel.style.getPropertyValue('--target-popover-top')).toBe('104px');

    sourceTop = 250;
    act(() => { log.dispatchEvent(new Event('scroll')); nextFrame?.(0); });
    expect(panel.style.getPropertyValue('--target-popover-top')).toBe('104px');
    sourceTop = 510;
    act(() => { log.dispatchEvent(new Event('scroll')); nextFrame?.(0); });
    expect(panel.style.getPropertyValue('--target-popover-top')).toBe('104px');
    source.remove();
    act(() => { window.dispatchEvent(new Event('resize')); nextFrame?.(0); });
    expect(panel.style.getPropertyValue('--target-popover-top')).toBe('104px');
});

