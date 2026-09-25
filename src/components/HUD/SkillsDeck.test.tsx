// @vitest-environment jsdom
/**
 * @file SkillsDeck.test.tsx
 * @description Unit tests for SkillsDeck button feedback on executed commands.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SkillsDeck } from './SkillsDeck';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn(),
        characterClass: 'ranger',
        abilities: { bandage: 75, track: 50 },
        practice: null
    })
}));

vi.mock('../../context/useMapper', () => ({
    useMapper: () => ({
        currentRoomId: '100',
        rooms: {},
        preloadedCoordsRef: { current: {} }
    })
}));

describe('SkillsDeck Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('flashes Bandage button when "bandage elf" or "band elf" is executed', () => {
        render(<SkillsDeck />);

        const bandageBtn = screen.getByRole('button', { name: /Bandage/i });
        const trackBtn = screen.getByRole('button', { name: /Track/i });

        expect(bandageBtn.classList.contains('is-key-pressed')).toBe(false);

        // Execute "bandage elf"
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'bandage elf' }
            }));
        });

        expect(bandageBtn.classList.contains('is-key-pressed')).toBe(true);
        expect(trackBtn.classList.contains('is-key-pressed')).toBe(false);

        // Advance 150ms
        act(() => {
            vi.advanceTimersByTime(150);
        });

        expect(bandageBtn.classList.contains('is-key-pressed')).toBe(false);

        // Execute shorthand "band orc"
        act(() => {
            window.dispatchEvent(new CustomEvent('mume:command-executed', {
                detail: { cmd: 'band orc' }
            }));
        });

        expect(bandageBtn.classList.contains('is-key-pressed')).toBe(true);
    });
});
