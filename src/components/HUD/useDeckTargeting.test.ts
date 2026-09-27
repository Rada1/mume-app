// @vitest-environment jsdom
/**
 * @file useDeckTargeting.test.ts
 * @description Unit tests for useDeckTargeting hook managing hold-to-target gestures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PointerEvent } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDeckTargeting } from './useDeckTargeting';
import { useRoomStore } from '../../stores/useRoomStore';
import type { DrawerLine } from '../../types';

describe('useDeckTargeting', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useRoomStore.setState({
            chars: {
                1: { name: 'Cave Troll', keyword: 'troll', flags: ['aggressive'] }
            },
            items: []
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

        expect(setTarget).not.toHaveBeenCalled();
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

    it('closes the Assist target menu on release without selecting a target', () => {
        const executeCommand = vi.fn();
        const { result } = renderHook(() => useDeckTargeting({
            target: 'orc', setTarget: vi.fn(), executeCommand,
            flashPressed: vi.fn(), fire: vi.fn()
        }));
        const assistItem = { label: 'Assist', cmd: 'assist ', needsTarget: false, holdOpensMenuOnly: true };

        act(() => {
            result.current.handlePointerDown(assistItem, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            vi.advanceTimersByTime(230);
            result.current.handlePointerUp(assistItem, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
        });

        expect(result.current.isTargetMenuOpen).toBe(false);
        expect(executeCommand).not.toHaveBeenCalled();
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

    it('offers inventory targets for Personal commands without using the combat target', () => {
        const executeCommand = vi.fn();
        const setTarget = vi.fn();
        const inventoryLines: DrawerLine[] = [
            { id: 'flask-1', text: 'a dark flask', html: '', context: 'flask', isItem: true },
        ];
        const item = { label: 'Drink', cmd: 'drink ', needsTarget: true, targetKind: 'inventory' as const };
        const { result } = renderHook(() => useDeckTargeting({
            target: 'troll', setTarget, executeCommand, fire: vi.fn(), flashPressed: vi.fn(), inventoryLines,
        }));

        act(() => {
            result.current.handlePointerDown(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            vi.advanceTimersByTime(230);
        });
        expect(result.current.targetSuggestions?.[0].value).toBe('flask');
        expect(result.current.targetSuggestions?.map(suggestion => suggestion.value)).toContain('water');
        expect(executeCommand).not.toHaveBeenCalled();

        act(() => result.current.handleSelectTarget('flask'));
        expect(executeCommand).toHaveBeenCalledWith('drink flask');
        expect(setTarget).not.toHaveBeenCalled();
    });

    it('offers water for Drink even without a water item in inventory', () => {
        const executeCommand = vi.fn();
        const item = { label: 'Drink', cmd: 'drink ', needsTarget: true, targetKind: 'inventory' as const };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, fire: vi.fn(), flashPressed: vi.fn(),
        }));
        act(() => {
            result.current.handlePointerDown(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            vi.advanceTimersByTime(230);
        });
        expect(result.current.targetSuggestions?.map(suggestion => suggestion.value)).toEqual(['water']);
        act(() => result.current.handleSelectTarget('water'));
        expect(executeCommand).toHaveBeenCalledWith('drink water');
    });

    it('closes an unselected Personal menu on release without firing its tap command', () => {
        const fire = vi.fn();
        const item = { label: 'Drink', cmd: 'drink ', needsTarget: true, targetKind: 'inventory' as const };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand: vi.fn(), fire, flashPressed: vi.fn(),
        }));
        act(() => {
            result.current.handlePointerDown(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            vi.advanceTimersByTime(230);
            result.current.handlePointerUp(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            result.current.handleClick(item, { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as React.MouseEvent<HTMLButtonElement>);
        });
        expect(result.current.isTargetMenuOpen).toBe(false);
        expect(fire).not.toHaveBeenCalled();
    });

    it('keeps a category target menu open after release when no target was selected', () => {
        const executeCommand = vi.fn();
        const item = { label: 'Kill', cmd: 'kill ', needsTarget: true };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, fire: vi.fn(), flashPressed: vi.fn(),
        }));

        act(() => result.current.openTargetMenuFor(item, 17));
        expect(result.current.isTargetMenuOpen).toBe(true);

        act(() => result.current.releaseHeldTargetMenu(17));

        expect(result.current.isTargetMenuOpen).toBe(true);
        expect(executeCommand).not.toHaveBeenCalled();
    });

    it('fires a category command when its target is tapped after releasing the long swipe', () => {
        const executeCommand = vi.fn();
        const item = { label: 'Kill', cmd: 'kill ', needsTarget: true };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, fire: vi.fn(), flashPressed: vi.fn(),
        }));

        act(() => result.current.openTargetMenuFor(item, 19));
        act(() => result.current.releaseHeldTargetMenu(19));
        act(() => result.current.handleSelectTarget('troll'));

        expect(executeCommand).toHaveBeenCalledWith('kill troll');
        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('waits for the initiating finger to release before firing a selected category target', () => {
        const executeCommand = vi.fn();
        const item = { label: 'Kill', cmd: 'kill ', needsTarget: true };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, fire: vi.fn(), flashPressed: vi.fn(),
        }));

        act(() => result.current.openTargetMenuFor(item, 23));
        act(() => result.current.handleSelectTarget('troll'));
        expect(executeCommand).not.toHaveBeenCalled();
        expect(result.current.isTargetMenuOpen).toBe(true);

        act(() => result.current.releaseHeldTargetMenu(23));

        expect(executeCommand).toHaveBeenCalledWith('kill troll');
        expect(result.current.isTargetMenuOpen).toBe(false);
    });

    it('chooses an inventory item and then a recipient for Give', () => {
        const executeCommand = vi.fn();
        const inventoryLines: DrawerLine[] = [
            { id: 'gem-1', text: 'a red gem', html: '', context: 'gem', isItem: true },
        ];
        const item = { label: 'Give', cmd: 'give ', needsTarget: true, targetKind: 'inventory-recipient' as const };
        const { result } = renderHook(() => useDeckTargeting({
            target: null, setTarget: vi.fn(), executeCommand, fire: vi.fn(), flashPressed: vi.fn(), inventoryLines,
        }));
        act(() => {
            result.current.handlePointerDown(item, { buttons: 1, pointerType: 'touch' } as PointerEvent<HTMLButtonElement>);
            vi.advanceTimersByTime(230);
        });
        act(() => result.current.handleSelectTarget('gem'));
        expect(result.current.targetMenuTitle).toBe('SELECT ARGUMENTS');
        expect(executeCommand).not.toHaveBeenCalled();

        act(() => result.current.handleSelectTarget('troll'));
        expect(executeCommand).toHaveBeenCalledWith('give gem troll');
    });
});
