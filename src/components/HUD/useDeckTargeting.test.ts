// @vitest-environment jsdom
/**
 * @file useDeckTargeting.test.ts
 * @description Unit tests for useDeckTargeting hook managing hold-to-target gestures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeckTargeting } from './useDeckTargeting';
import { useRoomStore } from '../../stores/useRoomStore';

describe('useDeckTargeting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useRoomStore.setState({
            chars: {
                'troll-1': { name: 'Cave Troll', targetName: 'troll', flags: 'aggressive', count: 1 } as any
            },
            items: {}
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('does not open target menu on quick tap (< 220ms) and delegates to handleClick/fire', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const triggerHaptic = vi.fn();
        const flashPressed = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: 'troll',
            setTarget,
            executeCommand,
            triggerHaptic,
            flashPressed,
            fire
        }));

        const killItem = { label: 'Kill', cmd: 'kill ', needsTarget: true };

        act(() => {
            result.current.handlePointerDown(killItem, { buttons: 1, pointerType: 'touch' } as any);
        });

        // Fast-forward only 50ms
        act(() => {
            vi.advanceTimersByTime(50);
        });

        act(() => {
            result.current.handlePointerUp(killItem, { buttons: 1, pointerType: 'touch' } as any);
            result.current.handleClick(killItem, { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
        });

        expect(result.current.isTargetMenuOpen).toBe(false);
        expect(fire).toHaveBeenCalledWith(killItem);
        expect(executeCommand).not.toHaveBeenCalled();
    });

    it('opens target menu on hold (>= 220ms) for targetable commands', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const triggerHaptic = vi.fn();
        const flashPressed = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: null,
            setTarget,
            executeCommand,
            triggerHaptic,
            flashPressed,
            fire
        }));

        const killItem = { label: 'Kill', cmd: 'kill ', needsTarget: true };

        act(() => {
            result.current.handlePointerDown(killItem, { buttons: 1, pointerType: 'touch' } as any);
        });

        act(() => {
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetMenuOpen).toBe(true);
        expect(result.current.activeItem).toEqual(killItem);
        expect(triggerHaptic).toHaveBeenCalledWith(20);
    });

    it('does not open target menu on hold for non-targetable commands like flee', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const triggerHaptic = vi.fn();
        const flashPressed = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: null,
            setTarget,
            executeCommand,
            triggerHaptic,
            flashPressed,
            fire
        }));

        const fleeItem = { label: 'Flee', cmd: 'flee', needsTarget: false };

        act(() => {
            result.current.handlePointerDown(fleeItem, { buttons: 1, pointerType: 'touch' } as any);
            vi.advanceTimersByTime(250);
        });

        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('executes command when target is selected from the open menu', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const triggerHaptic = vi.fn();
        const flashPressed = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: null,
            setTarget,
            executeCommand,
            triggerHaptic,
            flashPressed,
            fire
        }));

        const killItem = { label: 'Kill', cmd: 'kill ', needsTarget: true };

        act(() => {
            result.current.handlePointerDown(killItem, { buttons: 1, pointerType: 'touch' } as any);
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetMenuOpen).toBe(true);

        act(() => {
            result.current.handleSelectTarget('troll');
        });

        expect(setTarget).toHaveBeenCalledWith('troll');
        expect(executeCommand).toHaveBeenCalledWith('kill troll');
        expect(flashPressed).toHaveBeenCalledWith('Kill');
        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('auto-fires at existing target upon pointer up after holding', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const triggerHaptic = vi.fn();
        const flashPressed = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: 'orc',
            setTarget,
            executeCommand,
            triggerHaptic,
            flashPressed,
            fire
        }));

        const considerItem = { label: 'Consider', cmd: 'consider ', needsTarget: true };

        act(() => {
            result.current.handlePointerDown(considerItem, { buttons: 1, pointerType: 'touch' } as any);
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetMenuOpen).toBe(true);

        act(() => {
            result.current.handlePointerUp(considerItem, { buttons: 1, pointerType: 'touch' } as any);
        });

        expect(executeCommand).toHaveBeenCalledWith('consider orc');
        expect(flashPressed).toHaveBeenCalledWith('Consider');
        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('closes target menu on cancel', () => {
        const fire = vi.fn();
        const executeCommand = vi.fn();
        const setTarget = vi.fn();

        const { result } = renderHook(() => useDeckTargeting({
            target: null,
            setTarget,
            executeCommand,
            fire,
            flashPressed: vi.fn()
        }));

        const assistItem = { label: 'Assist', cmd: 'assist ', needsTarget: true };

        act(() => {
            result.current.handlePointerDown(assistItem, { buttons: 1, pointerType: 'touch' } as any);
            vi.advanceTimersByTime(230);
        });

        expect(result.current.isTargetMenuOpen).toBe(true);

        act(() => {
            result.current.handlePointerCancel();
        });

        expect(result.current.isTargetMenuOpen).toBe(false);
    });
});
