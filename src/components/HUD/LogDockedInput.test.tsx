// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LogDockedInput } from './LogDockedInput';
import { useInputStore } from '../../stores/useInputStore';

const mockUseGame = vi.fn();
const mockUseUI = vi.fn();
const mockUseVitals = vi.fn();
const mockUseMapper = vi.fn();

vi.mock('../../context/GameContext', () => ({
    useGame: () => mockUseGame(),
    useUI: () => mockUseUI(),
    useVitals: () => mockUseVitals()
}));

vi.mock('../../context/useMapper', () => ({
    useMapper: () => mockUseMapper()
}));

vi.mock('../../stores/useRoomStore', () => ({
    useRoomStore: (selector: any) => selector({
        chars: {}, items: [], roomNum: 0, roomName: '', roomZone: '', roomDesc: ''
    })
}));

vi.mock('../../stores/useCombatStore', () => ({
    useCombatStore: (selector: any) => selector({ target: null, opponentId: null, opponentName: null })
}));

vi.mock('../../hooks/useRoomDrinkWater', () => ({
    useRoomDrinkWater: () => false
}));

vi.mock('../Combat/OpponentRechargeTimer', () => ({
    default: () => <div data-testid="opponent-recharge-timer" />
}));

vi.mock('./ActionTimerDisplay', () => ({
    ActionTimerDisplay: () => <div data-testid="action-timer-display" />
}));

vi.mock('../Controls/CommandSuggestionPopup', () => ({
    CommandSuggestionPopup: (props: { show: boolean; placement: string }) => (
        <div data-testid="mock-suggestion-popup" data-placement={props.placement} data-show={props.show} />
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
            whoList: [],
            characterClass: 'mage',
            abilities: {}
        });
        mockUseUI.mockReturnValue({
            accountState: { stage: 'playing' },
            displayInventoryLines: [],
            displayEqLines: []
        });
        mockUseVitals.mockReturnValue({
            stats: { conditions: {} }
        });
        mockUseMapper.mockReturnValue({
            setActiveMapFilter: vi.fn(),
            setMapSearchQuery: vi.fn()
        });
        useInputStore.setState({ input: '', history: [], historyIndex: -1, tempInput: '' });
    });

    afterEach(() => {
        cleanup();
    });

    it('places desktop play suggestions above and beside the command bar', () => {
        render(
            <LogDockedInput handleSend={vi.fn()} />
        );

        expect(document.getElementById('mud-input')).toBeTruthy();
        expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
        const popup = screen.getByTestId('mock-suggestion-popup');
        expect(popup.getAttribute('data-placement')).toBe('top');
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
            whoList: [],
            characterClass: 'mage',
            abilities: {}
        });

        render(
            <LogDockedInput handleSend={vi.fn()} />
        );

        const popup = screen.getByTestId('mock-suggestion-popup');
        expect(popup.getAttribute('data-placement')).toBe('top');
    });

    it('shows command suggestions for a focused mobile command prefix', () => {
        mockUseGame.mockReturnValue({
            viewport: { isMobile: true, isLandscape: false },
            gameState: 'playing',
            isPasswordMode: false,
            parley: { active: false, mode: 'command', command: 'none', target: null },
            setParley: vi.fn(),
            whoList: [],
            characterClass: 'mage',
            abilities: {}
        });

        render(<LogDockedInput handleSend={vi.fn()} />);
        const input = document.getElementById('mud-input') as HTMLTextAreaElement;
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'lo' } });

        expect(screen.getByTestId('mock-suggestion-popup').getAttribute('data-show')).toBe('true');
    });

    it('shows the global target control and opens its editor when tapped', () => {
        render(<LogDockedInput handleSend={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Set global target' }));

        expect(screen.getByRole('textbox', { name: 'Edit global target' })).toBeTruthy();
    });

    it('routes /find queries to map search instead of sending them to the game', () => {
        const setActiveMapFilter = vi.fn();
        const setMapSearchQuery = vi.fn();
        const handleSend = vi.fn();
        mockUseMapper.mockReturnValue({ setActiveMapFilter, setMapSearchQuery });
        render(<LogDockedInput handleSend={handleSend} />);

        const input = document.getElementById('mud-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '/find herb' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(setActiveMapFilter).toHaveBeenCalledWith(null);
        expect(setMapSearchQuery).toHaveBeenCalledWith('herb');
        expect(handleSend).not.toHaveBeenCalled();
        expect(useInputStore.getState().input).toBe('');
        expect(useInputStore.getState().history).toEqual(['/find herb']);
    });

    it('keeps /find in the command bar when no search query was entered', () => {
        const handleSend = vi.fn();
        render(<LogDockedInput handleSend={handleSend} />);

        const input = document.getElementById('mud-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '/find' } });
        fireEvent.submit(input.closest('form') as HTMLFormElement);

        expect(useInputStore.getState().input).toBe('/find ');
        expect(handleSend).not.toHaveBeenCalled();
    });
});
