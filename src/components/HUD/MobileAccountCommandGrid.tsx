/**
 * @file MobileAccountCommandGrid.tsx
 * @description Mobile shortcuts for account-menu and character-creation inline commands.
 */

// --- Logic Section ---
import React, { FC, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { AccountStatPopover } from '../Popovers/StandardMenu/AccountStatPopover';
import { MobileAccountCreationNav } from './MobileAccountCreationNav';
import { useAccountTargetStore } from '../../stores/useAccountTargetStore';
import './MobileAccountCommandGrid.css';

interface AccountCommand {
    command: string;
    label: string;
}

const ACCOUNT_MENU_COMMANDS: AccountCommand[] = [
    { command: 'play', label: 'Play character' },
    { command: 'create', label: 'Create character' },
    { command: 'time', label: 'Game time' },
    { command: 'list', label: 'List characters' },
    { command: 'move', label: 'Move character' },
    { command: 'password', label: 'Change password' },
    { command: 'add', label: 'Add character' },
    { command: 'info', label: 'Character info' },
    { command: 'practice', label: 'Character skills' },
    { command: 'link', label: 'Connection details' },
    { command: 'lag', label: 'Game lag' },
    { command: 'help', label: 'Help' },
    { command: 'menu', label: 'Main menu' },
    { command: 'quit', label: 'Quit' },
];

export const MobileAccountCommandGrid: FC = () => {
    const { gameState, accountState, viewport, executeCommand, triggerHaptic } = useGame();
    const longPressTimer = useRef<number | null>(null);
    const longPressFired = useRef(false);
    const stage = accountState?.stage;
    const creationOptions = (accountState?.creationPrompt?.options ?? [])
        .filter(option => option.id.toLowerCase() !== 'quit' && option.label.toLowerCase() !== 'quit');
    const commands: AccountCommand[] = stage === 'account-menu'
        ? ACCOUNT_MENU_COMMANDS
        : stage === 'character-creation' || stage === 'account-confirmation'
            ? creationOptions.map(({ id, label }) => ({ command: id, label }))
            : [];

    const isStatEditing = stage === 'stat-editing';
    if (gameState !== 'account' || !viewport?.isMobile || (!isStatEditing && commands.length === 0)) return null;

    const clearLongPress = () => {
        if (longPressTimer.current !== null) {
            window.clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };
    const handlePointerDown = (command: string) => {
        if (!['play', 'info', 'practice'].includes(command.toLowerCase())) return;
        longPressFired.current = false;
        clearLongPress();
        longPressTimer.current = window.setTimeout(() => {
            longPressTimer.current = null;
            longPressFired.current = true;
            triggerHaptic?.(30);
            useAccountTargetStore.getState().openMenu(command.toLowerCase() as 'play' | 'info' | 'practice', true);
        }, 300);
    };
    const handleCommandClick = (command: string) => {
        if (longPressFired.current) {
            longPressFired.current = false;
            return;
        }
        triggerHaptic?.(15);
        executeCommand(command);
    };

    return (
        <nav className={`mobile-account-command-grid${isStatEditing ? ' is-stat-popover' : ''}`} aria-label={isStatEditing ? 'Character stat editor' : 'Account and character options'}>
            {isStatEditing ? (
                <AccountStatPopover
                    accountState={accountState}
                    executeCommand={executeCommand}
                    triggerHaptic={triggerHaptic}
                    onClose={() => undefined}
                />
            ) : commands.map(({ command, label }) => (
                <button
                    key={command.toLowerCase()}
                    type="button"
                    className="mobile-account-command-button"
                    onPointerDown={() => handlePointerDown(command)}
                    onPointerUp={clearLongPress}
                    onPointerCancel={() => { clearLongPress(); longPressFired.current = false; }}
                    onPointerLeave={clearLongPress}
                    onClick={() => handleCommandClick(command)}
                    title={`${label} — send ${command}`}
                >
                    <span className="mobile-account-command-id">{command}</span>
                    <span className="mobile-account-command-label">{label}</span>
                </button>
            ))}
            {(stage === 'character-creation' || isStatEditing) && <MobileAccountCreationNav />}
        </nav>
    );
};

export default MobileAccountCommandGrid;
