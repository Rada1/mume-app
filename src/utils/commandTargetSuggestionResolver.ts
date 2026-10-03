/**
 * @file commandTargetSuggestionResolver.ts
 * @description Resolves typed command targets through the same menu kinds used by game buttons.
 */

import type { DrawerLine, GmcpOccupant, PracticeSkill, ShopItem, TeleportTarget } from '../types';
import {
    BLANK_TARGET_VALUE,
    getCommandTargetMenuKind,
    isOffensiveTargetCommand,
    usesChipPriorityOffensiveTarget,
    type CommandTargetMenuKind
} from './commandTargetUtils';
import {
    appendNamedTargetSuggestions,
    getAssistTargetSuggestions,
    getContainerTargetSuggestions,
    getDrinkTargetSuggestions,
    getFluidContainerTargetSuggestions,
    getFillTargetSuggestions,
    getFoodTargetSuggestions,
    getGearTargetSuggestions,
    getGiveRecipientSuggestions,
    getGroupTargetSuggestions,
    getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions,
    getLearnedMageSpellSuggestions,
    getMagicKeyTargetSuggestions,
    getMountTargetSuggestions,
    getRescueTargetSuggestions,
    getRoomCorpseTargetSuggestions,
    getRoomObjectTargetsWithExit,
    getRoomTargetSuggestions,
    getSelfAndRoomAlliesTargetSuggestions,
    getSelfAndRoomTargetSuggestions,
    getSelfTargetSuggestion,
    getSocialTargetSuggestions,
    getWhoTargetSuggestions,
    prioritizeOffensiveRoomEntitySuggestions,
    type CommandTargetSuggestion
} from './commandSuggestionUtils';
import { hasObjectTrait } from '../objects/objectTargetModel';

// --- Type Section ---

export interface CommandTargetSuggestionContext {
    command: string;
    argumentText: string;
    menuKind: CommandTargetMenuKind | null;
    roomOccupants: GmcpOccupant[];
    roomObjects: GmcpOccupant[];
    inventoryLines: DrawerLine[];
    wornLines: DrawerLine[];
    characterName?: string;
    abilities?: Record<string, number>;
    practiceSkills?: PracticeSkill[];
    teleportTargets?: TeleportTarget[];
    whoList?: string[];
    shopItems?: ShopItem[];
}

export interface ResolvedCommandTargetSuggestions {
    suggestions: CommandTargetSuggestion[];
    fragment: string;
    argumentIndex: number;
}

export interface CommandArgumentChipRange {
    key: string;
    label: string;
    value: string;
    start: number;
    end: number;
    suggestions: CommandTargetSuggestion[];
}

export interface SelectedCommandArgumentChip extends CommandArgumentChipRange {
    commandToken: string;
    isVirtual?: boolean;
    snapshot?: string;
}

// --- Logic Section ---

const ALL_ARGUMENT_SUGGESTION: CommandTargetSuggestion = {
    key: 'all-argument', label: 'All', value: 'all', meta: 'all'
};
const ROOM_ARGUMENT_SUGGESTION: CommandTargetSuggestion = {
    key: 'get-from-room', label: 'Room', value: '__room__', meta: 'room'
};

export const replaceActiveCommandArgumentToken = (command: string, target: string): string => {
    const trailingWhitespace = command.match(/\s*$/)?.[0] || '';
    if (trailingWhitespace) return `${command}${target} `;

    const content = command;
    const activeToken = /\S+$/.exec(content);
    if (!activeToken || activeToken.index === undefined) return `${command}${target} `;
    return `${content.slice(0, activeToken.index)}${target} `;
};

export const replaceFirstCommandArgument = (command: string, target: string): string => {
    const commandToken = /^\s*\S+/.exec(command);
    if (!commandToken) return command;
    return `${command.slice(0, commandToken[0].length)} ${target} `;
};

const normalizeArgument = (value: string): string => value.trim().toLowerCase().replace(/^\d+\./, '');

