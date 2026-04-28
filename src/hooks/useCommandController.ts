import React, { useCallback, useRef, useEffect } from 'react';
import { mudParser } from '../services/parser/services/mudParser';
import { useCommandExecutor } from './useCommandExecutor';
import { useInteractionHandlers } from './useInteractionHandlers';
import { useNumpadControls } from './useNumpadControls';
import { CaptureStage } from '../types';

export interface CommandControllerDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: any, text: string, extra?: any, mid?: string, room?: boolean, pre?: any, shop?: any, skill?: any, hdr?: any, skip?: boolean, ...rest: any[]) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<any>;
    teleportTargets: any[];
    captureStage: React.MutableRefObject<CaptureStage>;
    setInventoryLines: (val: any) => void;
    setStatsLines: (val: any) => void;
    setInfoLines: (val: any) => void;
    setScoreLines: (val: any) => void;
    setEqLines: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
    input: string;
    setInput: (val: string) => void;
    isNewbieMode: boolean;
    status: 'connected' | 'disconnected' | 'connecting';
    target: string | null;
    setTarget: (val: string | null) => void;
    setPendingMove: (val: { dir: string; timestamp: number } | null) => void;
    activePrompt: string;
    finalizeCapture: (targetStage?: CaptureStage) => void;
    setPendingFlags: (isSilent: boolean, fromDrawer: boolean) => void;
    popoverState: any;
    setPopoverState: (val: any) => void;
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    setIsSettingsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help' | 'buttons' | 'traits') => void;
    setIsMapExpanded: (open: boolean) => void;
    setUI: React.Dispatch<React.SetStateAction<any>>;
    viewport: any;
    triggerHaptic: (ms: number) => void;
    btn: any;
    joystick: any;
    wasDraggingRef: React.RefObject<boolean>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'character' | 'equipment' | 'inventory' | 'players' | 'stats' | 'map';
        setManagerOpen: boolean;
        isDrawerPeeking: boolean;
    };
    actions: import('../types').GameAction[];
    setActions: (val: import('../types').GameAction[] | ((prev: import('../types').GameAction[]) => import('../types').GameAction[])) => void;
    setActiveDragData: (val: any) => void;
    activeDragData: any;
    practice: any;
    heldButton: any;
    setHeldButton: (val: any) => void;
    parley: import('../types').ParleyState;
    setParley: React.Dispatch<React.SetStateAction<import('../types').ParleyState>>;
    isTrackpadModifierActive: boolean;
    shop: any;
    keywordOverrides: Record<string, string>;
    openKeywordEdit: (context: string, displayText: string) => void;
    help: any;
    lastCommandContextRef: React.MutableRefObject<{ context: string; displayText: string } | null>;
    entities: Record<string, import('../types').GameEntity>;
    applyOptimisticChange: (change: import('../types').OptimisticChange) => void;
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (id: string, setId?: string, context?: string) => void;
    clearObjectSelection: () => void;
    playClickSound: () => void;
    isSoundEnabled: boolean;
    waiting?: boolean;
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any, options?: { mask?: boolean }) => void;
    clearLog: () => void;
    replayer: any;
    isPasswordMode: boolean;
    accountState: import('../types').AccountState;
    setAccountState: React.Dispatch<React.SetStateAction<import('../types').AccountState>>;
    accountStageRef: React.MutableRefObject<import('../types').AccountStage>;
    gameState: import('../types').GameState;
    sessionMode: import('../types').SessionMode;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
    isHighlighterEnabled: boolean;
    setIsHighlighterEnabled: (val: boolean) => void;
    showLegacyButtons: boolean;
    setShowLegacyButtons: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    showRecordingIndicator: boolean;
    setShowRecordingIndicator: (val: boolean) => void;
    uiMode: import('../types').UiMode;
    setUiMode: (val: import('../types').UiMode) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    favorites: string[];
    setFavorites: (val: string[]) => void;
    nextCommandIsSilent: React.MutableRefObject<boolean>;
}


