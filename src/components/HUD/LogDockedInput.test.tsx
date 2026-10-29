// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LogDockedInput } from './LogDockedInput';
import { useInputStore } from '../../stores/useInputStore';
import { useMessageStore } from '../../stores/useMessageStore';

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
vi.mock('../../hooks/useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));

vi.mock('../../stores/useRoomStore', () => ({
    useRoomStore: (selector?: (state: { chars: object; items: object; roomNum: number; roomName: string; roomZone: string; roomDesc: string; rawExits: object }) => unknown) => {
        const state = { chars: {}, items: [], roomNum: 0, roomName: '', roomZone: '', roomDesc: '', rawExits: {} };
        return selector ? selector(state) : state;
    }
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

vi.mock('../Messages/TokenRenderer', () => ({ TokenRenderer: () => <span /> }));

describe('LogDockedInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('matchMedia', () => ({ matches: false }));
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
        useMessageStore.setState({ userChat: [], spectateChat: [] });
        vi.unstubAllGlobals();
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
            characterClass: 'mage',
            abilities: {}
        });

        render(
            <LogDockedInput handleSend={vi.fn()} />
        );

        const popup = screen.getByTestId('mock-suggestion-popup');
        expect(popup.getAttribute('data-placement')).toBe('top');
    });

    it('opens chat channels from the command bar and prepares the selected composer', () => {
        const setParley = vi.fn();
        mockUseGame.mockReturnValue({ ...mockUseGame(), setParley, whoList: [] });
        useInputStore.setState({ input: 'hello there' });
        render(<LogDockedInput handleSend={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
        fireEvent.click(screen.getByRole('button', { name: 'say' }));
        const update = setParley.mock.calls[0][0];
        expect(update({ active: false, mode: 'command', command: 'none', target: null, message: '' }))
            .toMatchObject({ active: true, mode: 'parley', command: 'say', target: null });
        expect(useInputStore.getState().input).toBe('hello there');
    });

    it('places desktop communications in the space to the left of the log', () => {
        mockUseGame.mockReturnValue({ ...mockUseGame(), whoList: [] });
        render(<div className="desktop-center-column"><LogDockedInput handleSend={vi.fn()} /></div>);
        const column = document.querySelector('.desktop-center-column')!;
        vi.spyOn(column, 'getBoundingClientRect').mockReturnValue({ left: 500, right: 1200, top: 0, bottom: 700, width: 700, height: 700, x: 500, y: 0, toJSON: () => ({}) });
        fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
        const popover = screen.getByRole('dialog', { name: 'Communication' });
        expect(popover.style.left).toBe('8px');
        expect(popover.style.width).toBe('484px');
    });

    it('shows combined history on mobile and keeps it open when choosing a channel', () => {
        mockUseGame.mockReturnValue({ ...mockUseGame(), viewport: { isMobile: true, isLandscape: true }, whoList: [] });
        render(<><div className="desktop-center-column" /><div className="mobile-command-column"><LogDockedInput handleSend={vi.fn()} /></div></>);
        fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
        const popover = screen.getByRole('dialog', { name: 'Communication' });
        expect(popover.classList.contains('is-mobile')).toBe(true);
        expect(popover.classList.contains('is-split')).toBe(true);
        expect(screen.getByRole('region', { name: 'All communication history' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'say' }));
        expect(screen.getByRole('dialog', { name: 'Communication' })).toBeTruthy();
    });

    it('chooses a room recipient for a directed chat channel', () => {
        const setParley = vi.fn();
        mockUseGame.mockReturnValue({ ...mockUseGame(), setParley, whoList: [], roomNpcs: [{ id: 7, name: 'pack horse', type: 'npc' }] });
        render(<LogDockedInput handleSend={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
        fireEvent.click(screen.getByRole('button', { name: /whisper/ }));
        fireEvent.click(screen.getByRole('button', { name: 'pack horse' }));
        const update = setParley.mock.calls[0][0];
        expect(update({ active: false, mode: 'command', command: 'none', target: null, message: '' }))
            .toMatchObject({ active: true, mode: 'parley', command: 'whisper', target: 'horse' });
    });

    it('prepares a reply to a history message without closing the popover', () => {
        const setParley = vi.fn();
        mockUseGame.mockReturnValue({ ...mockUseGame(), setParley, whoList: [] });
        useMessageStore.setState({ userChat: [{ id: 'tell-1', html: '', textRaw: 'Hello', type: 'comm', timestamp: Date.now(), isComm: true, replyCommand: 'tell', commSender: 'Sauron', commText: 'Hello' }] });
        render(<LogDockedInput handleSend={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'Choose chat channel' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reply to Sauron on tell' }));
        const update = setParley.mock.calls[0][0];
        expect(update({ active: false, mode: 'command', command: 'none', target: null, message: '' }))
            .toMatchObject({ active: true, mode: 'parley', command: 'tell', target: 'Sauron' });
        expect(screen.getByRole('dialog', { name: 'Communication' })).toBeTruthy();
    });

    it('shows the global target control and opens its editor when tapped', () => {
        render(<LogDockedInput handleSend={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'Choose a room target' }));
        fireEvent.click(screen.getByRole('button', { name: 'Enter target manually…' }));

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
