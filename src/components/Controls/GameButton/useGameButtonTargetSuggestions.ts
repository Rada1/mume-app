/**
 * @file useGameButtonTargetSuggestions.ts
 * @description Builds command-specific target lists for tactical button holds.
 */

import { useMemo } from 'react';
import { useGame, useUI } from '../../../context/GameContext';
import { useVitals } from '../../../context/GameContext';
import { useRoomStore } from '../../../stores/useRoomStore';
import { useRoomDrinkWater } from '../../../hooks/useRoomDrinkWater';
import { useCurrentRoomHasDoor } from '../../../hooks/useCurrentRoomHasDoor';
import { useUIStore } from '../../../stores/useUIStore';
import {
    BLANK_TARGET_VALUE,
    getCommandTargetMenuKind,
    getDefaultCommandTarget,
    isOffensiveTargetCommand,
    usesChipPriorityOffensiveTarget,
    LOOK_IN_TARGET_VALUE,
    type CommandTargetMenuKind
} from '../../../utils/commandTargetUtils';
import {
    getContainerTargetSuggestions,
    appendNamedTargetSuggestions,
    prioritizeOffensiveRoomEntitySuggestions,
    getAssistTargetSuggestions,
    getGiveRecipientSuggestions,
    getGroupTargetSuggestions,
    getDrinkTargetSuggestions,
    getFluidContainerTargetSuggestions,
    getFoodTargetSuggestions,
    getFillTargetSuggestions,
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
    getRoomContainerTargetSuggestions,
    getSelfAndRoomAlliesTargetSuggestions,
    getSelfAndRoomTargetSuggestions,
    getSocialTargetSuggestions,
    getWhoTargetSuggestions,
    type CommandTargetSuggestion
} from '../../../utils/commandSuggestionUtils';
import { hasObjectTrait } from '../../../objects/objectTargetModel';
import type { DrawerLine } from '../../../types';
import type { DeckTargetKind } from '../../HUD/useDeckTargeting';
import { getGroupSelectionSuggestions, getNonGroupmateRoomTargetSuggestions } from '../../../utils/groupTargetSuggestions';

const TARGET_MENU_TITLES: Record<CommandTargetMenuKind, string> = {
    containers: 'CONTAINERS',
    'movement-wheel': 'MOVEMENT',
    'pace-options': 'PACE',
    'self-room': 'TARGETS',
    'self-allies': 'TARGETS',
    'room-allies-or-blank': 'TARGETS',
    'self-only': 'TARGETS',
    'self-inventory': 'TARGETS',
    'room-spell': 'TARGETS',
    'room-spell-with-extras': 'TARGETS',
    'door-direction': 'EXIT / DIRECTION',
    'look-containers': 'CONTAINERS',
    gear: 'ITEMS',
    'inventory-gear': 'INVENTORY',
    'worn-gear': 'WORN ITEMS',
    food: 'FOOD',
    drink: 'DRINK',
    pour: 'POUR INTO',
    'worn-weapons': 'WORN WEAPONS',
    lanterns: 'LANTERNS',
    'weather-options': 'WEATHER',
    'weather-scope': 'WEATHER',
    'room-corpses': 'CORPSES',
    mounts: 'MOUNTS',
    'mage-spells': 'MAGE SPELLS',
    'magic-keys': 'MAGIC KEYS',
    bash: 'TARGETS',
    pick: 'CONTAINERS',
    who: 'WHO LIST',
    'who-or-blank': 'WHO LIST',
    'blank-only': 'TARGETS',
    social: 'SOCIAL COMMANDS',
    shop: 'SHOP',
    room: 'TARGETS'
};

