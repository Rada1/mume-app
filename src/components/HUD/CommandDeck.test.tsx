// @vitest-environment jsdom
/**
 * @file CommandDeck.test.tsx
 * @description Unit tests for CommandDeck button feedback on executed commands.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CommandDeck } from './CommandDeck';
import { useInputStore } from '../../stores/useInputStore';

const mockExecuteCommand = vi.hoisted(() => vi.fn());
vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: mockExecuteCommand,
        triggerHaptic: vi.fn(),
        viewport: { isMobile: true }
    }),
    useUI: () => ({ displayInventoryLines: [], displayEqLines: [] })
}));

describe('CommandDeck Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockExecuteCommand.mockClear();
        localStorage.setItem('mud-deck-tab', 'combat');
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
        localStorage.clear();
    });

    it('flashes Kill button when "kill troll" or "k troll" is executed', () => {
        render(<CommandDeck />);

        const killBtn = screen.getByRole('button', { name: /Kill/i });
        const fleeBtn = screen.getByRole('button', { name: /Flee/i });

        expect(killBtn.classList.contains('is-key-pressed')).toBe(false);

        // Dispatch command executed event for "kill troll"
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'kill troll' }
            }));
        });

        expect(killBtn.classList.contains('is-key-pressed')).toBe(true);
        expect(fleeBtn.classList.contains('is-key-pressed')).toBe(false);

        // Fast-forward past 140ms flash duration
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(killBtn.classList.contains('is-key-pressed')).toBe(false);

        // Test shorthand "k orc"
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'k orc' }
            }));
        });

        expect(killBtn.classList.contains('is-key-pressed')).toBe(true);
    });

    it('flashes Flee button when "flee" or "fl" is executed', () => {
        render(<CommandDeck />);

        const fleeBtn = screen.getByRole('button', { name: /Flee/i });

        expect(fleeBtn.classList.contains('is-key-pressed')).toBe(false);

        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'flee' }
            }));
        });

        expect(fleeBtn.classList.contains('is-key-pressed')).toBe(true);

        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(fleeBtn.classList.contains('is-key-pressed')).toBe(false);

        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'fl' }
            }));
        });

        expect(fleeBtn.classList.contains('is-key-pressed')).toBe(true);
    });

    it('primes deck command on number key when input is empty', () => {
        useInputStore.setState({ input: '' });
        render(<CommandDeck />);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
        });

        // 2 corresponds to Flee in combat tab
        expect(useInputStore.getState().input).toBe('flee');
    });

    it('does NOT hijack or overwrite existing input when typing numbers', () => {
        useInputStore.setState({ input: 'go ' });
        const inputEl = document.createElement('textarea');
        inputEl.id = 'mud-input';
        inputEl.value = 'go ';
        document.body.appendChild(inputEl);
        inputEl.focus();

        render(<CommandDeck />);

        act(() => {
            inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
        });

        // Should not have been overwritten with 'flee'
        expect(useInputStore.getState().input).toBe('go ');
        inputEl.remove();
    });

    it('does not show static command tiles when a mobile category is tapped', () => {
        render(<CommandDeck />);
        const personalTab = screen.getByRole('tab', { name: /Personal/i });
        fireEvent.click(personalTab);

        expect(screen.queryByRole('button', { name: 'Get' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Eat' })).toBeNull();
        expect(personalTab.classList.contains('is-active')).toBe(false);
    });

    it('highlights a command category only while its button is held', () => {
        render(<CommandDeck />);
        const combatTab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(combatTab, { pointerId: 9, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        expect(combatTab.classList.contains('is-pressed')).toBe(true);

        fireEvent.pointerUp(combatTab, { pointerId: 9, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        expect(combatTab.classList.contains('is-pressed')).toBe(false);
        expect(combatTab.classList.contains('is-active')).toBe(false);
    });

    it('fires a consumption command from the Consume swipe wheel', () => {
        render(<CommandDeck />);
        const consumeTab = screen.getByRole('tab', { name: /Consume actions/i });

        fireEvent.pointerDown(consumeTab, { pointerId: 1, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(consumeTab, { pointerId: 1, buttons: 1, clientX: 100, clientY: 150 });
        fireEvent.pointerUp(consumeTab, { pointerId: 1, button: 0, clientX: 100, clientY: 150 });

        expect(useInputStore.getState().input).toBe('smoke ');
    });

    it('fires Info from the Utility swipe wheel', () => {
        render(<CommandDeck />);
        fireEvent.click(screen.getByRole('tab', { name: /Utility actions/i }));
        const utilityTab = screen.getByRole('tab', { name: /Utility actions/i });

        fireEvent.pointerDown(utilityTab, { pointerId: 2, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(utilityTab, { pointerId: 2, buttons: 1, clientX: 50, clientY: 50 });
        fireEvent.pointerUp(utilityTab, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });

        expect(mockExecuteCommand).toHaveBeenCalledWith('info');
    });

    it('does not open a target menu for a short swipe on a target-taking command', () => {
        render(<CommandDeck />);
        const combatTab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(combatTab, { pointerId: 1, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(combatTab, { pointerId: 1, buttons: 1, clientX: 150, clientY: 100 });
        fireEvent.pointerUp(combatTab, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });

        expect(document.querySelector('.tactical-target-bar')).toBeNull();
        expect(useInputStore.getState().input).toBe('kill ');
        expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it('leaves the target menu open after a long directional swipe is released', () => {
        render(<CommandDeck />);
        const combatTab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(combatTab, { pointerId: 4, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(combatTab, { pointerId: 4, buttons: 1, clientX: 150, clientY: 100 });
        act(() => { vi.advanceTimersByTime(220); });
        fireEvent.pointerUp(combatTab, { pointerId: 4, button: 0, pointerType: 'touch', clientX: 150, clientY: 100 });

        expect(screen.getByText(/TARGETS/)).toBeTruthy();
        expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it('keeps Drink Water out of the Room buttons', () => {
        render(<CommandDeck />);
        fireEvent.click(screen.getByRole('tab', { name: /Room/i }));
        expect(screen.queryByText('Drink Water', { selector: '.deck-slot-label' })).toBeNull();
    });

    it('sends Assist from the Combat swipe wheel without opening the command input', () => {
        useInputStore.setState({ input: '' });
        render(<CommandDeck />);
        const combatTab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(combatTab, { pointerId: 1, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(combatTab, { pointerId: 1, buttons: 1, clientX: 50, clientY: 150 });
        fireEvent.pointerUp(combatTab, { pointerId: 1, button: 0, clientX: 50, clientY: 150 });

        expect(mockExecuteCommand).toHaveBeenCalledWith('assist');
        expect(useInputStore.getState().input).toBe('');
    });
});
