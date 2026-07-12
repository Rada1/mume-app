/**
 * @file ActionBox.tsx
 * @description Desktop action surface below the log: the CommandDeck ability bar
 * plus the command line (InputArea). Mobile uses LineCluster elsewhere; this is
 * desktop-only (rendered by MainContentLayer when !viewport.isMobile).
 */

import React, { FC } from 'react';
import { useGame, useUI } from '../../context/GameContext';
import InputArea from '../Controls/InputArea';
import { CommandDeck } from './CommandDeck';
import { SkillsDeck } from './SkillsDeck';
import { MovementPad } from './MovementPad';
import { AccountDeck } from './AccountDeck';
import OpponentRechargeTimer from '../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from './ActionTimerDisplay';
import './ActionBox.css';

interface ActionBoxProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview: string | null;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    heldButton: unknown;
    setHeldButton: React.Dispatch<React.SetStateAction<unknown>>;
    wasDraggingRef: React.RefObject<boolean>;
    // Desktop: the PromptBox rendered inside the action-box grid (center top cell)
    // so the whole bottom bar reads as one gapless block. Null in account mode.
    promptSlot?: React.ReactNode;
}

export const ActionBox: FC<ActionBoxProps> = ({
    handleSend,
    handleInputSwipe,
    commandPreview,
    promptSlot
}) => {
    const {
        executeCommand,
        viewport,
        btn,
        currentTerrain,
        spatButtons,
        setSpatButtons,
        parley,
        setParley,
        whoList,
        gameState,
        accountState
    } = useGame() as {
        executeCommand: (cmd: string, silent?: boolean, sys?: boolean, isRetry?: boolean, forceHistory?: boolean) => void;
        viewport: { isMobile: boolean; isKeyboardOpen: boolean; isLandscape: boolean };
        btn: { setActiveSet: (setId: string) => void };
        currentTerrain: string;
        spatButtons: unknown;
        setSpatButtons: React.Dispatch<React.SetStateAction<unknown>>;
        parley: unknown;
        setParley: React.Dispatch<React.SetStateAction<unknown>>;
        whoList: unknown;
        gameState: string;
        accountState?: { stage?: string };
    };

    // In account mode every stage has its own purpose-built input (the AccountDeck
    // menu, the creation panel's contextual field), so the generic command line is
    // redundant — except at the login stage, where InputArea renders the login card.
    const hideCommandInput = gameState === 'account' && accountState?.stage !== 'login';

    const { setPopoverState } = useUI() as {
        setPopoverState: (val: unknown) => void;
    };

    return (
        <div className={`action-box${gameState === 'account' ? ' account-mode' : ''}`}>
            {gameState !== 'account' && (
                <div className="action-box-controls">
                    {promptSlot && <div className="action-box-prompt-cell">{promptSlot}</div>}
                    <MovementPad />
                    <CommandDeck />
                    <SkillsDeck />
                </div>
            )}
            {gameState === 'account' && <AccountDeck />}
            {!hideCommandInput && (
            <div className="action-box-input-row">
                <div className="action-box-input-cell">
                    <InputArea
                        onSend={handleSend}
                        onSwipe={handleInputSwipe}
                        isMobile={viewport.isMobile}
                        isKeyboardOpen={viewport.isKeyboardOpen}
                        commandPreview={commandPreview}
                        terrain={currentTerrain}
                        spatButtons={spatButtons}
                        setActiveSet={btn.setActiveSet}
                        executeCommand={executeCommand}
                        setSpatButtons={setSpatButtons}
                        setPopoverState={setPopoverState}
                        parley={parley}
                        setParley={setParley}
                        whoList={whoList}
                        gameState={gameState}
                        rightSlot={gameState !== 'account' ? (
                            <>
                                <OpponentRechargeTimer lane="player" />
                                <ActionTimerDisplay />
                            </>
                        ) : undefined}
                    />
                </div>
            </div>
            )}
        </div>
    );
};

export default ActionBox;
