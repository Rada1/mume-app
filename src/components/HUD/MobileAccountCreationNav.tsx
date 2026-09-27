/**
 * @file MobileAccountCreationNav.tsx
 * @description Floating hover navigation buttons (Back, Menu, Help, Stats) for mobile character creation and stat editing.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { ArrowLeft, Menu, HelpCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './MobileAccountCreationNav.css';

export const MobileAccountCreationNav: FC = () => {
    const { gameState, accountState, viewport, executeCommand, triggerHaptic } = useGame();
    const isCreationOrStat = gameState === 'account' &&
        (accountState?.stage === 'character-creation' || accountState?.stage === 'stat-editing');

    if (!viewport?.isMobile || !isCreationOrStat) return null;

    const handleBack = () => {
        triggerHaptic?.(15);
        executeCommand('back');
    };

    const handleMainMenu = () => {
        triggerHaptic?.(15);
        executeCommand('');
        setTimeout(() => executeCommand(''), 150);
        setTimeout(() => executeCommand('menu'), 300);
    };

    const handleHelp = () => {
        triggerHaptic?.(15);
        executeCommand('?');
    };

    return (
        <div className="mobile-creation-floating-nav">
            <button
                type="button"
                className="mobile-creation-nav-btn"
                onClick={handleBack}
                title="Back"
                aria-label="Back"
            >
                <ArrowLeft size={13} strokeWidth={2.4} />
                <span>Back</span>
            </button>
            <button
                type="button"
                className="mobile-creation-nav-btn"
                onClick={handleMainMenu}
                title="Main Menu"
                aria-label="Main Menu"
            >
                <Menu size={13} strokeWidth={2.4} />
                <span>Menu</span>
            </button>
            <button
                type="button"
                className="mobile-creation-nav-btn"
                onClick={handleHelp}
                title="Help"
                aria-label="Help"
            >
                <HelpCircle size={13} strokeWidth={2.4} />
                <span>?</span>
            </button>
        </div>
    );
};
