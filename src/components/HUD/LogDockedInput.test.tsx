// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LogDockedInput } from './LogDockedInput';

const mockUseGame = vi.fn();
const mockUseUI = vi.fn();
const mockUseVitals = vi.fn();

vi.mock('../../context/GameContext', () => ({
    useGame: () => mockUseGame(),
    useUI: () => mockUseUI(),
    useVitals: () => mockUseVitals()
}));

vi.mock('../../stores/useRoomStore', () => ({
    useRoomStore: (selector: any) => selector({ chars: {}, items: [] })
}));

vi.mock('../../stores/useCombatStore', () => ({
    useCombatStore: (selector: any) => selector({ target: null, opponentId: null, opponentName: null })
}));

vi.mock('../Combat/OpponentRechargeTimer', () => ({
    default: () => <div data-testid="opponent-recharge-timer" />
}));

vi.mock('./ActionTimerDisplay', () => ({
    ActionTimerDisplay: () => <div data-testid="action-timer-display" />
}));

vi.mock('../Controls/CommandSuggestionPopup', () => ({
    CommandSuggestionPopup: (props: any) => (
        <div data-testid="mock-suggestion-popup" data-placement={props.placement} />
    )
}));

describe('LogDockedInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseGame.mockReturnValue({
            viewport: { isMobile: false, isLandscape: false },
            gameState: 'playing',
            input: '',
            setInput: vi.fn(),
            commandPreview: '',
            isPasswordMode: false,
            executeCommand: vi.fn(),
            handleSend: vi.fn(),
            parley: { active: false, command: 'none', target: null },
            setParley: vi.fn(),
            characterClass: 'mage',
            abilities: {}
        });
        mockUseUI.mockReturnValue({
            accountState: { stage: 'playing' }
        });
        mockUseVitals.mockReturnValue({
            stats: { conditions: {} }
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders docked command bar without ReferenceError', () => {
        render(
            <LogDockedInput
                commandInputWrapRef={{ current: document.createElement('div') }}
                inputRef={{ current: document.createElement('input') }}
                displayInventoryLines={[]}
                displayEqLines={[]}
            />
        );

        expect(document.getElementById('mud-input')).toBeTruthy();
        expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
        const popup = screen.getByTestId('mock-suggestion-popup');
        expect(popup.getAttribute('data-placement')).toBe('bottom');
    });

    it('passes placement="top" when on mobile', () => {
        mockUseGame.mockReturnValue({
            viewport: { isMobile: true, isLandscape: false },
            gameState: 'playing',
            input: '',
            setInput: vi.fn(),
            commandPreview: '',
            isPasswordMode: false,
            executeCommand: vi.fn(),
            handleSend: vi.fn(),
            parley: { active: false, command: 'none', target: null },
            setParley: vi.fn(),
            characterClass: 'mage',
            abilities: {}
        });

        render(
            <LogDockedInput
                commandInputWrapRef={{ current: document.createElement('div') }}
                inputRef={{ current: document.createElement('input') }}
                displayInventoryLines={[]}
                displayEqLines={[]}
            />
        );

        const popup = screen.getByTestId('mock-suggestion-popup');
        expect(popup.getAttribute('data-placement')).toBe('top');
    });
});