const getStagedSuggestions = (
    command: string,
    argumentText: string,
    roomOccupants: GmcpOccupant[],
    roomObjects: GmcpOccupant[],
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[],
    characterName: string
): ResolvedCommandTargetSuggestions | null => {
    const verb = command.trim().split(/\s+/, 1)[0]?.toLowerCase();
    if (!['give', 'put', 'get', 'pour'].includes(verb)) return null;

    const firstArguments = verb === 'give'
        ? [ALL_ARGUMENT_SUGGESTION, ...getInventoryAndWornTargetSuggestions(inventoryLines, wornLines)]
        : verb === 'put'
            ? [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(inventoryLines, 'inventory')]
            : verb === 'pour'
                ? getDrinkTargetSuggestions(inventoryLines, wornLines)
            : [ALL_ARGUMENT_SUGGESTION, ...getRoomTargetSuggestions([], roomObjects, 'objects')];

    const rawArguments = argumentText.trim();
    const hasTrailingSpace = /\s$/.test(argumentText);
    const exactFirstArgument = firstArguments
        .filter(suggestion => suggestion.value)
        .sort((left, right) => right.value.length - left.value.length)
        .find(suggestion => {
            const value = normalizeArgument(suggestion.value);
            const typed = normalizeArgument(rawArguments);
            return (hasTrailingSpace && typed === value) || typed.startsWith(`${value} `);
        });

    if (!exactFirstArgument) return { suggestions: firstArguments, fragment: rawArguments, argumentIndex: 0 };

    const typedRemainder = rawArguments.slice(exactFirstArgument.value.length);
    const fragment = /\s$/.test(typedRemainder)
        ? ''
        : typedRemainder.trim().split(/\s+/).pop() || '';
    const containers = getContainerTargetSuggestions(roomObjects, inventoryLines, wornLines)
        .filter(suggestion => suggestion.meta !== 'exit');
    const secondArguments = verb === 'give'
        ? getGiveRecipientSuggestions(roomOccupants, characterName)
        : verb === 'pour'
            ? getFluidContainerTargetSuggestions(inventoryLines, wornLines, exactFirstArgument.value)
        : verb === 'put'
            ? [ALL_ARGUMENT_SUGGESTION, ...containers]
            : [ROOM_ARGUMENT_SUGGESTION, ALL_ARGUMENT_SUGGESTION, ...containers];

    return { suggestions: secondArguments, fragment, argumentIndex: 1 };
};

