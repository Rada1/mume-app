// @vitest-environment jsdom
/**
 * @file QuickButtonBar.test.tsx
 * @description Unit tests for QuickButtonBar button feedback on executed commands.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QuickButtonBar } from './QuickButtonBar';
import { useUIStore } from '../../stores/useUIStore';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn()
    })
}));

describe('QuickButtonBar Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useUIStore.setState({
            quickButtons: [
                { id: 'qb-1', label: 'Heal', command: "cast 'heal' me" },
                { id: 'qb-2', label: 'Rest', command: 'rest' }
            ]
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('flashes matching quick button when command is executed', () => {
        render(<QuickButtonBar />);

        const healBtn = screen.getByRole('button', { name: /Heal/i });
        const restBtn = screen.getByRole('button', { name: /Rest/i });

        expect(healBtn.classList.contains('is-key-pressed')).toBe(false);
        expect(restBtn.classList.contains('is-key-pressed')).toBe(false);

        // Execute "rest"
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'rest' }
            }));
        });

        expect(restBtn.classList.contains('is-key-pressed')).toBe(true);
        expect(healBtn.classList.contains('is-key-pressed')).toBe(false);

        // Fast forward 150ms
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(restBtn.classList.contains('is-key-pressed')).toBe(false);
    });
});
