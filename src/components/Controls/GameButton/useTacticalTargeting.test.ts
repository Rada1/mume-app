// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTacticalTargeting } from './useTacticalTargeting';
import { clearCommandTargetMemory } from '../../../utils/commandTargetMemory';

describe('useTacticalTargeting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        clearCommandTargetMemory();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('does not open target column for quick tap before dwell threshold', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(100);
            result.current.cancelHoldTimer();
        });

        expect(result.current.isTargetColumnOpen).toBe(false);
        expect(result.current.resolveCommandWithTarget("cast 'fireball'")).toBe("cast 'fireball' Cave Orc");
    });

    it('opens target column after 220ms hold on targetable command', () => {
        const hapticMock = vi.fn();
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn(),
                triggerHaptic: hapticMock
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetColumnOpen).toBe(true);
        expect(hapticMock).toHaveBeenCalledWith(20);
    });

    it('keeps the target menu open and interactive after the swipe is released', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: null,
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer('hit');
            vi.advanceTimersByTime(230);
        });
        expect(result.current.isTargetMenuHeld).toBe(true);

        act(() => result.current.releaseTargetMenu());

        expect(result.current.isTargetColumnOpen).toBe(true);
        expect(result.current.isTargetMenuHeld).toBe(false);
    });

    it('defaults self-targeted spells to Self instead of the global target', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'heal'");
            vi.advanceTimersByTime(230);
        });

        expect(result.current.pendingTarget).toBe('self');
        expect(result.current.getEffectiveTarget("cast 'heal'")).toBe('self');
        expect(result.current.resolveCommandWithTarget("cast 'heal'")).toBe("cast 'heal' self");
    });

    it('defaults Ride and Lead holds to Mount instead of the global target', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        expect(result.current.getEffectiveTarget('ride')).toBeNull();
        act(() => {
            result.current.startHoldTimer('ride');
            vi.advanceTimersByTime(230);
        });

        expect(result.current.pendingTarget).toBe('mount');
        expect(result.current.resolveCommandWithTarget('ride')).toBe('ride mount');
    });

    it('does not apply the global target to Store or keyed spell menus', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        expect(result.current.getEffectiveTarget("cast 'store'")).toBeNull();
        expect(result.current.resolveCommandWithTarget("cast 'store'")).toBe("cast 'store'");
        expect(result.current.getEffectiveTarget("cast 'enchant'")).toBeNull();
        expect(result.current.resolveCommandWithTarget("cast 'enchant'")).toBe("cast 'enchant'");
        expect(result.current.getEffectiveTarget("cast 'portal'")).toBeNull();
        expect(result.current.resolveCommandWithTarget("cast 'portal'")).toBe("cast 'portal'");
    });

    it('does not open target column for untargetable commands on hold', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer('flee');
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetColumnOpen).toBe(false);
    });

    it('updates pending target and preview when a target candidate is selected', () => {
        const previewMock = vi.fn();
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: previewMock
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(230);
            result.current.handleSelectTarget('Town Guard', "cast 'fireball'");
        });

        expect(result.current.pendingTarget).toBe('Town Guard');
        expect(previewMock).toHaveBeenCalledWith("cast 'fireball' Town Guard");
        expect(result.current.resolveCommandWithTarget("cast 'fireball'")).toBe("cast 'fireball' Town Guard");
    });

    it('remembers targets independently for each command', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Global Target',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer('hit');
            vi.advanceTimersByTime(230);
            result.current.handleSelectTarget('Pony', 'hit');
            result.current.resetTargeting();
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(230);
            result.current.handleSelectTarget('Wolf', "cast 'fireball'");
        });

        expect(result.current.resolveCommandWithTarget('hit')).toBe('hit Pony');
        expect(result.current.resolveCommandWithTarget("cast 'fireball'")).toBe("cast 'fireball' Wolf");
    });

    it('does not fall back to the global target while its target menu is open and unselected', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(230);
        });

        expect(result.current.getEffectiveTarget("cast 'fireball'")).toBeNull();
        act(() => result.current.handleSelectTarget(null, "cast 'fireball'"));
        expect(result.current.pendingTarget).toBeNull();
    });

    it('keeps pending target selected and does not reset it on subsequent startHoldTimer calls while open', () => {
        const { result } = renderHook(() =>
            useTacticalTargeting({
                activeTarget: 'Cave Orc',
                isMobile: true,
                setCommandPreview: vi.fn()
            })
        );

        act(() => {
            result.current.startHoldTimer("cast 'fireball'");
            vi.advanceTimersByTime(230);
            result.current.handleSelectTarget('Town Guard', "cast 'fireball'");
        });

        expect(result.current.pendingTarget).toBe('Town Guard');

        // Emulate subpixel pointer jitter or preview update calling startHoldTimer while open
        act(() => {
            result.current.startHoldTimer("cast 'fireball' Town Guard");
            vi.advanceTimersByTime(100);
        });

        // Must still be Town Guard, never reset to null!
        expect(result.current.pendingTarget).toBe('Town Guard');
    });
});
