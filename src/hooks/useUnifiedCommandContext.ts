/**
 * @file useUnifiedCommandContext.ts
 * @description Manages target context, active scope, and label styling for UnifiedCommandPanel.
 */

import React from 'react';
import type { PopoverState } from '../types';
import { useGame, useUI, useVitals } from '../context/GameContext';
import { useCommandActionTargets } from './useCommandActionTargets';
import { useCommandTargetSelection } from './useCommandTargetSelection';
import type { UnifiedCommandActionScope } from './useUnifiedCommandActions';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { stripAnsiCodes } from '../utils/ansi';

const EMPTY_TARGET_INPUT: never[] = [];

// --- Logic Section ---

interface UseUnifiedCommandContextOptions {
    initialScope?: UnifiedCommandActionScope;
    roomLabel: string;
    roomContextColor?: string;
    contextColor: (category: string, fallback?: string) => string | undefined;
    setPanelOpen: (open: boolean) => void;
}

export const useUnifiedCommandContext = ({
    initialScope = 'room',
    roomLabel,
    roomContextColor,
    contextColor,
    setPanelOpen
}: UseUnifiedCommandContextOptions) => {
    const game = useGame();
    const ui = useUI();
    const vitals = useVitals();

    const [scope, setScope] = React.useState<UnifiedCommandActionScope>(initialScope);
    const [previewEntry, setPreviewEntry] = React.useState<CommandActionTargetEntry | null>(null);
    const [previewContext, setPreviewContext] = React.useState<'room' | 'self' | null>(null);
    React.useEffect(() => setScope(initialScope), [initialScope]);

    const lastSelectedRef = React.useRef<PopoverState | null>(null);
    const isCommandContext = ui.popoverState?.entityId === 'command-panel-room'
        || ui.popoverState?.entityId === 'command-panel-self';
    const incomingSelection = ui.popoverState?.entityId && !isCommandContext && !ui.popoverState.isRoomDescription && (!ui.popoverState.type || ui.popoverState.type === 'menu')
        ? ui.popoverState
        : null;
    if (incomingSelection) lastSelectedRef.current = incomingSelection;
    const selectedPopover = incomingSelection || lastSelectedRef.current;

    const previewEntity = React.useCallback((entry: CommandActionTargetEntry | null) => {
        setPreviewEntry(entry);
        setPreviewContext(null);
    }, []);
    const previewTargetContext = React.useCallback((context: 'room' | 'self' | null) => {
        setPreviewContext(context);
        setPreviewEntry(null);
    }, []);

    React.useEffect(() => {
        if (!previewEntry && !previewContext) return;
        let clearTimer: number | null = null;
        const handlePointerMove = (event: PointerEvent) => {
            const target = event.target;
            const isInsideCascade = target instanceof Element
                && Boolean(target.closest('.unified-command-panel, .command-action-you-popover, .command-mount-popover'));
            if (isInsideCascade) {
                if (clearTimer !== null) window.clearTimeout(clearTimer);
                clearTimer = null;
                return;
            }
            if (clearTimer !== null) return;
            clearTimer = window.setTimeout(() => {
                clearTimer = null;
                setPreviewEntry(null);
                setPreviewContext(null);
            }, 240);
        };
        document.addEventListener('pointermove', handlePointerMove);
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            if (clearTimer !== null) window.clearTimeout(clearTimer);
        };
    }, [previewContext, previewEntry]);

    const previewState: PopoverState | null = React.useMemo(() => {
        if (previewEntry) {
            return {
                x: 0, y: 0, type: 'menu', setId: previewEntry.category, category: previewEntry.category,
                context: previewEntry.context, displayName: previewEntry.label, keyword: previewEntry.keyword,
                accentColor: contextColor(previewEntry.category), entityId: previewEntry.id,
                ...(previewEntry.category === 'cat-exit' ? { hasDoor: previewEntry.hasDoor === true } : {}),
                parentNoun: previewEntry.parentNoun
            };
        }
        if (!previewContext) return null;
        const isRoom = previewContext === 'room';
        const context = isRoom ? stripAnsiCodes(game.roomName) : game.characterName || '';
        const category = isRoom ? 'cat-room' : 'cat-ally';
        return {
            x: 0, y: 0, type: 'menu', setId: category, category, isRoomDescription: isRoom,
            context, displayName: isRoom ? roomLabel : context || 'You',
            accentColor: isRoom ? roomContextColor : '#ffd700',
            entityId: isRoom ? 'command-panel-room' : 'command-panel-self'
        };
    }, [contextColor, game.characterName, game.roomName, previewContext, previewEntry, roomContextColor, roomLabel]);

    const incomingScope: UnifiedCommandActionScope | null = ui.popoverState?.entityId === 'command-panel-room'
        ? 'room'
        : ui.popoverState?.entityId === 'command-panel-self'
            ? 'self'
            : incomingSelection ? 'selected' : null;

    React.useEffect(() => {
        if (incomingScope) setScope(incomingScope);
    }, [incomingScope, ui.popoverState?.entityId]);

    const activeScope = previewEntry ? 'selected' : previewContext || incomingScope || scope;

    const { entries, selectEntity } = useCommandActionTargets({
        players: game.roomPlayers || EMPTY_TARGET_INPUT,
        npcs: game.roomNpcs || EMPTY_TARGET_INPUT,
        roomObjects: game.roomItems || EMPTY_TARGET_INPUT,
        groupMembers: vitals.groupMembers || EMPTY_TARGET_INPUT,
        wornLines: ui.displayEqLines || EMPTY_TARGET_INPUT,
        inventoryLines: ui.displayInventoryLines || EMPTY_TARGET_INPUT,
        selectedObjectIds: game.selectedObjectIds,
        toggleObjectSelection: game.toggleObjectSelection,
        setTarget: vitals.setTarget,
        setPopoverState: ui.setPopoverState,
        setScope,
        setPanelOpen
    });

    const targetSelection = useCommandTargetSelection(entries);
    const activePopover = previewState || selectedPopover;
    const selectedEntry = entries.find(entry => entry.id === activePopover?.entityId);

    const currentContextId: 'room' | 'self' = activeScope === 'self'
        ? 'self'
        : activeScope === 'selected' && (selectedEntry?.scope === 'self'
            || selectedPopover?.category === 'cat-worn-object'
            || selectedPopover?.category === 'cat-inventory-object')
            ? 'self'
            : 'room';

    const selectedEntryLabel = activePopover?.entityId === 'command-panel-self'
        ? 'Self'
        : selectedEntry?.gearRow
        ? [selectedEntry.gearRow.article, selectedEntry.gearRow.name].filter(Boolean).join(' ')
        : activePopover?.displayName || selectedEntry?.label || activePopover?.context || 'Selected target';

    const currentLabel = activeScope === 'selected'
        ? stripAnsiCodes(selectedEntryLabel)
        : currentContextId === 'room' ? roomLabel : 'Self';

    const currentLabelColor = activeScope === 'selected'
        ? activePopover?.accentColor || (selectedEntry ? contextColor(selectedEntry.category) : undefined)
        : currentContextId === 'room' ? roomContextColor : '#ffd700';

    const selectContext = React.useCallback((context: 'room' | 'self') => {
        const isRoom = context === 'room';
        const name = isRoom ? stripAnsiCodes(game.roomName) : game.characterName || '';
        const category = isRoom ? 'cat-room' : 'cat-ally';
        const accentColor = isRoom ? roomContextColor : '#ffd700';
        game.clearObjectSelection();
        if (isRoom) vitals.setTarget(null);
        ui.setPopoverState({
            x: 0,
            y: 0,
            type: 'menu',
            setId: category,
            category,
            isRoomDescription: isRoom,
            context: name,
            displayName: isRoom ? name || 'Room' : name || 'You',
            accentColor,
            entityId: isRoom ? 'command-panel-room' : 'command-panel-self'
        });
        setScope(context);
        setPanelOpen(true);
    }, [game, roomContextColor, setPanelOpen, ui, vitals]);

    const activeState: PopoverState = React.useMemo(() => {
        if (activeScope === 'selected' && activePopover) return activePopover;
        const isRoom = activeScope === 'room';
        const context = isRoom ? stripAnsiCodes(game.roomName) : game.characterName || '';
        if (isRoom && ui.popoverState?.isRoomDescription && ui.popoverState.context === context) return ui.popoverState;
        const category = isRoom ? 'cat-room' : 'cat-ally';
        return {
            x: 0,
            y: 0,
            type: 'menu',
            setId: category,
            category,
            isRoomDescription: isRoom,
            context,
            displayName: isRoom ? roomLabel : context || 'You',
            entityId: isRoom ? 'command-panel-room' : 'command-panel-self'
        };
    }, [activePopover, activeScope, game.characterName, game.roomName, roomLabel, ui.popoverState]);

    const currentEntityId = activeScope === 'selected' ? activePopover?.entityId : activeState.entityId;

    return {
        scope,
        setScope,
        activeScope,
        entries,
        selectEntity,
        previewEntity,
        previewTargetContext,
        targetSelection,
        currentContextId,
        currentLabel,
        currentLabelColor,
        selectContext,
        activeState,
        currentEntityId
    };
};
