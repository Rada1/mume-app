// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTacticalTargeting } from './useTacticalTargeting';

describe('useTacticalTargeting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
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
