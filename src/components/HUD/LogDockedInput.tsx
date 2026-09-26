/**
 * @file LogDockedInput.tsx
 * @description Command input bar docked directly inside the bottom of the message log container, matching the approved studio mockup.
 */

// --- Logic Section ---
import React, { FC, useRef, useCallback, useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
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
        executeCommand,
        setTarget,
        triggerHaptic
    } = useGame();
    const { target } = useActiveVitals();
    const { stats } = useVitals();
    const { displayInventoryLines, displayEqLines } = useUI();

    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const loginName = useSettingsStore(s => s.loginName);
    const loginPassword = useSettingsStore(s => s.loginPassword);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const inputRef = useRef<HTMLInputElement>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);
    const cancelTargetEditRef = useRef(false);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState('');
    const commandInputWrapRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isEditingTarget) {
            targetInputRef.current?.focus();
            targetInputRef.current?.select();
        }
    }, [isEditingTarget]);

    const finishTargetEdit = useCallback((value: string) => {
        setTarget(value.trim() || null);
        setIsEditingTarget(false);
        inputRef.current?.focus();
    }, [setTarget]);

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
        placement,
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
        isMobile: Boolean(viewport?.isMobile),
        placement: viewport?.isMobile ? 'top' : 'bottom',
        inventoryLines: displayInventoryLines,
        wornLines: displayEqLines
    });

    const showsStandaloneAccountInput = accountState?.stage === 'login' ||
        accountState?.stage === 'account-confirmation';
    const isLoginStage = gameState === 'account' && accountState?.stage === 'login';
    const loginPrompt = accountState?.currentPrompt?.toLowerCase() || '';
    const isPasswordPrompt = isLoginStage && (isPasswordMode || loginPrompt.includes('password') || loginPrompt.includes('verify'));
    const isNamePrompt = isLoginStage && (loginPrompt.includes('by what name') || loginPrompt.includes('enter new account name'));
    const lastFilledPromptRef = useRef('');

    useEffect(() => {
        if (!isLoginStage || !rememberLogin) {
            lastFilledPromptRef.current = '';
            return;
        }
        const promptKey = isPasswordPrompt ? 'password' : isNamePrompt ? 'name' : '';
        if (!promptKey || lastFilledPromptRef.current === promptKey) return;
        lastFilledPromptRef.current = promptKey;
        const savedValue = isPasswordPrompt ? loginPassword : loginName;
        if (savedValue) setInput(savedValue);
    }, [isLoginStage, isPasswordPrompt, isNamePrompt, rememberLogin, loginName, loginPassword, setInput]);
    const showRotatingSuggestion = gameState === 'playing' && currentMode === 'command' && !input && !commandPreview;
    const rotatingCommand = useRotatingCommandSuggestion(showRotatingSuggestion);

    const isParleyActive = Boolean(parley?.active && parley?.command);

    const handleParleyClear = useCallback(() => {
        setParley(prev => ({ ...prev, active: false, command: 'none', target: null }));
    }, [setParley]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isLoginStage && rememberLogin && input.trim()) {
            if (isPasswordPrompt) setLoginPassword(input.trim());
            else if (isNamePrompt) setLoginName(input.trim());
        }
        handleSend(e);
        inputRef.current?.focus();
    }, [handleSend, input, isLoginStage, isPasswordPrompt, isNamePrompt, rememberLogin, setLoginName, setLoginPassword]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (handleSuggestionKeyDown(e)) {
            return;
        }

        if (e.key === 'Enter') {
            // Let the form's onSubmit handle form submission to avoid double-execution
            return;
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

    const placeholder = isPasswordMode
        ? 'Enter password...'
        : (gameState === 'account'
            ? (showsStandaloneAccountInput ? 'Enter username...' : 'Enter account command...')
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
                {gameState === 'playing' && (target || isEditingTarget) && (
                    <div className="docked-target-badge">
                        <Target size={11} strokeWidth={2.4} />
                        {isEditingTarget ? (
                            <input
                                ref={targetInputRef}
                                className="docked-target-edit"
                                aria-label="Edit target"
                                value={targetDraft}
                                onChange={event => setTargetDraft(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        finishTargetEdit(targetDraft);
                                    } else if (event.key === 'Escape') {
                                        event.preventDefault();
                                        cancelTargetEditRef.current = true;
                                        setIsEditingTarget(false);
                                        inputRef.current?.focus();
                                    }
                                }}
                                onBlur={() => {
                                    if (cancelTargetEditRef.current) {
                                        cancelTargetEditRef.current = false;
                                        return;
                                    }
                                    finishTargetEdit(targetDraft);
                                }}
                            />
                        ) : (
                            <button
                                type="button"
                                className="docked-target-name"
                                onClick={() => {
                                    triggerHaptic?.(10);
                                    setTargetDraft(target || '');
                                    setIsEditingTarget(true);
                                }}
                                title={`Edit target: ${target}`}
                                aria-label={`Edit target: ${target}`}
                            >{target}</button>
                        )}
                        <button
                            type="button"
                            className="docked-target-x"
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => {
                                triggerHaptic?.(10);
                                setIsEditingTarget(false);
                                setTarget(null);
                                inputRef.current?.focus();
                            }}
                            title="Clear target"
                            aria-label="Clear target"
                        >✕</button>
                    </div>
                )}
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
                placement={placement}
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
                    onClick={() => {
                        triggerHaptic?.(20);
                        executeCommand('', false, false, false);
                    }}
                    onPointerDown={event => event.stopPropagation()}
                    title="Cancel current action (send newline)"
                    aria-label="Cancel current action"
                >
                    CANCEL
                </button>
            )}

            {isLoginStage && (
                <div className="docked-login-actions">
                    <label className="docked-remember-login">
                        <input type="checkbox" checked={rememberLogin} onChange={event => setRememberLogin(event.target.checked)} />
                        Remember login
                    </label>
                    {isNamePrompt && <button type="button" className="docked-send-btn" onClick={() => executeCommand('new')}>NEW ACCOUNT</button>}
                </div>
            )}

            <button
                type="button"
                className="docked-send-btn"
                onClick={() => handleSubmit()}
            >
                {isLoginStage ? 'LOGIN' : 'SEND'}
            </button>
        </div>
    );
};

export default LogDockedInput;
