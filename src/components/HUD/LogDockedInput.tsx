/**
 * @file LogDockedInput.tsx
 * @description Command input bar docked directly inside the bottom of the message log container, matching the approved studio mockup.
 */

// --- Logic Section ---
import React, { FC, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Repeat, Target } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAutomaticTargetStore } from '../../stores/useAutomaticTargetStore';
import { getAutoRoomTarget } from '../../utils/commandAutoTarget';
import { getRoomTargetSuggestions } from '../../utils/commandSuggestionUtils';
import OpponentRechargeTimer from '../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from './ActionTimerDisplay';
import { useCommandSuggestions } from '../../hooks/useCommandSuggestions';
import { useRotatingCommandSuggestion } from '../../hooks/useRotatingCommandSuggestion';
import { CommandSuggestionPopup } from '../Controls/CommandSuggestionPopup';
import { TargetChipPicker } from './TargetChipPicker';
import './LogDockedInput.css';

interface LogDockedInputProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
}

const splitCommandTarget = (command: string, target: string) => {
    const targetWord = target.trim().split(/\s+/).filter(Boolean).pop();
    if (!targetWord) return null;

    const escapedTarget = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = Array.from(command.matchAll(new RegExp(`(^|\\s)(${escapedTarget})(?=\\s|$)`, 'gi')));
    const match = matches[matches.length - 1];
    if (!match || match.index === undefined) return null;

    const targetStart = match.index + match[1].length;
    const targetEnd = targetStart + match[2].length;
    return {
        before: command.slice(0, targetStart),
        target: match[2],
        after: command.slice(targetEnd)
    };
};

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
        triggerHaptic,
        characterName
    } = useGame();
    const { target } = useActiveVitals();
    const automaticTarget = useAutomaticTargetStore(state => state.target);
    const setAutomaticTarget = useAutomaticTargetStore(state => state.setTarget);
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomTargetSuggestions = useMemo(() => [
        ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName || ''),
        ...getRoomTargetSuggestions([], Object.values(roomItems), 'objects'),
    ], [characterName, roomItems, roomOccupants]);
    const displayedTarget = target || automaticTarget || getAutoRoomTarget('hit', roomOccupants, characterName || '');
    useEffect(() => {
        if (target || gameState !== 'playing') setAutomaticTarget(null);
    }, [gameState, setAutomaticTarget, target]);
    const { stats } = useVitals();
    const { displayInventoryLines, displayEqLines } = useUI();
    const { setActiveMapFilter, setMapSearchQuery } = useMapper();

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
    const targetBadgeRef = useRef<HTMLDivElement>(null);
    const cancelTargetEditRef = useRef(false);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState('');
    const [isTargetPickerOpen, setIsTargetPickerOpen] = useState(false);
    const commandInputWrapRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const focusCommandInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

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

    const beginTargetEdit = useCallback(() => {
        setIsTargetPickerOpen(false);
        triggerHaptic?.(10);
        setTargetDraft(target || '');
        setIsEditingTarget(true);
    }, [target, triggerHaptic]);

    const clearTarget = useCallback(() => {
        triggerHaptic?.(10);
        setIsEditingTarget(false);
        setTarget(null);
        inputRef.current?.blur();
    }, [setTarget, triggerHaptic]);

    const toggleTargetPicker = useCallback(() => {
        triggerHaptic?.(10);
        setIsTargetPickerOpen(open => !open);
    }, [triggerHaptic]);

    const chooseGlobalTarget = useCallback((value: string) => {
        setTarget(value);
        triggerHaptic?.(15);
        setIsTargetPickerOpen(false);
    }, [setTarget, triggerHaptic]);

    const openManualTargetEntry = useCallback(() => {
        setIsTargetPickerOpen(false);
        beginTargetEdit();
    }, [beginTargetEdit]);

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
        placement: (viewport?.isMobile || gameState === 'playing') ? 'top' : 'bottom',
        positionOverMap: gameState === 'playing' && !viewport?.isMobile,
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
        const mapFindMatch = gameState === 'playing' && !isPasswordMode
            ? /^\/find(?:\s+(.*))?$/i.exec(input.trim())
            : null;

        if (mapFindMatch) {
            const query = (mapFindMatch[1] || '').trim();
            if (!query) {
                setInput('/find ');
                focusCommandInput();
                return;
            }

            useInputStore.getState().addToHistory(input.trim());
            setActiveMapFilter(null);
            setMapSearchQuery(query);
            setInput('');
            focusCommandInput();
            return;
        }

        if (isLoginStage && rememberLogin && input.trim()) {
            if (isPasswordPrompt) setLoginPassword(input.trim());
            else if (isNamePrompt) setLoginName(input.trim());
        }
        handleSend(e);
        if (viewport?.isMobile && isPasswordPrompt) {
            inputRef.current?.blur();
        } else {
            focusCommandInput();
        }
    }, [
        gameState,
        isPasswordMode,
        input,
        setInput,
        setActiveMapFilter,
        setMapSearchQuery,
        isLoginStage,
        rememberLogin,
        isPasswordPrompt,
        isNamePrompt,
        setLoginPassword,
        setLoginName,
        handleSend,
        viewport,
        focusCommandInput
    ]);

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
    const inlineTargetParts = gameState === 'playing' && commandPreview && !input && displayedTarget && !isEditingTarget
        ? splitCommandTarget(commandPreview, displayedTarget)
        : null;
    const isTargetInline = Boolean(inlineTargetParts);
    const showLeadingTargetBadge = !isTargetInline && (!commandPreview || Boolean(input) || isEditingTarget);
    const targetBadge = gameState === 'playing' && (
        <div
            ref={targetBadgeRef}
            className={`docked-target-badge${displayedTarget ? ' has-target' : ''}${!target && displayedTarget ? ' is-auto-target' : ''}${isTargetInline ? ' docked-command-target-chip' : ''}`}
            onClick={event => {
                if (isTargetInline) event.stopPropagation();
            }}
        >
            <button
                type="button"
                className="docked-target-symbol"
                onClick={toggleTargetPicker}
                aria-expanded={isTargetPickerOpen}
                aria-haspopup="listbox"
                title="Choose a room target"
                aria-label="Choose a room target"
            >
                <Target size={12} strokeWidth={2.4} />
            </button>
            {isEditingTarget ? (
                <input
                    ref={targetInputRef}
                    className="docked-target-edit"
                    aria-label="Edit global target"
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
            ) : displayedTarget ? (
                <button
                    type="button"
                    className="docked-target-name"
                    onClick={toggleTargetPicker}
                    aria-expanded={isTargetPickerOpen}
                    aria-haspopup="listbox"
                    title="Choose a room target"
                    aria-label={`Choose a room target; current target ${displayedTarget}`}
                >{displayedTarget}</button>
            ) : null}
            {target && (
                <button
                    type="button"
                    className="docked-target-x"
                    onMouseDown={event => event.preventDefault()}
                    onClick={clearTarget}
                    title="Clear global target"
                    aria-label="Clear global target"
                >✕</button>
            )}
        </div>
    );

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
                {showLeadingTargetBadge && targetBadge}
                <div
                    ref={commandInputWrapRef}
                    className="docked-input-wrap"
                    onClick={focusCommandInput}
                >
                    {(commandTextParts || (commandPreview && !input)) && (
                        <div className="docked-input-highlight" aria-hidden={!(commandPreview && !input)}>
                            {inlineTargetParts ? (
                                <>
                                    <span className="docked-command-preview">{inlineTargetParts.before}</span>
                                    {targetBadge}
                                    <span className="docked-command-preview">{inlineTargetParts.after}</span>
                                </>
                            ) : commandPreview && !input ? (
                                <span className="docked-command-preview">{commandPreview}</span>
                            ) : commandTextParts && (
                                <>
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
                                </>
                            )}
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        id="mud-input"
                        type={isPasswordMode ? 'password' : 'text'}
                        className={`docked-input-field input-field account-input-trigger${commandTextParts || (commandPreview && !input) ? ' command-highlight-source' : ''}`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPointerDown={event => {
                            if (!viewport?.isMobile) return;
                            event.preventDefault();
                            focusCommandInput();
                        }}
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
                        placeholder={commandPreview && !input ? '' : placeholder}
                        autoComplete="off"
                        spellCheck="false"
                    />
                </div>
            </form>

            <TargetChipPicker
                isOpen={isTargetPickerOpen}
                anchorRef={targetBadgeRef}
                suggestions={roomTargetSuggestions}
                currentTarget={target || displayedTarget}
                onChoose={chooseGlobalTarget}
                onManualEntry={openManualTargetEntry}
                onDismiss={() => setIsTargetPickerOpen(false)}
            />

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

            {gameState === 'playing' && (
                <button
                    type="button"
                    className="docked-repeat-btn"
                    onClick={() => executeCommand('!', false, false, true)}
                    onPointerDown={event => event.stopPropagation()}
                    title="Repeat last command (!)"
                    aria-label="Repeat last command"
                >
                    <Repeat size={16} />
                </button>
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
