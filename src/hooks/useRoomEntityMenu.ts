/**
 * @file useRoomEntityMenu.ts
 * @description Builds the room entity picker and applies a selected room target to the open menu.
 */

import React from 'react';
import type { DrawerLine, GmcpOccupant, PopoverState } from '../types';
import type { SelectedTargetInfo } from '../stores/useUIStore';
import { getInlineTargetMenuEntries } from '../objects/roomEntityMenuModel';
import { canSetTargetChipFromCategory } from '../utils/inlineCategoryAxes';

// --- Logic Section ---

interface UseRoomEntityMenuOptions {
    players: Array<string | GmcpOccupant>;
    npcs: Array<string | GmcpOccupant>;
    objects: Array<string | GmcpOccupant>;
    characterName: string;
    inventoryLines: DrawerLine[];
    equipmentLines: DrawerLine[];
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: SelectedTargetInfo) => void;
    setTarget: (target: string | null) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    currentTarget?: string | null;
    triggerHaptic?: (ms: number) => void;
}

export const useRoomEntityMenu = ({
    players,
    npcs,
    objects,
    characterName,
    inventoryLines,
    equipmentLines,
    selectedObjectIds,
    toggleObjectSelection,
    setTarget,
    setPopoverState,
    currentTarget,
    triggerHaptic
}: UseRoomEntityMenuOptions) => {
    const entries = React.useMemo(
        () => getInlineTargetMenuEntries(players, npcs, objects, characterName, inventoryLines, equipmentLines, currentTarget),
        [npcs, objects, players, characterName, inventoryLines, equipmentLines, currentTarget]
    );

    const selectEntity = React.useCallback((entry: ReturnType<typeof getInlineTargetMenuEntries>[number]) => {
        if (!entry.isOutOfRoom && !entry.isContext && !selectedObjectIds.has(entry.id)) {
            toggleObjectSelection({
                id: entry.id,
                setId: entry.category,
                category: entry.category,
                context: entry.context,
                displayName: entry.label,
                keyword: entry.keyword
            });
        }
        if (canSetTargetChipFromCategory(entry.category)) setTarget(entry.context);
        setPopoverState(current => current ? ({
            ...current,
            type: 'menu',
            setId: entry.category,
            category: entry.category,
            context: entry.context,
            displayName: entry.label,
            keyword: entry.keyword,
            entityId: entry.id,
            parentNoun: undefined,
            accentColor: undefined,
            isChoosingCategory: false,
            hasInspectionCard: false,
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
            isRoomDescription: false
        }) : null);
        triggerHaptic?.(20);
    }, [selectedObjectIds, setPopoverState, setTarget, toggleObjectSelection, triggerHaptic]);

    return { entries, selectEntity };
};
