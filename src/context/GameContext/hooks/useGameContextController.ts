import { useMemo } from 'react';
import { useCommandController as useBaseCommandController } from '../../../hooks/useCommandController';

interface UseGameContextControllerProps {
    s: any; v: any;
    telnet: any;
    addMessage: any; initAudio: any; navIntervalRef: any; mapperRef: any; teleportTargets: any; input: any; setInput: any;
    isNoviceMode: boolean;
    parser: any;
    setIsSettingsOpen: any; setSettingsTab: any;
    viewport: any; triggerHaptic: any; btn: any; joystick: any; editor: any; practice: any; shop: any;
    keywordOverrides: any; openKeywordEdit: any; lastCommandContextRef: any; playClickSound: any;
    sanitizedRecordEntry: any;
}

export const useGameContextController = ({
    s, v, telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets, input, setInput,
    isNoviceMode, parser, setIsSettingsOpen, setSettingsTab, viewport, triggerHaptic, btn, joystick, editor, practice, shop,
    keywordOverrides, openKeywordEdit, lastCommandContextRef, playClickSound, sanitizedRecordEntry
}: UseGameContextControllerProps) => {

    const controllerDeps = useMemo(() => ({
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture: s.isDrawerCapture, isSilentCapture: s.isSilentCapture, captureStage: s.captureStage,
        isWaitingForStats: s.isWaitingForStats, isWaitingForEq: s.isWaitingForEq, isWaitingForInv: s.isWaitingForInv,
        setInventoryLines: s.setInventoryLines, setStatsLines: s.setStatsLines, setEqLines: s.setEqLines,
        setCommandPreview: () => { },
        input, setInput, isNoviceMode, status: s.status, target: v.target, setTarget: v.setTarget,
        finalizeCapture: parser.finalizeCapture, popoverState: s.popoverState, setPopoverState: s.setPopoverState,
        setIsCharacterOpen: s.setIsCharacterOpen, setIsStatsOpen: s.setIsStatsOpen, setIsEquipmentOpen: s.setIsEquipmentOpen,
        setIsInventoryOpen: s.setIsInventoryOpen, setIsPlayersOpen: s.setIsPlayersOpen, setIsSettingsOpen, setSettingsTab,
        setIsMapExpanded: s.setIsMapExpanded, setUI: s.setUI as any, viewport, triggerHaptic, btn, joystick,
        wasDraggingRef: editor.wasDraggingRef, ui: s.ui as any, actions: s.actions, setActions: s.setActions,
        setActiveDragData: s.setActiveDragData, activeDragData: s.activeDragData, practice,
        heldButton: v.heldButton, setHeldButton: v.setHeldButton, parley: s.parley, setParley: s.setParley,
        isTrackpadModifierActive: s.isTrackpadModifierActive, shop, keywordOverrides, openKeywordEdit,
        lastCommandContextRef, entities: s.entities, applyOptimisticChange: s.applyOptimisticChange,
        selectedObjectIds: s.selectedObjectIds, toggleObjectSelection: s.toggleObjectSelection,
        clearObjectSelection: s.clearObjectSelection, playClickSound, isSoundEnabled: s.isSoundEnabled,
        waiting: !!v.stats.conditions?.waiting, recordEntry: sanitizedRecordEntry, activePrompt: v.activePrompt,
        setLastMoveDir: s.setLastMoveDir
    }), [
        telnet, addMessage, initAudio, mapperRef, teleportTargets, s.isDrawerCapture, s.isSilentCapture, s.captureStage,
        s.isWaitingForStats, s.isWaitingForEq, s.isWaitingForInv, s.setInventoryLines, s.setStatsLines, s.setEqLines,
        input, setInput, isNoviceMode, s.status, v.target, v.setTarget, parser.finalizeCapture, s.popoverState,
        s.setPopoverState, s.setIsCharacterOpen, s.setIsStatsOpen, s.setIsEquipmentOpen, s.setIsInventoryOpen,
        s.setIsPlayersOpen, setIsSettingsOpen, setSettingsTab, s.setIsMapExpanded, s.setUI, viewport, triggerHaptic,
        btn, joystick, editor.wasDraggingRef, s.ui, s.actions, s.setActions, s.setActiveDragData, s.activeDragData,
        practice, v.heldButton, v.setHeldButton, s.parley, s.setParley, s.isTrackpadModifierActive, shop,
        keywordOverrides, openKeywordEdit, lastCommandContextRef, s.entities, s.applyOptimisticChange,
        s.selectedObjectIds, s.toggleObjectSelection, s.clearObjectSelection, playClickSound, s.isSoundEnabled,
        v.stats.conditions?.waiting, sanitizedRecordEntry, v.activePrompt
    ]);

    return useBaseCommandController(controllerDeps);
};
