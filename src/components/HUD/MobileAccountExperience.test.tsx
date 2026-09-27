// @vitest-environment jsdom
/**
 * @file MobileAccountExperience.test.tsx
 * @description Covers the mobile account panels' login, character, and creation actions.
 */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AccountState, CharacterEntry } from '../../types';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { MobileAccountExperience } from './MobileAccountExperience';

const { mockUseGame, mockExecuteCommand } = vi.hoisted(() => ({
    mockUseGame: vi.fn(),
    mockExecuteCommand: vi.fn()
}));

vi.mock('../../context/GameContext', () => ({ useGame: () => mockUseGame() }));

const makeAccountState = (overrides: Partial<AccountState> = {}): AccountState => ({
    stage: 'account-menu',
    characters: [],
    selectedCharacter: null,
    ...overrides
});

const renderAccount = (accountState: AccountState, isPasswordMode = false) => {
    mockUseGame.mockReturnValue({
        gameState: 'account',
        accountState,
        setAccountState: vi.fn(),
        isPasswordMode,
        executeCommand: mockExecuteCommand,
        triggerHaptic: vi.fn()
    });
    return render(<MobileAccountExperience />);
};

describe('MobileAccountExperience', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useInputStore.getState().setInput('');
        useSettingsStore.setState({ rememberLogin: true, loginName: '', loginPassword: '' });
    });

    afterEach(() => cleanup());

    it('fills the saved username and exposes account creation at the name prompt', () => {
        useSettingsStore.setState({ loginName: 'Ellessar' });
        renderAccount(makeAccountState({ stage: 'login', currentPrompt: 'By what name do you wish to be known?' }));

        expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Ellessar');
        expect(screen.getByRole('button', { name: 'Create new account' })).toBeTruthy();
    });

    it('does not refocus the command input after the username when a saved password is available', () => {
        useSettingsStore.setState({ loginName: 'Ellessar', loginPassword: 'saved-secret' });
        renderAccount(makeAccountState({ stage: 'login', currentPrompt: 'By what name do you wish to be known?' }));

        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        expect(mockExecuteCommand).toHaveBeenCalledWith(
            'Ellessar', false, false, false, false, { shouldFocus: false }
        );
    });

    it('reserves the create-account button space after switching to the password prompt', () => {
        const firstState = makeAccountState({ stage: 'login', currentPrompt: 'By what name do you wish to be known?' });
        const { container, rerender } = renderAccount(firstState);
        expect(screen.getByRole('button', { name: 'Create new account' })).toBeTruthy();

        mockUseGame.mockReturnValue({
            gameState: 'account',
            accountState: makeAccountState({ stage: 'login', currentPrompt: 'Account Password:' }),
            setAccountState: vi.fn(),
            isPasswordMode: true,
            executeCommand: mockExecuteCommand,
            triggerHaptic: vi.fn()
        });
        rerender(<MobileAccountExperience />);

        const reservedButton = container.querySelector('.mobile-account-action.is-reserved-hidden');
        expect(reservedButton).toBeTruthy();
        expect((reservedButton as HTMLButtonElement).disabled).toBe(true);
    });

    it('renders the server-provided creation choices as large command buttons', () => {
        renderAccount(makeAccountState({
            stage: 'character-creation',
            creationPrompt: {
                title: 'Choose Your Allegiance',
                description: '',
                options: [{ id: '1', label: 'First path' }, { id: '2', label: 'Second path' }]
            }
        }));

        fireEvent.click(screen.getByRole('button', { name: '1. First path' }));
        expect(mockExecuteCommand).toHaveBeenCalledWith('1');
    });

    it('keeps the top-level tabs in creation and shows the previous prompt as context', () => {
        renderAccount(makeAccountState({
            stage: 'character-creation',
            creationPrompt: {
                title: 'Pick a number, "back", "?">',
                description: 'Choose Your Allegiance',
                options: [{ id: '1', label: 'Free Peoples of the West' }]
            }
        }));

        expect(screen.getByText('Choose Your Allegiance')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Account Menu' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Characters' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Help' })).toBeNull();
        expect(screen.queryByRole('button', { name: /^Menu$/ })).toBeNull();
    });

    it('shows parsed stat values when the stat confirmation card has no transcript values', () => {
        renderAccount(makeAccountState({
            stage: 'character-creation',
            creationPrompt: {
                title: 'Will you use these stats?, "back", "?">',
                description: 'Select an option>',
                options: [{ id: '1', label: 'Continue' }]
            },
            stats: { str: 14, int: 12, wis: 10 }
        }));

        expect(screen.getByLabelText('Creation context').textContent).toContain('Strength: 14');
        expect(screen.getByLabelText('Creation context').textContent).toContain('Intelligence: 12');
        expect(screen.getByLabelText('Creation context').textContent).toContain('Wisdom: 10');
    });

    it('starts character creation from the Create tab without a duplicate create button', () => {
        renderAccount(makeAccountState());

        fireEvent.click(screen.getByRole('button', { name: 'Create' }));

        expect(mockExecuteCommand).toHaveBeenCalledWith('create');
        expect(screen.queryByRole('button', { name: /Create character/i })).toBeNull();
        expect(screen.getByText('Waiting for creation prompt…')).toBeTruthy();
    });

    it('keeps each character list line and offers Play with Info and Practice in More', () => {
        const rawLine = 'Ellessar Ainu Rider 104 now Valinor free';
        const character: CharacterEntry = {
            name: 'Ellessar', race: 'Ainu', sublevel: 'Rider', level: 104,
            logon: 'now', area: 'Valinor', rent: 'free',
            rawLine
        };
        renderAccount(makeAccountState({ characters: [character], selectedCharacter: character }));

        expect(screen.getByRole('option', { name: rawLine })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Play' }));
        expect(mockExecuteCommand).toHaveBeenCalledWith('play Ellessar');
        fireEvent.click(screen.getByRole('button', { name: /More/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Practice' }));
        expect(mockExecuteCommand).toHaveBeenCalledWith('practice Ellessar', true);
    });
});
