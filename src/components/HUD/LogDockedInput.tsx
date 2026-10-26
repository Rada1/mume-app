/**
 * @file LogDockedInput.tsx
 * @description Command input bar docked directly inside the bottom of the message log container, matching the approved studio mockup.
 */

// --- Logic Section ---
import React, { FC, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, Repeat, Send, X } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAutomaticTargetForRoom, useAutomaticTargetStore } from '../../stores/useAutomaticTargetStore';
import { getRoomIdentityKey } from '../../utils/roomIdentityUtils';
import { getAutoRoomTarget } from '../../utils/commandAutoTarget';
import { getRoomTargetSuggestions, makeCommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import { getRoomNpcAndEnemyTargetSuggestions } from '../../objects/roomTargetSuggestions';
import { getNonGroupmateRoomTargetSuggestions } from '../../utils/groupTargetSuggestions';
import OpponentRechargeTimer from '../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from './ActionTimerDisplay';
import { useCommandSuggestions } from '../../hooks/useCommandSuggestions';
import { CommandArgumentText } from '../Controls/CommandArgumentText';
import { useRotatingCommandSuggestion } from '../../hooks/useRotatingCommandSuggestion';
import { useWhoListRefresh } from '../../hooks/useWhoListRefresh';
import { useAutoGrowTextarea } from '../../hooks/useAutoGrowTextarea';
import { useDesktopCommandInputFocus } from '../../hooks/useDesktopCommandInputFocus';
import { CommandSuggestionPopup } from '../Controls/CommandSuggestionPopup';
import { TargetChipPicker } from './TargetChipPicker';
import { TacticalArgumentChips } from './TacticalArgumentChips';
import { useTacticalArgumentChipStore } from '../../stores/useTacticalArgumentChipStore';
import './LogDockedInput.css';
import { ParleyChannelChip } from '../Messages/ParleyChannelChip';
import { getCommandTextColor } from '../../utils/swipeCommandColors';

interface LogDockedInputProps {
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe?: (dir: 'up' | 'down' | 'left' | 'right' | 'sw') => void;
    commandPreview?: string | null;
    commandDockActive?: boolean;
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
    commandPreview,
    commandDockActive = false
}) => {
    const {
        viewport,
        status,
        gameState,
        accountState,
        isPasswordMode,
        parley,
        setParley,
        abilities,
        characterClass,
        practice,
        executeCommand,
        setTarget,
        clearObjectSelection,
        triggerHaptic,
        characterName,
        whoList,
    } = useGame();
    const { target, characterInfo } = useActiveVitals();
    const { stats, groupMembers } = useVitals();
    const setAutomaticTarget = useAutomaticTargetStore(state => state.setTarget);
    const autoTargetEnabled = useAutomaticTargetStore(state => state.enabled);
    const setAutoTargetEnabled = useAutomaticTargetStore(state => state.setEnabled);
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const roomNum = useRoomStore(state => state.roomNum);
    const roomName = useRoomStore(state => state.roomName);
    const roomDesc = useRoomStore(state => state.roomDesc);
    const roomZone = useRoomStore(state => state.roomZone);
    const automaticTargetRoomKey = getRoomIdentityKey({ roomNum, roomName, roomZone, roomDesc });
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomTargetSuggestions = useMemo(
        () => getRoomNpcAndEnemyTargetSuggestions(roomOccupants, characterName || ''),
        [characterName, roomOccupants]
    );
    const automaticTargetSuggestions = useMemo(() => [
        ...getNonGroupmateRoomTargetSuggestions(roomOccupants, groupMembers, characterName || ''),
        ...getRoomTargetSuggestions([], Object.values(roomItems), 'objects'),
    ], [characterName, groupMembers, roomItems, roomOccupants]);
    const automaticTarget = useAutomaticTargetForRoom(automaticTargetRoomKey, automaticTargetSuggestions);
    const characterRaces = [characterInfo.race, characterInfo.subrace]
        .filter(Boolean)
        .map(value => value!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''));
    const isEvilRace = characterRaces.some(race => ['blacknumenorean', 'troll', 'orc'].includes(race));
    const commonPvpTargetNames = isEvilRace
        ? ['man', 'hobbit', 'elf', 'dwarf', 'half-elf']
        : ['orc', 'troll', 'man'];
    const commonPvpTargets = useMemo(() => commonPvpTargetNames.map(name =>
        makeCommandTargetSuggestion(`*${name}*`, `*${name}*`, 'player')
    ), [isEvilRace]);
    const displayedTarget = target || (autoTargetEnabled
        ? automaticTarget || getAutoRoomTarget('hit', roomOccupants, characterName || '', groupMembers)
        : null);
    useEffect(() => {
        if (target || gameState !== 'playing') setAutomaticTarget(null);
    }, [gameState, setAutomaticTarget, target]);
    const { displayInventoryLines, displayEqLines } = useUI();
    const requestWhoList = useWhoListRefresh(whoList, executeCommand);
    const { setActiveMapFilter, setMapSearchQuery } = useMapper();

    const input = useInputStore(s => s.input);
    const setInput = useInputStore(s => s.setInput);
    const tacticalArgumentCommand = useTacticalArgumentChipStore(state => state.command);
    const tacticalArgumentChips = useTacticalArgumentChipStore(state => state.chips);
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const isClassicMode = useSettingsStore(s => s.isClassicMode);
    const loginName = useSettingsStore(s => s.loginName);
    const loginPassword = useSettingsStore(s => s.loginPassword);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    useDesktopCommandInputFocus(!viewport?.isMobile, inputRef, setInput);
    const commandInputHighlightRef = useRef<HTMLDivElement>(null);
    const { textareaRef, resizeTextarea } = useAutoGrowTextarea(
        input,
        Boolean(viewport?.isMobile) && !isPasswordMode,
    );
    const setInputElementRef = useCallback((element: HTMLInputElement | HTMLTextAreaElement | null) => {
        inputRef.current = element;
        textareaRef.current = element instanceof HTMLTextAreaElement ? element : null;
    }, [textareaRef]);
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
        const nextTarget = value.trim() || null;
        setTarget(nextTarget);
        if (!nextTarget || nextTarget !== target) clearObjectSelection();
        setIsEditingTarget(false);
        inputRef.current?.focus();
    }, [clearObjectSelection, setTarget, target]);

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
        clearObjectSelection();
        inputRef.current?.blur();
    }, [clearObjectSelection, setTarget, triggerHaptic]);

    const toggleTargetPicker = useCallback(() => {
        triggerHaptic?.(10);
        setIsTargetPickerOpen(open => !open);
    }, [triggerHaptic]);

    const chooseGlobalTarget = useCallback((value: string) => {
        setTarget(value);
        if (value !== target) clearObjectSelection();
        if (value !== (target || '')) triggerHaptic?.(15);
        setIsTargetPickerOpen(false);
    }, [clearObjectSelection, setTarget, target, triggerHaptic]);

    const toggleAutoTarget = useCallback(() => {
        if (!autoTargetEnabled) {
            setTarget(null);
            clearObjectSelection();
        }
        setAutoTargetEnabled(!autoTargetEnabled);
        triggerHaptic?.(15);
        setIsTargetPickerOpen(false);
    }, [autoTargetEnabled, clearObjectSelection, setAutoTargetEnabled, setTarget, triggerHaptic]);

    const openManualTargetEntry = useCallback(() => {
        setAutoTargetEnabled(false);
        setIsTargetPickerOpen(false);
        beginTargetEdit();
    }, [beginTargetEdit, setAutoTargetEnabled]);

    const currentMode = parley?.mode || (parley?.active ? 'parley' : 'command');

    const {
        commandTextParts,
        commandTextColor,
        mumeCommandMatch,
        showCompletionPopup,
        showCommandPopup,
        showTargetPopup,
        showSpellPopup,
        visibleCommandSuggestions,
        targetSuggestions,
        commandArgumentChips,
        commandArgumentCaretKey,
        selectedTargetSuggestion,
        spellSuggestions,
        popupStyle,
        placement,
        setIsFocused,
        chooseCommandSuggestion,
        chooseTargetSuggestion,
        chooseCommandArgumentSuggestion,
        chooseSpellSuggestion,
        toggleMagicKeyFavorite,
        clearMagicKey,
        handleSuggestionKeyDown,
        handleCommandArgumentKeyDown,
        clearCommandArgumentCaret
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
        wornLines: displayEqLines,
        characterName: characterName || '',
        practiceSkills: practice?.practiceData?.skills || [],
        preferredTarget: target
    });

    const showsStandaloneAccountInput = accountState?.stage === 'login' ||
        accountState?.stage === 'account-confirmation';
    const isLoginStage = gameState === 'account' && accountState?.stage === 'login';
    const isLoginReady = isLoginStage && status === 'connected' && Boolean(accountState?.currentPrompt?.trim());
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
    const showTacticalArgumentChips = gameState === 'playing' && !input && Boolean(tacticalArgumentCommand && tacticalArgumentChips.length);
    const rotatingCommand = useRotatingCommandSuggestion(showRotatingSuggestion);

    const isParleyActive = Boolean(parley?.active && parley?.command);
    const handleParleyClear = useCallback((blurOnMobile = true) => {
        setParley(prev => ({ ...prev, active: false, mode: 'command', command: 'none', target: null, message: '' }));
        if (blurOnMobile && viewport?.isMobile) inputRef.current?.blur();
    }, [setParley, viewport?.isMobile]);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isLoginStage && !isLoginReady) return;
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
        isLoginReady,
        rememberLogin,
        isPasswordPrompt,
        isNamePrompt,
        setLoginPassword,
        setLoginName,
        handleSend,
        viewport,
        focusCommandInput
    ]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (handleSuggestionKeyDown(e)) {
            return;
        }
        if (handleCommandArgumentKeyDown(e)) return;

        if (e.key === 'Backspace' && isParleyActive
            && e.currentTarget.selectionStart === 0
            && e.currentTarget.selectionEnd === 0) {
            e.preventDefault();
            handleParleyClear(false);
            return;
        }

        if (e.key === 'Enter') {
            if (e.shiftKey && viewport?.isMobile && !isPasswordMode) return;
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
    }, [handleCommandArgumentKeyDown, handleParleyClear, handleSuggestionKeyDown, handleSubmit, isParleyActive, isPasswordMode, setInput, viewport?.isMobile]);

    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setInput(event.currentTarget.value);
        if (event.currentTarget instanceof HTMLTextAreaElement) resizeTextarea(event.currentTarget);
    }, [resizeTextarea, setInput]);

    const syncCommandHighlightScroll = useCallback((event: React.UIEvent<HTMLTextAreaElement>) => {
        if (commandInputHighlightRef.current) {
            commandInputHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
        }
    }, []);

    const handleInputPointerDown = useCallback(() => {
        // Clear inline argument caret state while leaving native text caret placement intact.
        clearCommandArgumentCaret();
    }, [clearCommandArgumentCaret]);

    const handleInputFocus = useCallback(() => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setIsFocused(true);
    }, [setIsFocused]);

    const handleInputBlur = useCallback(() => {
        if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = setTimeout(() => {
            setIsFocused(false);
            blurTimeoutRef.current = null;
        }, 150);
    }, [setIsFocused]);

    const placeholder = isPasswordMode
        ? 'Enter password...'
        : (gameState === 'account'
            ? (showsStandaloneAccountInput ? 'Enter username...' : 'Enter account command...')
            : (isClassicMode ? 'Enter command...' : (showRotatingSuggestion ? `Try: ${rotatingCommand}...` : 'Enter command...')));
    const inlineTargetParts = gameState === 'playing' && commandPreview && !input && displayedTarget && !isEditingTarget
        ? splitCommandTarget(commandPreview, displayedTarget)
        : null;
    const displayedCommandPreview = inlineTargetParts
        ? [inlineTargetParts.before.trimEnd(), inlineTargetParts.after.trimStart()].filter(Boolean).join(' ')
        : commandPreview;
    const targetBadge = gameState === 'playing' && !isParleyActive && (
        <div
            ref={targetBadgeRef}
            className={`docked-target-badge${displayedTarget ? ' has-target' : ''}${autoTargetEnabled && !target ? ' is-auto-target' : ''}`}
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
                <Crosshair size={16} strokeWidth={1.75} aria-hidden="true" />
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
            ) : displayedTarget || autoTargetEnabled ? (
                <button
                    type="button"
                    className="docked-target-name"
                    onClick={toggleTargetPicker}
                    aria-expanded={isTargetPickerOpen}
                    aria-haspopup="listbox"
                    title="Choose a room target"
                    aria-label={`Choose a room target; current target ${autoTargetEnabled ? `Auto${displayedTarget ? `: ${displayedTarget}` : ''}` : displayedTarget}`}
                >{autoTargetEnabled ? `Auto${displayedTarget ? `: ${displayedTarget}` : ''}` : displayedTarget}</button>
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
        <div className={`message-log-docked-input${commandDockActive ? ' command-dock-row' : ''}`}>
            {commandDockActive && <div id="command-dock-controls" className="command-dock-controls" />}
            <div className={commandDockActive ? 'command-dock-input-main' : 'command-dock-input-main is-inline'}>
            <span className="docked-prompt-symbol">&gt;</span>

            {isParleyActive && <ParleyChannelChip command={parley.command} target={parley.target} whoList={whoList}
                requestWhoList={requestWhoList} onClear={handleParleyClear}
                onChoose={(command,target) => { setParley(current => ({...current,command,target})); triggerHaptic?.(15); }} />}
            <form className="docked-input-form" onSubmit={handleSubmit}>
                <div
                    ref={commandInputWrapRef}
                    className="docked-input-wrap"
                    onClick={event => {
                        // Focusing the field again after a mobile tap can move its caret to the end.
                        if (event.target !== inputRef.current) focusCommandInput();
                    }}
                >
                    {(commandTextParts || (commandPreview && !input) || showTacticalArgumentChips) && (
                        <div ref={commandInputHighlightRef} className="docked-input-highlight" aria-hidden={!(commandPreview && !input) && !showTacticalArgumentChips && commandArgumentChips.length === 0}>
                            {showTacticalArgumentChips ? (
                                <TacticalArgumentChips />
                            ) : displayedCommandPreview && !input ? (
                                <span className="docked-command-preview" style={{ color: getCommandTextColor(displayedCommandPreview) }}>
                                    {displayedCommandPreview}
                                </span>
                            ) : commandTextParts && (
                                <>
                                    <span>{commandTextParts.leading}</span>
                                    <span className={commandTextParts.isValid ? 'command-input-token-valid' : 'command-input-token-plain'}
                                        style={{ color: commandTextColor, textShadow: commandTextColor ? 'none' : undefined }}>
                                        {commandTextParts.token}
                                    </span>
                                    {!commandTextParts.suffix && commandTextParts.autocomplete && (
                                        <span className="docked-input-autocomplete command-input-autocomplete" style={{ color: commandTextColor, opacity: commandTextColor ? 0.4 : undefined }}>
                                            {commandTextParts.autocomplete}
                                        </span>
                                    )}
                                    <CommandArgumentText
                                        text={commandTextParts.suffix}
                                        offset={commandTextParts.leading.length + commandTextParts.token.length}
                                        chips={commandArgumentChips}
                                        caretKey={commandArgumentCaretKey}
                                        onChooseChip={chooseCommandArgumentSuggestion}
                                    />
                                </>
                            )}
                        </div>
                    )}
                    {isPasswordMode ? (
                        <input
                            ref={setInputElementRef}
                            id="mud-input"
                            name="mud-input"
                            type="password"
                            className={`docked-input-field input-field account-input-trigger${commandTextParts || (commandPreview && !input) || showTacticalArgumentChips ? ' command-highlight-source' : ''}${commandArgumentCaretKey ? ' command-argument-caret-hidden' : ''}`}
                            value={input}
                            disabled={isLoginStage && !isLoginReady}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onPointerDown={handleInputPointerDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder={(commandPreview && !input) || showTacticalArgumentChips ? '' : placeholder}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                    ) : (
                        <textarea
                            ref={setInputElementRef}
                            id="mud-input"
                            name="mud-input"
                            className={`docked-input-field input-field account-input-trigger${commandTextParts || (commandPreview && !input) || showTacticalArgumentChips ? ' command-highlight-source' : ''}${commandArgumentCaretKey ? ' command-argument-caret-hidden' : ''}`}
                            value={input}
                            disabled={isLoginStage && !isLoginReady}
                            rows={1}
                            wrap={viewport?.isMobile ? 'soft' : 'off'}
                            onChange={handleInputChange}
                            onScroll={syncCommandHighlightScroll}
                            onKeyDown={handleKeyDown}
                            onPointerDown={handleInputPointerDown}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder={(commandPreview && !input) || showTacticalArgumentChips ? '' : placeholder}
                            autoComplete="off"
                            spellCheck="false"
                        />
                    )}
                </div>
                {targetBadge}
            </form>

            <TargetChipPicker
                isOpen={isTargetPickerOpen}
                anchorRef={targetBadgeRef}
                suggestions={roomTargetSuggestions}
                commonTargets={commonPvpTargets}
                currentTarget={target || displayedTarget}
                title="NPCs & enemies"
                autoTargetEnabled={autoTargetEnabled}
                onToggleAutoTarget={toggleAutoTarget}
                largeOnMobile
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
                    <X size={15} strokeWidth={2.4} aria-hidden="true" />
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
                    {isNamePrompt && <button type="button" className="docked-send-btn" disabled={!isLoginReady} onClick={() => executeCommand('new')}>NEW ACCOUNT</button>}
                </div>
            )}

            <button
                type="button"
                className={`docked-send-btn${isLoginStage ? '' : ' is-send-icon'}`}
                disabled={isLoginStage && (!isLoginReady || !input.trim())}
                onClick={() => handleSubmit()}
                aria-label={isLoginStage ? 'Login' : 'Send command'}
                title={isLoginStage ? (isLoginReady ? 'Login' : 'Waiting for the server prompt') : 'Send command'}
            >
                {isLoginStage ? (isLoginReady ? 'LOGIN' : status === 'connected' ? 'WAITING' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE') : <Send size={15} strokeWidth={2.4} aria-hidden="true" />}
            </button>
            </div>
            {commandDockActive && <div id="command-dock-actions" className="command-dock-actions" />}
            {commandDockActive && <div id="command-dock-menu" className="command-dock-menu" />}
        </div>
    );
};

export default LogDockedInput;
