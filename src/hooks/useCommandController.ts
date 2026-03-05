import React, { useCallback } from 'react';
import { mudParser } from '../services/parser/services/mudParser';
import { useCommandExecutor } from './useCommandExecutor';
import { useInteractionHandlers } from './useInteractionHandlers';

export interface CommandControllerDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: any, text: string) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<any>;
    teleportTargets: any[];
    isDrawerCapture: React.MutableRefObject<boolean>;
    captureStage: React.MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'none'>;
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
    popoverState: any;
    setPopoverState: (val: any) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsCharacterOpen: (open: boolean) => void;
    setIsRightDrawerOpen: (open: boolean) => void;
    setIsMapExpanded: (open: boolean) => void;
    viewport: any;
    triggerHaptic: (ms: number) => void;
    btn: any;
    joystick: any;
    wasDraggingRef: React.RefObject<boolean>;
    ui: {
        mapExpanded: boolean;
        drawer: 'none' | 'inventory' | 'character' | 'right';
        setManagerOpen: boolean;
    };
    actions: import('../types').Action[];
    setActions: (val: import('../types').Action[] | ((prev: import('../types').Action[]) => import('../types').Action[])) => void;
}

export function useCommandController(deps: CommandControllerDeps) {
    const { input, setInput, isNoviceMode, viewport, triggerHaptic, setTarget, addMessage } = deps;

    const { executeCommand } = useCommandExecutor(deps);
    const { handleButtonClick, handleInputSwipe, handleLogClick, handleLogDoubleClick } = useInteractionHandlers({
        ...deps, executeCommand, ui: deps.ui
    });

    const handleSend = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const cmd = input.trim();
        if (!cmd) return;
        setInput('');

        if (isNoviceMode) {
            const result = mudParser.parse(cmd);
            if (result.finalOutput?.length) result.finalOutput.forEach(c => executeCommand(c));
            else executeCommand(cmd);
        } else {
            executeCommand(cmd);
        }

        if (viewport?.scrollToBottom) {
            viewport.scrollToBottom(true, true);
            setTimeout(() => viewport.scrollToBottom(true, true), 30);
        }
    }, [input, executeCommand, viewport, isNoviceMode, setInput]);

    return { executeCommand, handleButtonClick, handleInputSwipe, handleSend, handleLogClick, handleLogDoubleClick };
}