export interface GameButtonTargetSuggestions {
    kind: CommandTargetMenuKind | null;
    defaultTarget: string | null;
    suggestions: CommandTargetSuggestion[] | undefined;
    title: string;
    stagedTargetKind: 'social' | 'inventory-recipient' | 'inventory-container' | 'room-object-container' | 'look-container' | 'examine-targets' | null;
    firstArgumentSuggestions: CommandTargetSuggestion[];
    secondArgumentSuggestions: CommandTargetSuggestion[];
    showsStatusPanel: boolean;
    showsPracticePanel: boolean;
    showsShopPanel: boolean;
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
    const { groupMembers } = useVitals();
    const roomChars = useRoomStore(state => state.chars);
    const roomItems = useRoomStore(state => state.items);
    const roomWaterAvailable = useRoomDrinkWater();
    const hasRoomDoor = useCurrentRoomHasDoor();
    const whoList = useRoomStore(state => state.whoList);
    const shopItems = useUIStore(state => state.shopItems);
    const kind = getCommandTargetMenuKind(command);
    const isButcherCommand = /^butcher(?:\s|$)/i.test(command.trim());
    const isEatCommand = /^eat\b/i.test(command.trim());
    const overrideKind: CommandTargetMenuKind | null = isButcherCommand ? 'room-corpses' : isEatCommand ? 'food' : targetKindOverride
        ? targetKindOverride === 'mounts' ? 'mounts'
        : targetKindOverride === 'who' ? 'who'
        : targetKindOverride === 'social' ? 'social'
        : targetKindOverride === 'group' ? null
        : targetKindOverride === 'status-panel' ? null
        : targetKindOverride === 'shop' ? 'shop'
        : targetKindOverride === 'lanterns' ? 'lanterns'
        : targetKindOverride === 'pour' ? 'pour'
        : targetKindOverride === 'worn-weapons' || targetKindOverride === 'worn-sheaths' ? 'worn-weapons'
        : targetKindOverride === 'room-objects' || targetKindOverride === 'room-object-container' ? 'room'
        : 'gear'
        : null;
    const resolvedKind = overrideKind || kind;
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomObjects = useMemo(() => Object.values(roomItems), [roomItems]);
    const stagedTargetKind = /^look(?:\s+%n)?$/i.test(command.trim()) ? 'look-container'
        : /^examine(?:\s+%n)?$/i.test(command.trim()) ? 'examine-targets'
            : targetKindOverride === 'social' || (!targetKindOverride && resolvedKind === 'social') ? 'social'
                : targetKindOverride === 'inventory-recipient' || targetKindOverride === 'inventory-container'
                    || targetKindOverride === 'room-object-container' ? targetKindOverride : null;