export function useCommandController(deps: CommandControllerDeps) {
    const { input, setInput, isNewbieMode, viewport, triggerHaptic, setTarget, setPendingMove, addMessage, waiting } = deps;

    const executor = useCommandExecutor(deps);
    const depsRef = useRef(deps);
    useEffect(() => { depsRef.current = deps; }, [deps]);

    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, isHistorical = false, fromDrawer = false, options?: { shouldFocus?: boolean, fromUi?: boolean }) => {
        const d = depsRef.current;
        const { viewport, waiting, isSoundEnabled, playClickSound, recordEntry, practice, shop, nextCommandIsSilent } = d;

        const effectiveSilent = silent || nextCommandIsSilent.current;
        if (nextCommandIsSilent.current) {
            console.log(`[Controller] Silencing next command: ${cmd}`);
            nextCommandIsSilent.current = false;
        }

        if (!isSystem && !silent) {
            // New: Play click sound on command entry (keyboard, numpad, or other non-button sources)
            if (!options?.fromUi && isSoundEnabled && playClickSound) {
                playClickSound();
            }

            // Defensive focus: only focus elements if explicitly requested or on desktop.
            // On mobile, never auto-focus unless it's a specific 'input:' command AND we want that behavior.
            const isInputPrefix = cmd.startsWith('input:');
            const shouldFocus = options?.shouldFocus !== undefined
                ? options.shouldFocus
                : (!viewport.isMobile || isInputPrefix);

            if (shouldFocus) {
                setTimeout(() => {
                    const inputEl = document.querySelector('input') as HTMLInputElement;
                    if (inputEl) {
                        const wasReadOnly = inputEl.readOnly;
                        if (isInputPrefix && viewport.isMobile) inputEl.readOnly = false;

                        if (document.activeElement !== inputEl) inputEl.focus();

                        if (isInputPrefix && viewport.isMobile) {
                            setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                        }
                    }
                }, 10);
            } else if (viewport.isMobile) {
                // FORCE BLUR on mobile if focus wasn't requested.
                // This breaks the "stuck focus" that causes the OS to re-open the keyboard.
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl && document.activeElement === inputEl) {
                    inputEl.blur();
                }
            }
        }

        if (cmd.toLowerCase().startsWith('practice ')) {
            practice.setLastPracticedSkill(cmd.substring(9).trim());
        } else if (cmd.toLowerCase() === 'practice') {
            if (options?.fromUi) practice.setIsUiRequested(true);
            
            // Silent system practice (e.g. initial connect sync)
            if (isSystem && effectiveSilent) practice.setSilentSyncPending(true);
        } else if (cmd.toLowerCase().startsWith('list') || cmd.toLowerCase().startsWith('browse')) {
            if (options?.fromUi) shop.setIsUiRequested(true);
        } else if (cmd.toLowerCase() === 'help' || cmd.toLowerCase().startsWith('help ')) {
            deps.help.setIsUiRequested(true);
        }

        // --- Theater Mode Search Interception ---
        if (d.sessionMode === 'replay' && !effectiveSilent && !isSystem) {
            const keyword = cmd.trim().toLowerCase();
            if (keyword && d.replayer?.log) {
                // Find next occurrence in replayer log entries (Rx only)
                const logEntries = d.replayer.log.entries;
                const currentTime = d.replayer.state.currentTime;
                
                let foundIndex = -1;
                // Search forward from current playhead
                for (let i = 0; i < logEntries.length; i++) {
                    const entry = logEntries[i];
                    if (entry.type === 'rx' && entry.timestamp > currentTime) {
                        const text = (typeof entry.data === 'string' ? entry.data : new TextDecoder().decode(new Uint8Array(entry.data))).toLowerCase();
                        if (text.includes(keyword)) {
                            foundIndex = i;
                            break;
                        }
                    }
                }

                // If not found forward, wrap around/search from start
                if (foundIndex === -1) {
                    for (let i = 0; i < logEntries.length; i++) {
                        const entry = logEntries[i];
                        if (entry.type === 'rx') {
                            const text = (typeof entry.data === 'string' ? entry.data : new TextDecoder().decode(new Uint8Array(entry.data))).toLowerCase();
                            if (text.includes(keyword)) {
                                foundIndex = i;
                                break;
                            }
                        }
                    }
                }

                if (foundIndex !== -1) {
                    const match = logEntries[foundIndex];
                    console.log(`[Replayer] Match found for "${keyword}" at ${match.timestamp}ms. Seeking...`);
                    d.replayer.pause();
                    d.replayer.seek(match.timestamp);
                } else {
                    addMessage('system', `Keyword "${keyword}" not found in session log.`, undefined, undefined, undefined, { textOnly: `Keyword "${keyword}" not found in session log.`, lower: `keyword "${keyword}" not found in session log.` });
                }
            }
            return;
        }

        executor.executeCommand(cmd, effectiveSilent, isSystem, isHistorical, fromDrawer);

        if (!effectiveSilent && !isSystem && recordEntry) {
            recordEntry('ui', { event: 'executeCommand', cmd }, { mask: d.isPasswordMode });
        }
    }, [executor.executeCommand]);

    useNumpadControls(executeCommand);

    const { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd } = useInteractionHandlers({
        ...deps, executeCommand, input, ui: deps.ui, parley: deps.parley, setParley: deps.setParley,
        isTrackpadModifierActive: deps.isTrackpadModifierActive,
        handleTabClick: deps.handleTabClick,
        keywordOverrides: deps.keywordOverrides,
        openKeywordEdit: deps.openKeywordEdit,
        lastCommandContextRef: deps.lastCommandContextRef,
        entities: deps.entities,
        applyOptimisticChange: deps.applyOptimisticChange,
        selectedObjectIds: deps.selectedObjectIds,
        toggleObjectSelection: deps.toggleObjectSelection,
        clearObjectSelection: deps.clearObjectSelection,
        playClickSound: deps.playClickSound,
        isSoundEnabled: deps.isSoundEnabled,
        initAudio: deps.initAudio,
        accountState: deps.accountState,
        setAccountState: deps.setAccountState,
        accountStageRef: deps.accountStageRef,
    });


    const handleSend = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const cmd = input.trim();
        setInput('');

        let finalCmd = cmd;
        if (deps.parley.active && cmd) {
            const TARGETLESS = ['say', 'narrate', 'shout', 'yell', 'sing'];
            const isTargetless = TARGETLESS.includes(deps.parley.command);
            if (isTargetless) {
                finalCmd = `${deps.parley.command} ${cmd}`;
            } else if (deps.parley.target) {
                finalCmd = `${deps.parley.command} ${deps.parley.target} ${cmd}`;
            } else {
                finalCmd = `${deps.parley.command} ${cmd}`;
            }
        }

        executeCommand(finalCmd);

    }, [input, executeCommand, viewport, setInput, deps.mapperRef, deps.parley]);

    return { executeCommand, handleButtonClick, handleInputSwipe, handleSend, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd };
}
