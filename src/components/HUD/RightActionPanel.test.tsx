// @vitest-environment jsdom
/**
 * @file RightActionPanel.test.tsx
 * @description Unit tests for RightActionPanel persistent movement pad and command tabs.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightActionPanel } from './RightActionPanel';
import { useRoomStore } from '../../stores/useRoomStore';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn(),
        abilities: {},
        gameState: 'playing',
        characterClass: 'warrior',
        practice: { practiceData: null },
        roomPlayers: [],
        roomNpcs: [],
        roomItems: [],
        setTarget: vi.fn(),
        characterName: 'Tester'
    })
}));

vi.mock('../../context/useMapper', () => ({
    useMapper: () => ({
        currentRoomId: '100',
        rooms: {},
        preloadedCoordsRef: { current: {} }
    })
}));

describe('RightActionPanel Component', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('mume-right-panel-tab', 'combat');
        useRoomStore.setState({
            exits: ['n', 's', 'e', 'w'],
            rawExits: { n: 1, s: 2, e: 3, w: 4 }
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
        localStorage.clear();
    });

    it('renders Combat, Skills, and Util tabs without a separate Move tab', () => {
        render(<RightActionPanel />);

        expect(screen.getByRole('tab', { name: /Combat/i })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Skills/i })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Util/i })).toBeTruthy();
        expect(screen.queryByRole('tab', { name: /^Move$/i })).toBeNull();
    });

    it('always renders movement controls docked in right-panel-navigation across different tabs', () => {
        const { container } = render(<RightActionPanel />);

        const navRegion = screen.getByRole('region', { name: /Movement Controls/i });
        expect(navRegion).toBeTruthy();
        expect(navRegion.classList.contains('right-panel-navigation')).toBe(true);

        // Movement buttons are present
        expect(screen.getByRole('button', { name: /North/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /South/i })).toBeTruthy();

        // Switch to Utility tab
        const utilTab = screen.getByRole('tab', { name: /Util/i });
        fireEvent.click(utilTab);

        // Movement controls remain visible
        expect(screen.getByRole('region', { name: /Movement Controls/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /North/i })).toBeTruthy();

        // Target bar is also visible
        expect(container.querySelector('.right-panel-target-bar')).toBeTruthy();
    });
});