    const suggestions = useMemo((): CommandTargetSuggestion[] | undefined => {
        if (targetKindOverride === 'group') return getGroupSelectionSuggestions(groupMembers, roomOccupants, roomObjects, characterName);
        if (targetKindOverride === 'status-panel') return [];
        if (targetKindOverride === 'shop' || resolvedKind === 'shop') return shopItems.map(item => ({
            key: `shop-item-${item.num}`,
            label: item.name,
            value: String(item.num),
            meta: 'shop-item'
        }));
        if (isEatCommand) return getFoodTargetSuggestions(displayInventoryLines, roomObjects);
        if (targetKindOverride === 'room-objects') return getRoomTargetSuggestions([], roomObjects, 'objects');
        if (targetKindOverride === 'inventory-weapons') {
            const weapons = displayInventoryLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
            return getGearTargetSuggestions(weapons, 'inventory');
        }
        if (targetKindOverride === 'inventory') {
            if (/^drink\b/i.test(command.trim())) return getDrinkTargetSuggestions(displayInventoryLines, displayEqLines, roomWaterAvailable);
            return getGearTargetSuggestions(displayInventoryLines, 'inventory');
        }
        if (targetKindOverride === 'inventory-and-worn') return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        if (targetKindOverride === 'worn') return getGearTargetSuggestions(displayEqLines, 'worn');
        if (targetKindOverride === 'worn-sheaths' || targetKindOverride === 'worn-weapons') {
            const traitId = targetKindOverride === 'worn-sheaths' ? 'trait-sheath' : 'trait-weapon';
            const matchingWorn = displayEqLines.filter(line => hasObjectTrait(line, traitId));
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
        if (resolvedKind === 'pace-options') return ['quick', 'normal', 'thorough'].map(pace => ({
            key: `pace-${pace}`,
            label: pace.charAt(0).toUpperCase() + pace.slice(1),
            value: pace,
            meta: 'pace'
        }));
        if (resolvedKind === 'containers') {
            return getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines);
        }
        if (resolvedKind === 'look-containers') {
            return getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines)
                .filter(suggestion => suggestion.meta !== 'exit');
        }
        if (resolvedKind === 'gear') {
            return getInventoryAndWornTargetSuggestions(displayInventoryLines, displayEqLines);
        }
        if (resolvedKind === 'inventory-gear') return getGearTargetSuggestions(displayInventoryLines, 'inventory');
        if (resolvedKind === 'worn-gear') return getGearTargetSuggestions(displayEqLines, 'worn');
        if (resolvedKind === 'food') return getFoodTargetSuggestions(displayInventoryLines, roomObjects);
        if (resolvedKind === 'drink') return getDrinkTargetSuggestions(displayInventoryLines, displayEqLines, roomWaterAvailable);
        if (resolvedKind === 'pour') return getFluidContainerTargetSuggestions(displayInventoryLines, displayEqLines);
        if (resolvedKind === 'worn-weapons') {
            const wornWeapons = displayEqLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
            return getGearTargetSuggestions(wornWeapons, 'worn');
        }
        if (resolvedKind === 'lanterns') return /^fill\b/i.test(command.trim())
            ? getFillTargetSuggestions(displayInventoryLines, displayEqLines)
            : getLanternTargetSuggestions(displayInventoryLines, displayEqLines);
        if (resolvedKind === 'weather-options') return [
            { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
            { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
            { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
            { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
            { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
            { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
        ];
        if (resolvedKind === 'weather-scope') return ['local', 'global', 'fog'].map(scope => ({
            key: `weather-${scope}`,
            label: scope.charAt(0).toUpperCase() + scope.slice(1),
            value: scope,
            meta: 'weather'
        }));
        if (resolvedKind === 'room-corpses') return getRoomCorpseTargetSuggestions(roomObjects);
        if (resolvedKind === 'mounts') return getMountTargetSuggestions(roomOccupants, /^unsaddle\b/i.test(command.trim()));
        if (resolvedKind === 'self-room') {
            return getSelfAndRoomTargetSuggestions(roomOccupants, roomObjects, characterName);
        }
        if (resolvedKind === 'self-allies') {
            return getSelfAndRoomAlliesTargetSuggestions(roomOccupants, characterName);
        }
        if (resolvedKind === 'room-allies-or-blank') return [
            ...getRoomTargetSuggestions(roomOccupants, [], 'allies', characterName),
            { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
        ];
        if (resolvedKind === 'self-only') return [getSelfTargetSuggestion()];
        if (resolvedKind === 'self-inventory') return [
            getSelfTargetSuggestion(),
            ...getGearTargetSuggestions(displayInventoryLines, 'inventory')
        ];
        if (resolvedKind === 'pick') return getRoomContainerTargetSuggestions(roomObjects, hasRoomDoor);
        if (resolvedKind === 'door-direction') return [
            { key: 'door-exit', label: 'Exit', value: 'exit', meta: 'exit' }
        ];
        if (resolvedKind === 'room-spell' || resolvedKind === 'room-spell-with-extras' || resolvedKind === 'bash' || resolvedKind === 'room') {
            const roomTargets = isOffensiveTargetCommand(command)
                ? getNonGroupmateRoomTargetSuggestions(roomOccupants, groupMembers, characterName)
                : getRoomTargetSuggestions(roomOccupants, roomObjects, 'characters', characterName);
            const eligibleRoomTargets = isOffensiveTargetCommand(command)
                ? roomTargets.filter(suggestion => suggestion.meta?.toLowerCase() !== 'ally')
                : roomTargets;
            const prioritizedRoomTargets = usesChipPriorityOffensiveTarget(command)
                ? prioritizeOffensiveRoomEntitySuggestions(eligibleRoomTargets)
                : eligibleRoomTargets;
            const commandVerb = command.trim().split(/\s+/, 1)[0].toLowerCase();
            if (commandVerb === 'group') return getGroupTargetSuggestions(roomOccupants, characterName);
            if (commandVerb === 'assist') return getAssistTargetSuggestions(roomOccupants, characterName);
            if (commandVerb === 'rescue') return getRescueTargetSuggestions(roomOccupants, characterName, groupMembers);
            if (resolvedKind === 'bash') return appendNamedTargetSuggestions(eligibleRoomTargets, [{ label: 'Exit', value: 'exit', meta: 'exit' }]);
            if (resolvedKind === 'room-spell-with-extras') return appendNamedTargetSuggestions(prioritizedRoomTargets, [
                { label: 'Web', value: 'web', meta: 'object' },
                { label: 'Exit', value: 'exit', meta: 'exit' }
            ]);
            if (/^look(?:\s|$)/i.test(command.trim())) return [
                getSelfTargetSuggestion(),
                { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' },
                { key: 'look-in', label: 'In', value: LOOK_IN_TARGET_VALUE, meta: 'look-in' },
                ...eligibleRoomTargets
            ];
            if (/^examine(?:\s|$)/i.test(command.trim())) return [
                getSelfTargetSuggestion(),
                ...eligibleRoomTargets
            ];
            return prioritizedRoomTargets;
        }
        if (resolvedKind === 'mage-spells') {
            return getLearnedMageSpellSuggestions(practice.practiceData?.skills || [], abilities);
        }
        if (resolvedKind === 'magic-keys') return getMagicKeyTargetSuggestions(teleportTargets);
        if (resolvedKind === 'who') return getWhoTargetSuggestions(whoList, characterName);
        if (resolvedKind === 'who-or-blank') return [
            ...getWhoTargetSuggestions(whoList, characterName),
            { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
        ];
        if (resolvedKind === 'blank-only') return [
            { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
        ];
        if (resolvedKind === 'social') return getSocialTargetSuggestions();
        return undefined;
    }, [
        command, kind, resolvedKind, targetKindOverride, isEatCommand, roomObjects, displayInventoryLines, displayEqLines, roomOccupants,
        characterName, practice.practiceData?.skills, abilities, teleportTargets, whoList, groupMembers, shopItems, roomWaterAvailable,
        hasRoomDoor
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
            second: getGiveRecipientSuggestions(roomOccupants, characterName)
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
                            .map(suggestion => ({ ...suggestion, meta: 'container', objectLocation: 'container' as const }))
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
        if (stagedTargetKind === 'look-container') return {
            first: [
                getSelfTargetSuggestion(),
                { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' },
                { key: 'look-in', label: 'In', value: LOOK_IN_TARGET_VALUE, meta: 'look-in' },
                ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName)
            ],
            second: getContainerTargetSuggestions(roomObjects, displayInventoryLines, displayEqLines)
                .filter(suggestion => suggestion.meta !== 'exit')
        };
        if (stagedTargetKind === 'examine-targets') return {
            first: [
                getSelfTargetSuggestion(),
                ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName)
            ],
            second: getRoomTargetSuggestions([], roomObjects, 'objects', characterName)
                .filter(suggestion => suggestion.meta !== 'exit')
        };
        return { first: [], second: [] };
    }, [stagedTargetKind, roomOccupants, roomObjects, displayInventoryLines, displayEqLines, characterName,
        containerContents, selectedSecondArgument, loadingContainerId]);
    const defaultTarget = /^rescue(?:\s|$)/i.test(command.trim())
        ? suggestions?.find(suggestion => suggestion.value !== BLANK_TARGET_VALUE)?.value ?? BLANK_TARGET_VALUE
        : getDefaultCommandTarget(command);

    return {
        kind: resolvedKind,
        defaultTarget,
        suggestions,
        title: targetKindOverride === 'status-panel' ? 'THIS IS YOU'
            : targetKindOverride === 'group' ? 'GROUP'
            : targetKindOverride === 'shop' ? 'SHOP'
            : targetKindOverride === 'inventory-weapons' ? 'INVENTORY WEAPONS'
            : stagedTargetKind === 'look-container' ? 'LOOK'
            : stagedTargetKind === 'examine-targets' ? 'EXAMINE'
            : stagedTargetKind ? 'SELECT ARGUMENTS'
            : resolvedKind === 'pick' && hasRoomDoor ? 'CONTAINERS / EXIT'
            : resolvedKind ? TARGET_MENU_TITLES[resolvedKind] : 'TARGETS',
        stagedTargetKind,
        firstArgumentSuggestions: stagedArguments.first,
        secondArgumentSuggestions: stagedArguments.second,
        showsStatusPanel: targetKindOverride === 'status-panel',
        showsPracticePanel: command.trim().toLowerCase() === 'practice' && targetKindOverride === 'status-panel',
        showsShopPanel: resolvedKind === 'shop'
    };
};
