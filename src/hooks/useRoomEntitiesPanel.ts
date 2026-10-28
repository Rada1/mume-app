/** @file useRoomEntitiesPanel.ts — Room character projection and current-target selection. */
import { useMemo } from 'react';
import { useGame, useVitals } from '../context/GameContext';
import { useActiveCombat } from '../stores/useActiveGameState';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useUIStore } from '../stores/useUIStore';
import type { GroupMember } from '../types';
import { getRoomEntityMenuEntries, type RoomEntityMenuEntry } from '../objects/roomEntityMenuModel';
import { getGroupMemberName } from '../utils/groupMemberStatus';
import { getInlineGlowColor } from '../utils/inlineActionModel';
import { canSetTargetChipFromCategory } from '../utils/inlineCategoryAxes';
import { isGroupMemberOccupant } from '../utils/groupTargetSuggestions';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';

// --- Group Target Resolution ---
export const groupMemberCommandTarget = (member: GroupMember, entries: RoomEntityMenuEntry[]): string => {
    const entry = entries.find(candidate => isGroupMemberOccupant({
        id: candidate.id.replace(/^roomchars:/, ''), name: candidate.context,
        short: candidate.label, keyword: candidate.keyword
    }, [member]));
    return entry?.context || getOccupantCommandKeyword({ name: getGroupMemberName(member), type: member.type });
};
// --- Projection Section ---
export function useRoomEntitiesPanel() {
    const { roomPlayers, roomNpcs, triggerHaptic } = useGame();
    const { target, setTarget } = useVitals();
    const { groupMembers } = useActiveCombat();
    const settings = useSettingsStore();
    const selected = useUIStore(state => state.selectedTarget);
    const toggleSelection = useUIStore(state => state.toggleObjectSelection);
    const members = groupMembers || [];
    const entries = useMemo(() => getRoomEntityMenuEntries(roomPlayers || [], roomNpcs || [], []), [roomPlayers, roomNpcs]);
    const groupNames = new Set(members.map(member => getGroupMemberName(member).toLowerCase()));
    const otherEntities = entries.filter(entry => !groupNames.has(entry.label.toLowerCase()) && !groupNames.has(entry.context.toLowerCase()));
    const colorFor = (category: string) => getInlineGlowColor(category, settings.inlineCategories, {
        player:settings.playerColor, ally:settings.playerColor, npc:settings.npcColor,
        enemy:settings.enemyColor, neutral:settings.neutralColor
    }, settings.theme) || undefined;
    const select = (entry: RoomEntityMenuEntry) => {
        if (selected?.id !== entry.id) toggleSelection({ id:entry.id, category:entry.category, setId:entry.category,
            context:entry.context, keyword:entry.keyword, displayName:entry.label, accentColor:colorFor(entry.category) });
        if (canSetTargetChipFromCategory(entry.category)) setTarget(entry.context);
        triggerHaptic?.(15);
    };
    const selectMember = (member: GroupMember) => {
        const name = getGroupMemberName(member);
        select(entries.find(entry => entry.label.toLowerCase() === name.toLowerCase() || entry.context.toLowerCase() === name.toLowerCase())
            || { id:`group:${member.id || name}`, label:name, keyword:name, context:name, category:'cat-ally', group:'characters' });
    };
    const isSelected = (entry: RoomEntityMenuEntry) => selected?.id === entry.id || target?.toLowerCase() === entry.context.toLowerCase();
    const isTargeted = (entry: RoomEntityMenuEntry) => canSetTargetChipFromCategory(entry.category)
        && target?.toLowerCase() === entry.context.toLowerCase();
    return { members, entries, otherEntities, colorFor, select, selectMember, isSelected, isTargeted };
}
