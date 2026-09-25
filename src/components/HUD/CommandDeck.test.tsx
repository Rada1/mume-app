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

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn()
    })
}));

describe('CommandDeck Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
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
});
