/**
 * @file ActionBox.tsx
 * @description Desktop HUD surface: renders the cohesive "This is You" console
 * (or AccountDeck in account mode) bounded within the center column below the log.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ThisIsYouConsole } from './ThisIsYouConsole';
import { AccountDeck } from './AccountDeck';
import './ActionBox.css';

export interface ActionBoxProps {
    handleSend?: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
    setCommandPreview?: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton?: unknown;
    setHeldButton?: React.Dispatch<React.SetStateAction<unknown>>;
    wasDraggingRef?: React.RefObject<boolean>;
}

// --- Render Section ---
export const ActionBox: FC<ActionBoxProps> = () => {
    const { gameState, accountState } = useGame();
    const bottomBarOpacity = useSettingsStore(s => s.bottomBarOpacity);

    const showsStandaloneAccountInput = accountState?.stage === 'login' ||
        accountState?.stage === 'account-confirmation';

    return (
        <div
            className={`action-box${gameState === 'account' ? ' account-mode' : ''}`}
            style={{ opacity: bottomBarOpacity } as React.CSSProperties}
        >
            {gameState !== 'account' && (
                <div className="action-box-this-is-you-row">
                    <ThisIsYouConsole />
                </div>
            )}

            {gameState === 'account' && !showsStandaloneAccountInput && <AccountDeck />}
        </div>
    );
};

export default ActionBox;
