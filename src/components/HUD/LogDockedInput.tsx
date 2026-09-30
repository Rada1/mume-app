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
import { getAutoRoomTarget, isAutoTargetChipDisabledZone } from '../../utils/commandAutoTarget';
import { getRoomTargetSuggestions } from '../../utils/commandSuggestionUtils';
import { CHAT_PARLEY_CHANNELS, getChatChannelSuggestions, getChatChannelColor, getChatTargetSuggestions } from '../../utils/chatWindowUtils';
import { getTargetClassificationColor } from '../../utils/targetClassificationColor';
import type { EntityColorMap } from '../../utils/inlineActionModel';
import OpponentRechargeTimer from '../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from './ActionTimerDisplay';
import { useCommandSuggestions } from '../../hooks/useCommandSuggestions';
import { useRotatingCommandSuggestion } from '../../hooks/useRotatingCommandSuggestion';
import { useWhoListRefresh } from '../../hooks/useWhoListRefresh';
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
        characterName,
        whoList
    } = useGame();
    const { target } = useActiveVitals();
    const automaticTarget = useAutomaticTargetStore(state => state.target);
    const setAutomaticTarget = useAutomaticTargetStore(state => state.setTarget);
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const roomZone = useRoomStore(state => state.roomZone);
    const autoTargetChipDisabled = isAutoTargetChipDisabledZone(roomZone);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomTargetSuggestions = useMemo(() => [
        ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName || ''),
        ...getRoomTargetSuggestions([], Object.values(roomItems), 'objects'),
    ], [characterName, roomItems, roomOccupants]);
    const displayedTarget = target || (!autoTargetChipDisabled
        ? automaticTarget || getAutoRoomTarget('hit', roomOccupants, characterName || '', roomZone)
        : null);
    useEffect(() => {
        if (target || gameState !== 'playing') setAutomaticTarget(null);
    }, [gameState, setAutomaticTarget, target]);
    const { stats } = useVitals();
    const { displayInventoryLines, displayEqLines } = useUI();
    const requestWhoList = useWhoListRefresh(whoList, executeCommand);
    const { setActiveMapFilter, setMapSearchQuery } = useMapper();

    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const isClassicMode = useSettingsStore(s => s.isClassicMode);
    const inlineCategories = useSettingsStore(s => s.inlineCategories);
    const playerColor = useSettingsStore(s => s.playerColor);
    const npcColor = useSettingsStore(s => s.npcColor);
    const enemyColor = useSettingsStore(s => s.enemyColor);
    const neutralColor = useSettingsStore(s => s.neutralColor);
    const theme = useSettingsStore(s => s.theme);
    const loginName = useSettingsStore(s => s.loginName);
    const loginPassword = useSettingsStore(s => s.loginPassword);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const inputRef = useRef<HTMLInputElement>(null);
    const parleyCommandRef = useRef<HTMLButtonElement>(null);
    const parleyTargetRef = useRef<HTMLButtonElement>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);
    const targetBadgeRef = useRef<HTMLDivElement>(null);
    const cancelTargetEditRef = useRef(false);
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [targetDraft, setTargetDraft] = useState('');
    const [isTargetPickerOpen, setIsTargetPickerOpen] = useState(false);
    const [openParleyPicker, setOpenParleyPicker] = useState<'channel' | 'target' | null>(null);
    const parleyChannelSuggestions = useMemo(() => getChatChannelSuggestions(), []);
    const parleyTargetSuggestions = useMemo(() => getChatTargetSuggestions(whoList), [whoList]);
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
        toggleMagicKeyFavorite,
        clearMagicKey,
        handleSuggestionKeyDown
    } = useCommandSuggestions({
        input,
        setInput,
        gameState,
        isPasswordMode,
        currentMode,
        disabled: isClassicMode,
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
    const showRotatingSuggestion = !isClassicMode && gameState === 'playing' && currentMode === 'command' && !input && !commandPreview;
    const rotatingCommand = useRotatingCommandSuggestion(showRotatingSuggestion);

    const isParleyActive = Boolean(parley?.active && parley?.command);
    const parleyChannelColor = getChatChannelColor(parley.command);
    const parleyTargetColor = getTargetClassificationColor(
        'who',
        inlineCategories,
        { player: playerColor, ally: playerColor, npc: npcColor, enemy: enemyColor, neutral: neutralColor } as EntityColorMap,
        theme
    ) || '#61c290';

    const handleParleyCommandClick = useCallback(() => {
        triggerHaptic?.(20);
        setOpenParleyPicker(current => current === 'channel' ? null : 'channel');
    }, [triggerHaptic]);

    const handleParleyTargetClick = useCallback(() => {
        triggerHaptic?.(20);
        const isOpening = openParleyPicker !== 'target';
        if (isOpening) requestWhoList();
        setOpenParleyPicker(isOpening ? 'target' : null);
    }, [openParleyPicker, requestWhoList, triggerHaptic]);

    const chooseParleyChannel = useCallback((value: string) => {
        const command = CHAT_PARLEY_CHANNELS.find(channel => channel === value);
        if (!command) return;
        setParley(current => ({ ...current, command }));
        setOpenParleyPicker(null);
    }, [setParley]);

    const chooseParleyTarget = useCallback((value: string) => {
        setParley(current => ({ ...current, target: value || null }));
        setOpenParleyPicker(null);
    }, [setParley]);

    const handleParleyClear = useCallback(() => {
        setParley(prev => ({ ...prev, active: false, mode: 'command', command: 'none', target: null, message: '' }));
    }, [setParley]);

    const handleParleyTargetClear = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setParley(prev => ({ ...prev, target: null }));
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
            : (isClassicMode ? 'Enter command...' : (showRotatingSuggestion ? `Try: ${rotatingCommand}...` : 'Enter command...')));
    const inlineTargetParts = gameState === 'playing' && commandPreview && !input && displayedTarget && !isEditingTarget
        ? splitCommandTarget(commandPreview, displayedTarget)
        : null;
    const isTargetInline = Boolean(inlineTargetParts);
    const showLeadingTargetBadge = !isTargetInline && (!commandPreview || Boolean(input) || isEditingTarget);
    const targetBadge = gameState === 'playing' && !isParleyActive && (
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
                <>
                    <div
                        className="docked-parley-chip"
                        role="group"
                        aria-label="Communication channel"
                        style={{ borderColor: parleyChannelColor }}
                    >
                        <button
                            type="button"
                            ref={parleyCommandRef}
                            className="parley-action"
                            onPointerDown={event => {
                                event.preventDefault();
                                handleParleyCommandClick();
                            }}
                            onClick={event => {
                                if (event.detail === 0) handleParleyCommandClick();
                            }}
                            title="Choose another communication command"
                            aria-label={`Choose another communication command; current command ${parley.command}`}
                        >
                            <span className="parley-cmd" style={{ color: parleyChannelColor }}>{parley.command}</span>
                        </button>
                        <button
                            type="button"
                            className="parley-x"
                            onMouseDown={event => event.preventDefault()}
                            onClick={event => { event.preventDefault(); event.stopPropagation(); handleParleyClear(); }}
                            title="Clear communication command"
                            aria-label="Clear communication command"
                        >&times;</button>
                    </div>
                    {['tell', 'whisper', 'ask'].includes(parley.command) && (
                        <div
                            className="docked-parley-chip docked-parley-target-chip"
                            role="group"
                            aria-label="Communication target"
                            style={{ borderColor: parleyTargetColor }}
                        >
                            <button
                                type="button"
                                ref={parleyTargetRef}
                                className="parley-action parley-target-action"
                                onPointerDown={event => {
                                    event.preventDefault();
                                    handleParleyTargetClick();
                                }}
                                onClick={event => {
                                    if (event.detail === 0) handleParleyTargetClick();
                                }}
                                title="Choose a communication target"
                                aria-label={parley.target ? `Change target ${parley.target}` : 'Choose a communication target'}
                            >
                                <span className="parley-tgt" style={{ color: parleyTargetColor }}>{parley.target || 'Select target'}</span>
                            </button>
                            {parley.target && (
                                <button
                                    type="button"
                                    className="parley-x"
                                    onMouseDown={event => event.preventDefault()}
                                    onClick={handleParleyTargetClear}
                                    title="Clear communication target"
                                    aria-label="Clear communication target"
                                >&times;</button>
                            )}
                        </div>
                    )}
                </>
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
            <TargetChipPicker
                isOpen={openParleyPicker === 'channel'}
                anchorRef={parleyCommandRef}
                suggestions={parleyChannelSuggestions}
                currentTarget={parley.command}
                title="Communication channel"
                showMeta={false}
                onChoose={chooseParleyChannel}
                onDismiss={() => setOpenParleyPicker(null)}
            />
            <TargetChipPicker
                isOpen={openParleyPicker === 'target'}
                anchorRef={parleyTargetRef}
                suggestions={parleyTargetSuggestions}
                currentTarget={parley.target}
                title="Communication target"
                onChoose={chooseParleyTarget}
                onDismiss={() => setOpenParleyPicker(null)}
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
                onToggleMagicKeyFavorite={toggleMagicKeyFavorite}
                onClearMagicKey={clearMagicKey}
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
