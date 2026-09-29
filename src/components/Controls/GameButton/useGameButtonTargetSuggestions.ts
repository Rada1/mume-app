/**
 * @file useGameButtonTargetSuggestions.ts
 * @description Builds command-specific target lists for tactical button holds.
 */

import { useMemo } from 'react';
import { useGame, useUI } from '../../../context/GameContext';
import { useRoomStore } from '../../../stores/useRoomStore';
import {
    BLANK_TARGET_VALUE,
    getCommandTargetMenuKind,
    getDefaultCommandTarget,
    type CommandTargetMenuKind
} from '../../../utils/commandTargetUtils';
import {
    getContainerTargetSuggestions,
    appendNamedTargetSuggestions,
    getAssistTargetSuggestions,
    getDrinkTargetSuggestions,
    getGearTargetSuggestions,
    getRoomCorpseTargetSuggestions,
    getSelfTargetSuggestion,
    getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions,
    getLearnedMageSpellSuggestions,
    getMagicKeyTargetSuggestions,
    getMountTargetSuggestions,
    getRoomTargetSuggestions,
    getRescueTargetSuggestions,
    getRoomObjectTargetsWithExit,
    getSelfAndRoomAlliesTargetSuggestions,
    getSelfAndRoomTargetSuggestions,
    getSocialTargetSuggestions,
    getWhoTargetSuggestions,
    type CommandTargetSuggestion
} from '../../../utils/commandSuggestionUtils';
import { getTraitsForName } from '../../../utils/inlineActionModel';
import type { DrawerLine } from '../../../types';
import type { DeckTargetKind } from '../../HUD/useDeckTargeting';

const TARGET_MENU_TITLES: Record<CommandTargetMenuKind, string> = {
    containers: 'CONTAINERS',
    'movement-wheel': 'MOVEMENT',
    'self-room': 'TARGETS',
    'self-allies': 'TARGETS',
    'self-only': 'TARGETS',
    'self-inventory': 'TARGETS',
    'room-spell': 'TARGETS',
    'room-spell-with-extras': 'TARGETS',
    'door-direction': 'EXIT / DIRECTION',
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
    stagedTargetKind: 'social' | 'inventory-recipient' | 'inventory-container' | 'room-object-container' | null;
    firstArgumentSuggestions: CommandTargetSuggestion[];
    secondArgumentSuggestions: CommandTargetSuggestion[];
}

