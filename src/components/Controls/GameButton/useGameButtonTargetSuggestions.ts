/**
 * @file useGameButtonTargetSuggestions.ts
 * @description Builds command-specific target lists for tactical button holds.
 */

import { useMemo } from 'react';
import { useGame, useUI } from '../../../context/GameContext';
import { useRoomStore } from '../../../stores/useRoomStore';
import {
    getCommandTargetMenuKind,
    getDefaultCommandTarget,
    type CommandTargetMenuKind
} from '../../../utils/commandTargetUtils';
import {
    getContainerTargetSuggestions,
    appendNamedTargetSuggestions,
    getGearTargetSuggestions,
    getRoomCorpseTargetSuggestions,
    getSelfTargetSuggestion,
    getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions,
    getLearnedMageSpellSuggestions,
    getMagicKeyTargetSuggestions,
    getMountTargetSuggestions,
    getRoomTargetSuggestions,
    getRoomObjectTargetsWithExit,
    getSelfAndRoomTargetSuggestions,
    getSocialTargetSuggestions,
    getWhoTargetSuggestions,
    type CommandTargetSuggestion
} from '../../../utils/commandSuggestionUtils';
import { getTraitsForName } from '../../../utils/inlineActionModel';

const TARGET_MENU_TITLES: Record<CommandTargetMenuKind, string> = {
    containers: 'CONTAINERS',
    'self-room': 'TARGETS',
    'self-only': 'TARGETS',
    'self-inventory': 'TARGETS',
    'room-spell': 'TARGETS',
    'room-spell-with-extras': 'TARGETS',
    gear: 'ITEMS',
    'worn-weapons': 'WORN WEAPONS',
    lanterns: 'LANTERNS',
    'weather-options': 'WEATHER',
    'room-corpses': 'CORPSES',
    mounts: 'MOUNTS',
    'mage-spells': 'MAGE SPELLS',
    'magic-keys': 'MAGIC KEYS',
    bash: 'TARGETS',
    pick: 'TARGETS',
    who: 'WHO LIST',
    social: 'SOCIAL COMMANDS',
    room: 'TARGETS'
};

export interface GameButtonTargetSuggestions {
    kind: CommandTargetMenuKind | null;
    defaultTarget: string | null;
    suggestions: CommandTargetSuggestion[] | undefined;
    title: string;
}

export const useGameButtonTargetSuggestions = (
    command: string,
    characterName: string
): GameButtonTargetSuggestions => {
    const { displayInventoryLines, displayEqLines } = useUI();
    const { practice, abilities, teleportTargets } = useGame();
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const whoList = useRoomStore(state => state.whoList);
    const kind = getCommandTargetMenuKind(command);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomObjects = useMemo(() => Object.values(roomItems), [roomItems]);

    const suggestions = useMemo((): CommandTargetSuggestion[] | undefined => {
        if (!kind) return undefined;
        if (kind === 'containers') {
            return getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines);
        }
        if (kind === 'gear') {
            return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        }
        if (kind === 'worn-weapons') {
            const wornWeapons = displayEqLines.filter(line => getTraitsForName(
                `${line.text} ${line.rawText || ''} ${line.context || ''}`
            ).some(trait => trait.id === 'trait-weapon'));
            return getGearTargetSuggestions(wornWeapons, 'worn');
        }
        if (kind === 'lanterns') return getLanternTargetSuggestions(displayInventoryLines, displayEqLines);
        if (kind === 'weather-options') return [
            { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
            { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
            { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
            { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
            { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
            { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
        ];
        if (kind === 'room-corpses') return getRoomCorpseTargetSuggestions(roomObjects);
        if (kind === 'mounts') return getMountTargetSuggestions(roomOccupants);
        if (kind === 'self-room') {
            return getSelfAndRoomTargetSuggestions(roomOccupants, roomObjects, characterName);
        }
        if (kind === 'self-only') return [getSelfTargetSuggestion()];
        if (kind === 'self-inventory') return [
            getSelfTargetSuggestion(),
            ...getGearTargetSuggestions(displayInventoryLines, 'inventory')
        ];
        if (kind === 'pick') return getRoomObjectTargetsWithExit(roomObjects);
        if (kind === 'room-spell' || kind === 'room-spell-with-extras' || kind === 'bash' || kind === 'room') {
            const roomTargets = getRoomTargetSuggestions(roomOccupants, roomObjects, 'characters', characterName);
            if (kind === 'bash') return appendNamedTargetSuggestions(roomTargets, [{ label: 'Exit', value: 'exit', meta: 'exit' }]);
            if (kind === 'room-spell-with-extras') return appendNamedTargetSuggestions(roomTargets, [
                { label: 'Web', value: 'web', meta: 'object' },
                { label: 'Exit', value: 'exit', meta: 'exit' }
            ]);
            return roomTargets;
        }
        if (kind === 'mage-spells') {
            return getLearnedMageSpellSuggestions(practice.practiceData?.skills || [], abilities);
        }
        if (kind === 'magic-keys') return getMagicKeyTargetSuggestions(teleportTargets);
        if (kind === 'who') return getWhoTargetSuggestions(whoList, characterName);
        if (kind === 'social') return getSocialTargetSuggestions();
        return undefined;
    }, [
        kind, roomObjects, displayInventoryLines, displayEqLines, roomOccupants,
        characterName, practice.practiceData?.skills, abilities, teleportTargets, whoList
    ]);

    return {
        kind,
        defaultTarget: getDefaultCommandTarget(command),
        suggestions,
        title: kind ? TARGET_MENU_TITLES[kind] : 'TARGETS'
    };
};
