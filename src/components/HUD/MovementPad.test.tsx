// @vitest-environment jsdom
/**
 * @file MovementPad.test.tsx
 * @description Unit tests for MovementPad exit dimming and manual movement command feedback.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MovementPad } from './MovementPad';
import { useRoomStore } from '../../stores/useRoomStore';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn()
    })
}));

describe('MovementPad Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        useRoomStore.setState({
            exits: [],
            rawExits: {}
        });
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('dims non-valid movement directions when room has specific exits', () => {
        // Room only has North and West exits
        useRoomStore.setState({
            exits: ['n', 'w'],
            rawExits: { n: 100, w: 101 }
        });

        render(<MovementPad />);

        const northBtn = screen.getByRole('button', { name: /North/i });
        const westBtn = screen.getByRole('button', { name: /West/i });
        const southBtn = screen.getByRole('button', { name: /South/i });
        const eastBtn = screen.getByRole('button', { name: /East/i });
        const upBtn = screen.getByRole('button', { name: /Up/i });
        const downBtn = screen.getByRole('button', { name: /Down/i });
        const lookBtn = screen.getByRole('button', { name: /Look/i });
        const exitsBtn = screen.getByRole('button', { name: /Exits/i });
        const scanBtn = screen.getByRole('button', { name: /Scan/i });

        // Valid movement directions
        expect(northBtn.classList.contains('is-valid-exit')).toBe(true);
        expect(northBtn.classList.contains('is-dimmed')).toBe(false);
        expect(westBtn.classList.contains('is-valid-exit')).toBe(true);
        expect(westBtn.classList.contains('is-dimmed')).toBe(false);

        // Non-valid movement directions should be dimmed
        expect(southBtn.classList.contains('is-dimmed')).toBe(true);
        expect(southBtn.classList.contains('is-no-exit')).toBe(true);
        expect(eastBtn.classList.contains('is-dimmed')).toBe(true);
        expect(eastBtn.classList.contains('is-no-exit')).toBe(true);
        expect(upBtn.classList.contains('is-dimmed')).toBe(true);
        expect(upBtn.classList.contains('is-no-exit')).toBe(true);
        expect(downBtn.classList.contains('is-dimmed')).toBe(true);
        expect(downBtn.classList.contains('is-no-exit')).toBe(true);

        // Actions are not movement directions and should never be dimmed
        expect(lookBtn.classList.contains('is-dimmed')).toBe(false);
        expect(exitsBtn.classList.contains('is-dimmed')).toBe(false);
        expect(scanBtn.classList.contains('is-dimmed')).toBe(false);
    });

    it('dims closed door exits with is-closed-door indicator', () => {
        // Room has North (closed door) and South (open exit)
        useRoomStore.setState({
            exits: ['n', 's'],
            rawExits: {
                n: { closed: true, flags: ['closed', 'door'] },
                s: 200
            }
        });

        render(<MovementPad />);

        const northBtn = screen.getByRole('button', { name: /North/i });
        const southBtn = screen.getByRole('button', { name: /South/i });

        // North is closed door -> dimmed + is-closed-door
        expect(northBtn.classList.contains('is-dimmed')).toBe(true);
        expect(northBtn.classList.contains('is-closed-door')).toBe(true);
        expect(northBtn.getAttribute('title')).toContain('Closed door');

        // South is open -> valid exit
        expect(southBtn.classList.contains('is-valid-exit')).toBe(true);
        expect(southBtn.classList.contains('is-dimmed')).toBe(false);
    });

    it('flashes visual feedback button when mume:movement-command-press event is dispatched', () => {
        render(<MovementPad />);

        const northBtn = screen.getByRole('button', { name: /North/i });
        const westBtn = screen.getByRole('button', { name: /West/i });

        expect(northBtn.classList.contains('is-key-pressed')).toBe(false);
        expect(westBtn.classList.contains('is-key-pressed')).toBe(false);

        // Dispatch movement command press event for 'n' (e.g. user typed "north")
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:movement-command-press', { detail: { cmd: 'n' } }));
        });

        expect(northBtn.classList.contains('is-key-pressed')).toBe(true);
        expect(westBtn.classList.contains('is-key-pressed')).toBe(false);

        // Advance timers to clear flash
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(northBtn.classList.contains('is-key-pressed')).toBe(false);

        // Dispatch movement command press event for 'w' (e.g. user typed "west")
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:movement-command-press', { detail: { cmd: 'w' } }));
        });

        expect(westBtn.classList.contains('is-key-pressed')).toBe(true);
        expect(northBtn.classList.contains('is-key-pressed')).toBe(false);

        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(westBtn.classList.contains('is-key-pressed')).toBe(false);
    });
});