export const useGameButtonTargetSuggestions = (
    command: string,
    characterName: string,
    targetKindOverride?: DeckTargetKind,
    containerContents: Record<string, DrawerLine[]> = {},
    selectedSecondArgument: string | null = null,
    loadingContainerId: string | null = null
): GameButtonTargetSuggestions => {
    const { displayInventoryLines, displayEqLines } = useUI();
    const { practice, abilities, teleportTargets } = useGame();
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const whoList = useRoomStore(state => state.whoList);
    const kind = getCommandTargetMenuKind(command);
    const overrideKind: CommandTargetMenuKind | null = targetKindOverride
        ? targetKindOverride === 'mounts' ? 'mounts'
        : targetKindOverride === 'who' ? 'who'
        : targetKindOverride === 'social' ? 'social'
        : targetKindOverride === 'worn-weapons' || targetKindOverride === 'worn-sheaths' ? 'worn-weapons'
        : targetKindOverride === 'room-objects' || targetKindOverride === 'room-object-container' ? 'room'
        : 'gear'
        : null;
    const resolvedKind = overrideKind || kind;
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomObjects = useMemo(() => Object.values(roomItems), [roomItems]);
    const stagedTargetKind = targetKindOverride === 'social' || (!targetKindOverride && resolvedKind === 'social')
        ? 'social'
        : targetKindOverride === 'inventory-recipient' || targetKindOverride === 'inventory-container'
            || targetKindOverride === 'room-object-container' ? targetKindOverride : null;

    const suggestions = useMemo((): CommandTargetSuggestion[] | undefined => {
        if (targetKindOverride === 'room-objects') return getRoomTargetSuggestions([], roomObjects, 'objects');
        if (targetKindOverride === 'inventory') {
            if (/^drink\b/i.test(command.trim())) return getDrinkTargetSuggestions(displayInventoryLines, displayEqLines);
            return getGearTargetSuggestions(displayInventoryLines, 'inventory');
        }
        if (targetKindOverride === 'inventory-and-worn') return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        if (targetKindOverride === 'worn') return getGearTargetSuggestions(displayEqLines, 'worn');
        if (targetKindOverride === 'worn-sheaths' || targetKindOverride === 'worn-weapons') {
            const traitId = targetKindOverride === 'worn-sheaths' ? 'trait-sheath' : 'trait-weapon';
            const matchingWorn = displayEqLines.filter(line => getTraitsForName(
                `${line.text} ${line.rawText || ''} ${line.context || ''}`
            ).some(trait => trait.id === traitId));
            return getGearTargetSuggestions(matchingWorn, 'worn');
        }
        if (targetKindOverride === 'mounts') return getMountTargetSuggestions(roomOccupants, /^unsaddle\b/i.test(command.trim()));
        if (targetKindOverride === 'who') return getWhoTargetSuggestions(whoList, characterName);
        if (targetKindOverride === 'social') return getSocialTargetSuggestions();
        if (targetKindOverride === 'inventory-recipient' || targetKindOverride === 'inventory-container') {
            return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        }
        if (targetKindOverride === 'room-object-container') return getRoomTargetSuggestions([], roomObjects, 'objects');
        if (!resolvedKind) return undefined;
        if (resolvedKind === 'movement-wheel') return [];
        if (resolvedKind === 'containers') {
            return getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines);
        }
        if (resolvedKind === 'gear') {
            return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        }
        if (resolvedKind === 'worn-weapons') {
            const wornWeapons = displayEqLines.filter(line => getTraitsForName(
                `${line.text} ${line.rawText || ''} ${line.context || ''}`
            ).some(trait => trait.id === 'trait-weapon'));
            return getGearTargetSuggestions(wornWeapons, 'worn');
        }
        if (resolvedKind === 'lanterns') return getLanternTargetSuggestions(displayInventoryLines, displayEqLines);
        if (resolvedKind === 'weather-options') return [
            { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
            { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
            { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
            { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
            { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
            { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
        ];
        if (resolvedKind === 'room-corpses') return getRoomCorpseTargetSuggestions(roomObjects);
        if (resolvedKind === 'mounts') return getMountTargetSuggestions(roomOccupants, /^unsaddle\b/i.test(command.trim()));
        if (resolvedKind === 'self-room') {
            return getSelfAndRoomTargetSuggestions(roomOccupants, roomObjects, characterName);
        }
        if (resolvedKind === 'self-allies') {
            return getSelfAndRoomAlliesTargetSuggestions(roomOccupants, characterName);
        }
        if (resolvedKind === 'self-only') return [getSelfTargetSuggestion()];
        if (resolvedKind === 'self-inventory') return [
            getSelfTargetSuggestion(),
            ...getGearTargetSuggestions(displayInventoryLines, 'inventory')
        ];
        if (resolvedKind === 'pick') return getRoomObjectTargetsWithExit(roomObjects);
        if (resolvedKind === 'door-direction') return [
            { key: 'door-exit', label: 'Exit', value: 'exit', meta: 'exit' }
        ];
        if (resolvedKind === 'room-spell' || resolvedKind === 'room-spell-with-extras' || resolvedKind === 'bash' || resolvedKind === 'room') {
            const roomTargets = getRoomTargetSuggestions(roomOccupants, roomObjects, 'characters', characterName);
            const commandVerb = command.trim().split(/\s+/, 1)[0].toLowerCase();
            if (commandVerb === 'assist') return getAssistTargetSuggestions(roomOccupants, characterName);
            if (commandVerb === 'rescue') return getRescueTargetSuggestions(roomOccupants, characterName);
            if (resolvedKind === 'bash') return appendNamedTargetSuggestions(roomTargets, [{ label: 'Exit', value: 'exit', meta: 'exit' }]);
            if (resolvedKind === 'room-spell-with-extras') return appendNamedTargetSuggestions(roomTargets, [
                { label: 'Web', value: 'web', meta: 'object' },
                { label: 'Exit', value: 'exit', meta: 'exit' }
            ]);
            if (/^look(?:\s|$)/i.test(command.trim())) return [
                { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' },
                ...roomTargets
            ];
            return roomTargets;
        }
        if (resolvedKind === 'mage-spells') {
            return getLearnedMageSpellSuggestions(practice.practiceData?.skills || [], abilities);
        }
        if (resolvedKind === 'magic-keys') return getMagicKeyTargetSuggestions(teleportTargets);
        if (resolvedKind === 'who') return getWhoTargetSuggestions(whoList, characterName);
        if (resolvedKind === 'social') return getSocialTargetSuggestions();
        return undefined;
    }, [
        kind, resolvedKind, targetKindOverride, roomObjects, displayInventoryLines, displayEqLines, roomOccupants,
        characterName, practice.practiceData?.skills, abilities, teleportTargets, whoList
    ]);

    const stagedArguments = useMemo(() => {
        if (stagedTargetKind === 'social') return {
            first: getSocialTargetSuggestions(),
            second: [
                { key: 'social-no-target', label: 'Blank Target', value: '__blank_target__', meta: 'source' },
                ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName)
            ]
        };
        if (stagedTargetKind === 'inventory-recipient') return {
            first: [
                { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                ...getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines)
            ],
            second: getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName)
        };
        if (stagedTargetKind === 'inventory-container') return {
            first: [
                { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                ...getGearTargetSuggestions(displayInventoryLines, 'inventory')
            ],
            second: [
                { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                ...getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines).filter(item => item.meta !== 'exit')
            ]
        };
        if (stagedTargetKind === 'room-object-container') {
            const source = getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines)
                .find(item => item.value === selectedSecondArgument || item.key === selectedSecondArgument);
            const first = !selectedSecondArgument || selectedSecondArgument === '__room__'
                ? [
                    { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                    ...getRoomTargetSuggestions([], roomObjects, 'objects')
                ]
                : source?.containerId && loadingContainerId !== source.containerId
                    ? [
                        { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                        ...getGearTargetSuggestions(containerContents[source.containerId] || [], 'inventory')
                            .map(suggestion => ({ ...suggestion, meta: 'container' }))
                    ]
                    : [];
            return {
            first,
            second: [
                { key: 'get-from-room', label: 'Room', value: '__room__', meta: 'room' },
                { key: 'all-argument', label: 'All', value: 'all', meta: 'all' },
                ...getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines).filter(item => item.meta !== 'exit')
            ]
            };
        }
        return { first: [], second: [] };
    }, [stagedTargetKind, roomOccupants, roomObjects, displayInventoryLines, displayEqLines, characterName,
        containerContents, selectedSecondArgument, loadingContainerId]);

    return {
        kind: resolvedKind,
        defaultTarget: getDefaultCommandTarget(command),
        suggestions,
        title: stagedTargetKind ? 'SELECT ARGUMENTS' : resolvedKind ? TARGET_MENU_TITLES[resolvedKind] : 'TARGETS',
        stagedTargetKind,
        firstArgumentSuggestions: stagedArguments.first,
        secondArgumentSuggestions: stagedArguments.second
    };
};
