import React, { useCallback } from 'react';
import { mudParser } from '../services/parser/services/mudParser';
import { useCommandExecutor } from './useCommandExecutor';
import { useInteractionHandlers } from './useInteractionHandlers';
import { useNumpadControls } from './useNumpadControls';
import { CaptureStage } from '../types';

export interface CommandControllerDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: any, text: string, combat?: boolean, mid?: string, room?: boolean, pre?: any, shop?: any, skill?: any, hdr?: any, skip?: boolean) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<any>;
    teleportTargets: any[];
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    captureStage: React.MutableRefObject<CaptureStage>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    setInventoryLines: (val: any) => void;
    setStatsLines: (val: any) => void;
    setEqLines: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
    input: string;
    setInput: (val: string) => void;
    isNoviceMode: boolean;
    status: 'connected' | 'disconnected' | 'connecting';
    target: string | null;
    setTarget: (val: string | null) => void;
    finalizeCapture: (targetStage?: CaptureStage) => void;
    popoverState: any;
    setPopoverState: (val: any) => void;
    setIsCharacterOpen: (open: boolean) => void;
    setIsStatsOpen: (open: boolean) => void;
    setIsEquipmentOpen: (open: boolean) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsPlayersOpen: (open: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help') => void;
    setIsMapExpanded: (open: boolean) => void;
    setUI: React.Dispatch<React.SetStateAction<any>>;
    viewport: any;
    triggerHaptic: (ms: number) => void;
    btn: any;
    joystick: any;
    wasDraggingRef: React.RefObject<boolean>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'character' | 'equipment' | 'inventory';
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
    lastCommandContextRef: React.MutableRefObject<{ context: string; displayText: string } | null>;
    entities: Record<string, import('../types').GameEntity>;
    applyOptimisticChange: (change: import('../types').OptimisticChange) => void;
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (id: string, setId?: string, context?: string) => void;
    clearObjectSelection: () => void;
    playClickSound: () => void;
    isSoundEnabled: boolean;
}


export function useCommandController(deps: CommandControllerDeps) {
    const { input, setInput, isNoviceMode, viewport, triggerHaptic, setTarget, addMessage } = deps;

    const executor = useCommandExecutor(deps);
    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, isHistorical = false, fromDrawer = false, options?: { shouldFocus?: boolean, fromUi?: boolean }) => {
        if (!isSystem && !silent) {
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
            deps.practice.setLastPracticedSkill(cmd.substring(9).trim());
        } else if (cmd.toLowerCase() === 'practice') {
            if (options?.fromUi) deps.practice.setIsUiRequested(true);
            // Silent system practice (e.g. initial connect sync) — flag it so the
            // response stays hidden even if a game prompt fires before it arrives.
            if (silent && isSystem) deps.practice.setSilentSyncPending(true);
        } else if (cmd.toLowerCase().startsWith('list') || cmd.toLowerCase().startsWith('browse')) {
            if (options?.fromUi) deps.shop.setIsUiRequested(true);
        }

        executor.executeCommand(cmd, silent, isSystem, isHistorical, fromDrawer);
    }, [executor, viewport.isMobile]);

    useNumpadControls(executeCommand);

    const { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd } = useInteractionHandlers({
        ...deps, executeCommand, input, ui: deps.ui, parley: deps.parley, setParley: deps.setParley,
        isTrackpadModifierActive: deps.isTrackpadModifierActive,
        setIsPlayersOpen: deps.setIsPlayersOpen,
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

        if (isNoviceMode && finalCmd) {
            const result = mudParser.parse(finalCmd);
            if (result.finalOutput?.length) result.finalOutput.forEach(c => executeCommand(c));
            else executeCommand(finalCmd);
        } else {
            executeCommand(finalCmd);
        }

    }, [input, executeCommand, viewport, isNoviceMode, setInput, deps.mapperRef, deps.parley]);

    return { executeCommand, handleButtonClick, handleInputSwipe, handleSend, handleLogClick, handleLogDoubleClick, handleLogPointerDown, handleLogPointerUp, handleDragStart, handleDragEnd };
}
