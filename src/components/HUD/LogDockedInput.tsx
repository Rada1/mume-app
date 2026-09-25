/**
 * @file LogDockedInput.tsx
 * @description Command input bar docked directly inside the bottom of the message log container, matching the approved studio mockup.
 */

// --- Logic Section ---
import React, { FC, useRef, useCallback } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { useInputStore } from '../../stores/useInputStore';
import OpponentRechargeTimer from '../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from './ActionTimerDisplay';
import { useCommandSuggestions } from '../../hooks/useCommandSuggestions';
import { useRotatingCommandSuggestion } from '../../hooks/useRotatingCommandSuggestion';
import { CommandSuggestionPopup } from '../Controls/CommandSuggestionPopup';
import './LogDockedInput.css';

interface LogDockedInputProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
}

export const LogDockedInput: FC<LogDockedInputProps> = ({
    handleSend,
    commandPreview
}) => {
    const {
        viewport,
        gameState,
        accountState,
        isPasswordMode,
        parley,
        setParley,
        abilities,
        characterClass,
        executeCommand
    } = useGame();
    const { stats } = useVitals();

    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const inputRef = useRef<HTMLInputElement>(null);
    const commandInputWrapRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentMode = parley?.mode || (parley?.active ? 'parley' : 'command');

    const {
        commandTextParts,
        mumeCommandMatch,
        showCompletionPopup,
        showCommandPopup,
        showTargetPopup,
        showSpellPopup,
        visibleCommandSuggestions,
        targetSuggestions,
        selectedTargetSuggestion,
        spellSuggestions,
        popupStyle,
        setIsFocused,
        chooseCommandSuggestion,
        chooseTargetSuggestion,
        chooseSpellSuggestion,
        handleSuggestionKeyDown
    } = useCommandSuggestions({
        input,
        setInput,
        gameState,
        isPasswordMode,
        currentMode,
        abilities,
        characterClass,
        wrapRef: commandInputWrapRef,
        inputRef,
        isMobile: viewport.isMobile,
        placement: 'bottom'
    });

    const showsStandaloneAccountInput = accountState?.stage === 'login' ||
        accountState?.stage === 'account-confirmation';
    const hideCommandInput = gameState === 'account' && !showsStandaloneAccountInput;
    const showRotatingSuggestion = gameState === 'playing' && currentMode === 'command' && !input && !commandPreview;
    const rotatingCommand = useRotatingCommandSuggestion(showRotatingSuggestion);

    const isParleyActive = Boolean(parley?.active && parley?.command);

    const handleParleyClear = useCallback(() => {
        setParley(prev => ({ ...prev, active: false, command: 'none', target: null }));
    }, [setParley]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
        handleSend(e);
        inputRef.current?.focus();
    }, [handleSend]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (handleSuggestionKeyDown(e)) {
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            useInputStore.getState().navigateHistory('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            useInputStore.getState().navigateHistory('down');
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setInput('');
        }
    }, [handleSuggestionKeyDown, handleSubmit, setInput]);

    if (viewport.isMobile || hideCommandInput) {
        return null;
    }

    const placeholder = isPasswordMode
        ? 'Enter password...'
        : (gameState === 'account'
            ? 'Enter username...'
            : (showRotatingSuggestion ? `Try: ${rotatingCommand}...` : 'Enter command...'));

    return (
        <div className="message-log-docked-input">
            <span className="docked-prompt-symbol">&gt;</span>

            {isParleyActive && (
                <div className="docked-parley-chip" onClick={handleParleyClear} title="Click to exit parley mode">
                    <span className="parley-cmd">{parley.command}</span>
                    {parley.target && <span className="parley-tgt">{parley.target}</span>}
                    <span className="parley-x">&times;</span>
                </div>
            )}

            <form className="docked-input-form" onSubmit={handleSubmit}>
                <div
                    ref={commandInputWrapRef}
                    className="docked-input-wrap"
                    onClick={() => inputRef.current?.focus()}
                >
                    {commandTextParts && (
                        <div className="docked-input-highlight" aria-hidden="true">
                            <span>{commandTextParts.leading}</span>
                            <span className={commandTextParts.isValid ? 'command-input-token-valid' : 'command-input-token-plain'}>
                                {commandTextParts.token}
                            </span>
                            {!commandTextParts.suffix && commandTextParts.autocomplete && (
                                <span className="docked-input-autocomplete command-input-autocomplete">
                                    {commandTextParts.autocomplete}
                                </span>
                            )}
                            <span>{commandTextParts.suffix}</span>
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        id="mud-input"
                        type={isPasswordMode ? 'password' : 'text'}
                        className={`docked-input-field input-field${commandTextParts ? ' command-highlight-source' : ''}`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                            }
                            setIsFocused(true);
                        }}
                        onBlur={() => {
                            if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                            }
                            blurTimeoutRef.current = setTimeout(() => {
                                setIsFocused(false);
                                blurTimeoutRef.current = null;
                            }, 150);
                        }}
                        placeholder={commandPreview || placeholder}
                        autoComplete="off"
                        spellCheck="false"
                    />
                </div>
            </form>

            <CommandSuggestionPopup
                show={showCompletionPopup}
                style={popupStyle}
                placement="bottom"
                showSpellPopup={showSpellPopup}
                showTargetPopup={showTargetPopup}
                spellSuggestions={spellSuggestions}
                targetSuggestions={targetSuggestions}
                selectedTargetKey={selectedTargetSuggestion?.key}
                commandSuggestions={visibleCommandSuggestions}
                selectedCommandFull={mumeCommandMatch.entry?.full}
                onChooseSpell={chooseSpellSuggestion}
                onChooseTarget={chooseTargetSuggestion}
                onChooseCommand={chooseCommandSuggestion}
            />

            {gameState !== 'account' && (
                <div className="docked-timers-cluster">
                    <OpponentRechargeTimer lane="player" compact />
                    <ActionTimerDisplay compact />
                </div>
            )}

            {gameState === 'playing' && stats.conditions?.waiting && (
                <button
                    type="button"
                    className="docked-cancel-btn"
                    onClick={() => executeCommand('', false, false, false)}
                    onPointerDown={event => event.stopPropagation()}
                    title="Cancel current action (send newline)"
                    aria-label="Cancel current action"
                >
                    CANCEL
                </button>
            )}

            <button
                type="button"
                className="docked-send-btn"
                onClick={() => handleSubmit()}
            >
                SEND
            </button>
        </div>
    );
};

export default LogDockedInput;
