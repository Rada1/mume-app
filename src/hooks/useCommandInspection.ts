/** @file useCommandInspection.ts — Runs and captures inspection commands for the command workspace. */
import React from 'react';
import type { CommandInspectionOptions, PopoverState } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useGame, useUI } from '../context/GameContext';

// --- Logic Section ---
export const useCommandInspection = ({ activeState, scope: activeScope, isVisible = true }: CommandInspectionOptions) => {
    const game = useGame();
    const ui = useUI();
    const targetContext = activeState.context || null;
    const setActivePopoverState = React.useCallback((update: React.SetStateAction<PopoverState | null>) => {
        const current = activeState;
        ui.setPopoverState(typeof update === 'function' ? update(current) : update);
    }, [activeState, ui.setPopoverState]);
    const setInspecting = (kind: 'look' | 'consider' | 'examine') => {
        const capturesExamine = kind === 'look' || kind === 'examine';
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingExamine: capturesExamine,
            capturedExamineLines: capturesExamine ? undefined : current.capturedExamineLines,
            examineMode: capturesExamine ? kind : current.examineMode,
            isCapturingConsider: !capturesExamine,
            capturedConsiderLines: capturesExamine ? current.capturedConsiderLines : undefined,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            isCapturingWhois: false,
            capturedWhoisLines: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined,
            whoisTarget: undefined
        }));
        const command = activeScope === 'room' ? kind : kind === 'look' ? `look ${targetContext}` : `${kind === 'consider' ? 'con' : 'examine'} ${targetContext}`;
        game.executeCommand(command, false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestRoomReport = (kind: 'who' | 'where' | 'exits' | 'map' | 'weather local') => {
        if (activeScope !== 'room') return;
        const roomActionKind = kind === 'exits' || kind === 'map' || kind === 'weather local' ? kind : undefined;
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingExamine: false,
            isCapturingConsider: false,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            isCapturingWhois: false,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: kind === 'who',
            capturedWhoLines: undefined,
            isCapturingWhere: kind === 'where',
            capturedWhereLines: undefined,
            isCapturingRoomAction: roomActionKind !== undefined,
            roomActionKind,
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined
        }));
        game.executeCommand(kind, false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestWeatherReport = (scope: 'global' | 'fog') => {
        const command = `weather ${scope}`;
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingExamine: false,
            isCapturingConsider: false,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            isCapturingWhois: false,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: true,
            roomActionKind: scope === 'fog' ? 'weather fog' : 'weather global',
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined
        }));
        game.executeCommand(command, false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestWhois = (target?: CommandActionTargetEntry) => {
        const whoisContext = target?.context || targetContext;
        if (!whoisContext) return;
        setActivePopoverState(current => ({
            ...current,
            ...(target ? { context: target.context, keyword: target.keyword, displayName: target.label,
                entityId: target.id, category: target.category, setId: target.category } : {}),
            hasInspectionCard: true,
            isCapturingWhois: true,
            capturedWhoisLines: undefined,
            whoisTarget: whoisContext,
            isCapturingExamine: false,
            isCapturingConsider: false,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            capturedExamineLines: undefined,
            capturedConsiderLines: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined
        }));
        game.executeCommand(`whois ${whoisContext}`, true, true, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestExamine = (command: string) => {
        if (activeScope === 'room') { setInspecting('examine'); return; }
        const resolved = command.replace(/%n/g, targetContext || '').trim();
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingExamine: true,
            capturedExamineLines: undefined,
            examineMode: 'examine',
            isCapturingConsider: false,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            capturedConsiderLines: undefined,
            isCapturingWhois: false,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined
        }));
        game.executeCommand(resolved || `examine ${targetContext || ''}`.trim(), false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestHelp = (topic: string) => {
        const helpTopic = topic.trim();
        if (!helpTopic) return;
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingHelp: true,
            capturedHelpLines: undefined,
            helpTopic,
            isCapturingExamine: false,
            capturedExamineLines: undefined,
            isCapturingConsider: false,
            capturedConsiderLines: undefined,
            isCapturingWhois: false,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined,
            isCapturingPersonalAction: false,
            personalActionKind: undefined,
            capturedPersonalActionLines: undefined
        }));
        game.executeCommand(`help ${helpTopic.toLowerCase()}`, false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const requestPersonalReport = (kind: 'info' | 'stat' | 'score') => {
        if (activeScope !== 'self') return;
        setActivePopoverState(current => ({
            ...current,
            hasInspectionCard: true,
            isCapturingPersonalAction: true,
            personalActionKind: kind,
            capturedPersonalActionLines: undefined,
            isCapturingExamine: false,
            capturedExamineLines: undefined,
            examineMode: undefined,
            isCapturingConsider: false,
            capturedConsiderLines: undefined,
            isCapturingHelp: false,
            capturedHelpLines: undefined,
            helpTopic: undefined,
            isCapturingWhois: false,
            capturedWhoisLines: undefined,
            whoisTarget: undefined,
            isCapturingWho: false,
            capturedWhoLines: undefined,
            isCapturingWhere: false,
            capturedWhereLines: undefined,
            isCapturingRoomAction: false,
            roomActionKind: undefined,
            capturedRoomActionLines: undefined
        }));
        game.executeCommand(kind, false, false, false, false, { shouldFocus: false, fromUi: true });
    };
    const closeDetails = () => setActivePopoverState(current => ({
        ...current,
        hasInspectionCard: false,
        isCapturingExamine: false,
        isCapturingConsider: false,
        isCapturingHelp: false,
        capturedHelpLines: undefined,
        helpTopic: undefined,
        isCapturingWhois: false,
        isCapturingWho: false,
        isCapturingWhere: false,
        capturedExamineLines: undefined,
        capturedConsiderLines: undefined,
        capturedWhoisLines: undefined,
        capturedWhoLines: undefined,
        capturedWhereLines: undefined,
        isCapturingRoomAction: false,
        roomActionKind: undefined,
        capturedRoomActionLines: undefined,
        isCapturingPersonalAction: false,
        personalActionKind: undefined,
        capturedPersonalActionLines: undefined,
        whoisTarget: undefined
    }));
    const capture = ui.popoverState?.entityId === activeState.entityId ? ui.popoverState : null;
    const hasCapturedDetails = isVisible && !!(capture?.hasInspectionCard || capture?.isCapturingExamine || capture?.isCapturingConsider || capture?.isCapturingHelp || capture?.isCapturingWhois || capture?.isCapturingWho || capture?.isCapturingWhere || capture?.isCapturingRoomAction || capture?.isCapturingPersonalAction || capture?.capturedExamineLines || capture?.capturedConsiderLines || capture?.capturedHelpLines || capture?.capturedWhoisLines || capture?.capturedWhoLines || capture?.capturedWhereLines || capture?.capturedRoomActionLines || capture?.capturedPersonalActionLines);
    React.useEffect(() => {
        document.body.classList.toggle('has-unified-command-details', hasCapturedDetails);
        return () => document.body.classList.remove('has-unified-command-details');
    }, [hasCapturedDetails]);
    return { setActivePopoverState, setInspecting, requestRoomReport, requestWeatherReport, requestWhois, requestExamine, requestHelp, requestPersonalReport, closeDetails, capture, hasCapturedDetails };
};
