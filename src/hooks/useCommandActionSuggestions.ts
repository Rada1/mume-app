/** @file useCommandActionSuggestions.ts — Reverse command lookup over the target panel's entity model. */
import { useCallback, useMemo } from 'react';
import type { DrawerLine } from '../types';
import { useVitals } from '../context/GameContext';
import { useRoomStore } from '../stores/useRoomStore';
import { useButtonStore } from '../stores/useButtonStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getCommandActionTargetEntries, type CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { createLearnedInlineAbilityButtons } from '../utils/inlineAbilityActions';
import { resolveReverseCommandTargets } from '../utils/reverseCommandTargets';
import { DOOR_BUTTONS, EXIT_BUTTONS } from '../constants/buttons/doors';
import { SOCIAL_BUTTONS } from '../constants/buttons/socials';
import { NPC_BUTTONS } from '../constants/buttons/inline/npcs';

// --- Candidate and Action Index ---
export const useCommandActionSuggestions = (
    abilities: Record<string, number>, inventory: DrawerLine[], worn: DrawerLine[], characterName: string
) => {
    const room = useRoomStore();
    const buttons = useButtonStore(state => state.rawButtons);
    const inlineCategories = useSettingsStore(state => state.inlineCategories);
    const { characterInfo, groupMembers } = useVitals();
    const entries = useMemo<CommandActionTargetEntry[]>(() => [
        { id: 'command-panel-self', label: characterName || 'You', keyword: 'self', context: 'self',
            category: 'cat-ally', group: 'players', scope: 'self' },
        ...getCommandActionTargetEntries([], Object.values(room.chars)
        .filter(occupant => occupant.name?.toLowerCase() !== characterName.toLowerCase()), room.items, worn, inventory,
        groupMembers || [], room.rawExits)
    ], [characterName, groupMembers, inventory, room.chars, room.items, room.rawExits, worn]);
    const menuButtons = useMemo(() => {
        const byId = new Map(buttons.map(button => [button.id, button]));
        [...DOOR_BUTTONS, ...EXIT_BUTTONS, ...SOCIAL_BUTTONS, ...NPC_BUTTONS, ...createLearnedInlineAbilityButtons(abilities, null)]
            .forEach(button => { if (!byId.has(button.id)) byId.set(button.id, button); });
        return [...byId.values()];
    }, [abilities, buttons]);
    return useCallback((command: string) => resolveReverseCommandTargets(command, entries, {
        buttons: menuButtons, inlineCategories, roomNpcs: Object.values(room.chars),
        entities: {}, characterInfo, currentTerrain: room.terrain
    }), [characterInfo, entries, inlineCategories, menuButtons, room.chars, room.terrain]);
};
