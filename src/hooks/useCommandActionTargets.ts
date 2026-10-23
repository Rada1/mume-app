/**
 * @file useCommandActionTargets.ts
 * @description Builds command target choices and selects the active target context.
 */

import { useCallback, useMemo } from 'react';
import type { DrawerLine, GmcpOccupant, GroupMember, PopoverState } from '../types';
import type { SelectedTargetInfo } from '../stores/useUIStore';
import { getCommandActionTargetEntries, getGlobalWeatherActionTargets, type CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { canSetTargetChipFromCategory } from '../utils/inlineCategoryAxes';
import { useActiveRoom } from '../stores/useActiveGameState';

// --- Type Section ---
type RoomSource = string | GmcpOccupant;
type ActionScope = 'selected' | 'room' | 'self';

interface UseCommandActionTargetsOptions {
    players: RoomSource[];
    npcs: RoomSource[];
    roomObjects: RoomSource[];
    groupMembers: GroupMember[];
    wornLines: DrawerLine[];
    inventoryLines: DrawerLine[];
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: SelectedTargetInfo) => void;
    setTarget: (target: string | null) => void;
    setPopoverState: (state: PopoverState | null) => void;
    setScope: (scope: ActionScope) => void;
    setPanelOpen: (isOpen: boolean) => void;
}

// --- Logic Section ---
export const useCommandActionTargets = ({
    players,
    npcs,
    roomObjects,
    groupMembers,
    wornLines,
    inventoryLines,
    selectedObjectIds,
    toggleObjectSelection,
    setTarget,
    setPopoverState,
    setScope,
    setPanelOpen
}: UseCommandActionTargetsOptions) => {
    const settings = useSettingsStore(useShallow(state => ({
        inlineCategories: state.inlineCategories, playerColor: state.playerColor,
        npcColor: state.npcColor, enemyColor: state.enemyColor, neutralColor: state.neutralColor,
        objectColor: state.objectColor, roomColor: state.roomColor, theme: state.theme
    })));
    const { rawExits } = useActiveRoom();
    const entries = useMemo(
        () => [...getCommandActionTargetEntries(players, npcs, roomObjects, wornLines, inventoryLines, groupMembers, rawExits), ...getGlobalWeatherActionTargets()],
        [groupMembers, inventoryLines, npcs, players, rawExits, roomObjects, wornLines]
    );
    const selectEntity = useCallback((entry: CommandActionTargetEntry) => {
        const accentColor = getInlineGlowColor(entry.category, settings.inlineCategories, {
            player: settings.playerColor, ally: settings.playerColor, all: settings.playerColor,
            npc: settings.npcColor, enemy: settings.enemyColor, neutral: settings.neutralColor,
            object: settings.objectColor, room: settings.roomColor
        }, settings.theme) || undefined;
        if (entry.category !== 'cat-weather' && !selectedObjectIds.has(entry.id)) {
            toggleObjectSelection({
                id: entry.id,
                setId: entry.category,
                category: entry.category,
                context: entry.context,
                displayName: entry.label,
                keyword: entry.keyword,
                accentColor
            });
        }
        if (canSetTargetChipFromCategory(entry.category)) setTarget(entry.context);
        setPopoverState({
            x: 0,
            y: 0,
            type: 'menu',
            setId: entry.category,
            category: entry.category,
            context: entry.context,
            displayName: entry.label,
            keyword: entry.keyword,
            accentColor,
            entityId: entry.id,
            ...(entry.category === 'cat-exit' ? { hasDoor: entry.hasDoor === true } : {}),
            parentNoun: entry.parentNoun
        });
        setScope('selected');
        setPanelOpen(true);
    }, [selectedObjectIds, setPanelOpen, setPopoverState, setScope, setTarget, settings, toggleObjectSelection]);

    return { entries, selectEntity };
};