const getMenuSuggestions = (
    command: string,
    kind: CommandTargetMenuKind | null,
    roomOccupants: GmcpOccupant[],
    roomObjects: GmcpOccupant[],
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[],
    characterName: string,
    abilities: Record<string, number>,
    practiceSkills: PracticeSkill[],
    teleportTargets: TeleportTarget[],
    whoList: string[],
    shopItems: ShopItem[]
): CommandTargetSuggestion[] | null => {
    const isEatCommand = /^eat\b/i.test(command.trim());
    if (kind === 'shop') return shopItems.map(item => ({
        key: `shop-item-${item.num}`, label: item.name, value: String(item.num), meta: 'shop-item'
    }));
    if (isEatCommand || kind === 'food') return getFoodTargetSuggestions(inventoryLines, roomObjects);
    if (kind === 'movement-wheel') return [];
    if (kind === 'pace-options') return ['quick', 'normal', 'thorough'].map(pace => ({
        key: `pace-${pace}`, label: pace.charAt(0).toUpperCase() + pace.slice(1), value: pace, meta: 'pace'
    }));
    if (kind === 'containers') return getContainerTargetSuggestions(roomObjects, inventoryLines, wornLines);
    if (kind === 'look-containers') return getContainerTargetSuggestions(roomObjects, inventoryLines, wornLines)
        .filter(suggestion => suggestion.meta !== 'exit');
    if (kind === 'gear') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
    if (kind === 'inventory-gear') return getGearTargetSuggestions(inventoryLines, 'inventory');
    if (kind === 'worn-gear') return getGearTargetSuggestions(wornLines, 'worn');
    if (kind === 'drink') return getDrinkTargetSuggestions(inventoryLines, wornLines);
    if (kind === 'pour') return getFluidContainerTargetSuggestions(inventoryLines, wornLines);
    if (kind === 'worn-weapons') return getGearTargetSuggestions(
        wornLines.filter(line => hasObjectTrait(line, 'trait-weapon')), 'worn'
    );
    if (kind === 'lanterns') return /^fill\b/i.test(command.trim())
        ? getFillTargetSuggestions(inventoryLines, wornLines)
        : getLanternTargetSuggestions(inventoryLines, wornLines);
    if (kind === 'weather-options') return [
        { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
        { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
        { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
        { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
        { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
        { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
    ];
    if (kind === 'weather-scope') return ['local', 'global', 'fog'].map(scope => ({
        key: `weather-${scope}`, label: scope.charAt(0).toUpperCase() + scope.slice(1), value: scope, meta: 'weather'
    }));
    if (kind === 'room-corpses') return getRoomCorpseTargetSuggestions(roomObjects);
    if (kind === 'mounts') return getMountTargetSuggestions(roomOccupants, /^unsaddle\b/i.test(command.trim()));
    if (kind === 'self-room') return getSelfAndRoomTargetSuggestions(roomOccupants, roomObjects, characterName);
    if (kind === 'self-allies') return getSelfAndRoomAlliesTargetSuggestions(roomOccupants, characterName);
    if (kind === 'room-allies-or-blank') return [
        ...getRoomTargetSuggestions(roomOccupants, [], 'allies', characterName),
        { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
    ];
    if (kind === 'self-only') return [getSelfTargetSuggestion()];
    if (kind === 'self-inventory') return [getSelfTargetSuggestion(), ...getGearTargetSuggestions(inventoryLines, 'inventory')];
    if (kind === 'pick') return getRoomObjectTargetsWithExit(roomObjects);
    if (kind === 'door-direction') return [{ key: 'door-exit', label: 'Exit', value: 'exit', meta: 'exit' }];
    if (kind === 'room-spell' || kind === 'room-spell-with-extras' || kind === 'bash' || kind === 'room') {
        const verb = command.trim().split(/\s+/, 1)[0].toLowerCase();
        const roomTargets = getRoomTargetSuggestions(roomOccupants, roomObjects, 'characters', characterName);
        const eligibleTargets = isOffensiveTargetCommand(command)
            ? roomTargets.filter(suggestion => suggestion.meta?.toLowerCase() !== 'ally')
            : roomTargets;
        const prioritizedTargets = usesChipPriorityOffensiveTarget(command)
            ? prioritizeOffensiveRoomEntitySuggestions(eligibleTargets)
            : eligibleTargets;
        if (verb === 'group') return getGroupTargetSuggestions(roomOccupants, characterName);
        if (verb === 'assist') return getAssistTargetSuggestions(roomOccupants, characterName);
        if (verb === 'rescue') return getRescueTargetSuggestions(roomOccupants, characterName);
        if (kind === 'bash') return appendNamedTargetSuggestions(eligibleTargets, [{ label: 'Exit', value: 'exit', meta: 'exit' }]);
        if (kind === 'room-spell-with-extras') return appendNamedTargetSuggestions(prioritizedTargets, [
            { label: 'Web', value: 'web', meta: 'object' }, { label: 'Exit', value: 'exit', meta: 'exit' }
        ]);
        if (/^look(?:\s|$)/i.test(command.trim())) return [
            getSelfTargetSuggestion(),
            { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' },
            { key: 'look-in', label: 'In', value: 'in', meta: 'look-in' },
            ...eligibleTargets
        ];
        if (/^examine(?:\s|$)/i.test(command.trim())) return [getSelfTargetSuggestion(), ...eligibleTargets];
        return prioritizedTargets;
    }
    if (kind === 'mage-spells') return getLearnedMageSpellSuggestions(practiceSkills, abilities);
    if (kind === 'magic-keys') return getMagicKeyTargetSuggestions(teleportTargets);
    if (kind === 'who') return getWhoTargetSuggestions(whoList, characterName);
    if (kind === 'who-or-blank') return [
        ...getWhoTargetSuggestions(whoList, characterName),
        { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
    ];
    if (kind === 'blank-only') return [
        { key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source' }
    ];
    if (kind === 'social') return getSocialTargetSuggestions();
    return null;
};

export const resolveCommandTargetSuggestions = (context: CommandTargetSuggestionContext): ResolvedCommandTargetSuggestions => {
    const roomOccupants = context.roomOccupants;
    const roomObjects = context.roomObjects;
    const inventoryLines = context.inventoryLines;
    const wornLines = context.wornLines;
    const characterName = context.characterName || '';
    const staged = getStagedSuggestions(
        context.command, context.argumentText, roomOccupants, roomObjects, inventoryLines, wornLines, characterName
    );
    if (staged) return staged;

    const menuKind = context.menuKind ?? getCommandTargetMenuKind(context.command);
    const suggestions = getMenuSuggestions(
        context.command,
        menuKind,
        roomOccupants,
        roomObjects,
        inventoryLines,
        wornLines,
        characterName,
        context.abilities || {},
        context.practiceSkills || [],
        context.teleportTargets || [],
        context.whoList || [],
        context.shopItems || []
    );
    const fallbackKind = /^(get|take|pick)$/.test(context.command.trim().split(/\s+/, 1)[0].toLowerCase())
        ? 'objects'
        : /^(assist|rescue|follow)$/.test(context.command.trim().split(/\s+/, 1)[0].toLowerCase())
            ? 'allies'
            : 'characters';
    const argumentText = menuKind === 'look-containers'
        ? context.argumentText.replace(/^\s*in(?:\s|$)/i, '')
        : context.argumentText;
    return {
        suggestions: suggestions ?? getRoomTargetSuggestions(roomOccupants, roomObjects, fallbackKind, characterName),
        fragment: argumentText.trim().split(/\s+/, 1)[0] || '',
        argumentIndex: 0
    };
};
