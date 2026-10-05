/**
 * @file gearTargetSuggestions.ts
 * @description Shared inventory, equipment, food, drink, and container menus.
 */

import type { DrawerLine, GmcpOccupant } from '../types';
import { BLANK_TARGET_VALUE } from '../utils/commandTargetUtils';
import { isFluidContainer, isItemContainer } from '../utils/gameUtils';
import { getContainerCommand, getWornSlotLabel } from '../utils/gearPanelUtils';
import {
    createObjectTargetEntries,
    getGearObjectCandidates,
    getRoomObjectCandidates,
    hasObjectTrait,
    type ObjectLocation
} from './objectTargetModel';
import { getRoomContainerTargetSuggestions, getRoomTargetSuggestions } from './roomTargetSuggestions';
import type { CommandTargetSuggestion } from './targetSuggestionTypes';

// --- Gear Target Selectors ---

const gearTargetSuggestions = (
    lines: DrawerLine[],
    kind: 'inventory' | 'worn',
    ordinalScope: (candidate: { location: ObjectLocation }) => string = candidate => candidate.location
): CommandTargetSuggestion[] => createObjectTargetEntries(
    getGearObjectCandidates(lines, kind),
    ordinalScope
).map(entry => ({
    key: entry.id,
    label: entry.label,
    value: entry.selector,
    meta: entry.location,
    wornLocation: entry.wornLocation ? getWornSlotLabel(entry.wornLocation) : undefined,
    objectId: entry.id,
    objectLocation: entry.location,
    objectTraits: entry.traits
}));

export const getGearTargetSuggestions = (
    lines: DrawerLine[],
    kind: 'inventory' | 'worn'
): CommandTargetSuggestion[] => gearTargetSuggestions(lines, kind);

export const getInventoryAndWornTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => createObjectTargetEntries([
    ...getGearObjectCandidates(inventoryLines, 'inventory'),
    ...getGearObjectCandidates(wornLines, 'worn')
], () => 'player-gear').map(entry => ({
    key: entry.id,
    label: entry.label,
    value: entry.selector,
    meta: entry.location,
    wornLocation: entry.wornLocation ? getWornSlotLabel(entry.wornLocation) : undefined,
    objectId: entry.id,
    objectLocation: entry.location,
    objectTraits: entry.traits
}));

export const getSheathTargetSuggestions = (wornLines: DrawerLine[]): CommandTargetSuggestion[] => [
    { key: 'sheath-no-target', label: 'No target', value: BLANK_TARGET_VALUE, meta: 'blank' },
    ...getGearTargetSuggestions(wornLines.filter(line => hasObjectTrait(line, 'trait-weapon')), 'worn')
];

export const getPipeTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const isPipe = (line: DrawerLine) => line.isItem && !line.isHeader && (
        hasObjectTrait(line, 'trait-pipe-worn') || /\bpipes?\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)
    );
    return getInventoryAndWornTargetSuggestions(inventoryLines.filter(isPipe), wornLines.filter(isPipe));
};

export const getMeatTargetSuggestions = (inventoryLines: DrawerLine[]): CommandTargetSuggestion[] =>
    getGearTargetSuggestions(inventoryLines.filter(line => line.isItem && !line.isHeader
        && hasObjectTrait(line, 'trait-food')
        && /\b(?:meat|mutton)\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)
        && !/\b(?:cooked|roasted|fried)\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)), 'inventory');

export const getDrawTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const inventoryWeapons = inventoryLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
    const wornDrawItems = wornLines.filter(line => {
        const wornSlot = line.prefix?.replace(/[<>]/g, '').trim().toLowerCase().replace(/\s+/g, ' ') || '';
        if (/^(?:wielded|held(?: in weapon hand)?)$/.test(wornSlot)) return false;
        if (hasObjectTrait(line, 'trait-sheath')) return true;
        const isWornAcrossBack = /^worn across(?: the)? back$/.test(wornSlot);
        return isWornAcrossBack && /\b(?:(?:cross|long|short)?bow)\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`);
    });
    return getInventoryAndWornTargetSuggestions(inventoryWeapons, wornDrawItems);
};

// --- Classification-Filtered Targets ---

export const getFoodTargetSuggestions = (
    inventoryLines: DrawerLine[],
    roomObjects: Array<string | GmcpOccupant>
): CommandTargetSuggestion[] => {
    const foodInventory = inventoryLines.filter(line => line.isItem && !line.isHeader && hasObjectTrait(line, 'trait-food'));
    const foodRoomObjects = roomObjects.filter(source => hasObjectTrait(source, 'trait-food'));
    return createObjectTargetEntries([
        ...getGearObjectCandidates(foodInventory, 'inventory'),
        ...getRoomObjectCandidates(foodRoomObjects)
    ], () => 'food-target').map(entry => ({
        key: entry.id,
        label: entry.label,
        value: entry.selector,
        meta: entry.location,
        objectId: entry.id,
        objectLocation: entry.location,
        objectTraits: entry.traits
    }));
};

export const getDrinkTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[],
    roomWaterAvailable = false
): CommandTargetSuggestion[] => {
    const fluidContainers = (lines: DrawerLine[]) => lines.filter(line =>
        line.isItem && !line.isHeader && !hasObjectTrait(line, 'trait-armour')
        && (hasObjectTrait(line, 'trait-fluid-container') || isFluidContainer(`${line.text} ${line.rawText || ''} ${line.context || ''}`))
    );
    const containers = getInventoryAndWornTargetSuggestions(fluidContainers(inventoryLines), fluidContainers(wornLines));
    return roomWaterAvailable
        ? [{ key: 'drink-water', label: 'Water', value: 'water', meta: 'source' }, ...containers]
        : containers;
};

export const getFluidContainerTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[],
    sourceTarget?: string | null
): CommandTargetSuggestion[] => {
    const containers = getDrinkTargetSuggestions(inventoryLines, wornLines)
        .filter(suggestion => suggestion.meta !== 'source');
    const source = containers.find(suggestion => suggestion.value === sourceTarget || suggestion.key === sourceTarget);
    if (!source) return containers;
    return containers.filter(suggestion => source.objectId && suggestion.objectId
        ? suggestion.objectId !== source.objectId
        : suggestion.value !== source.value);
};

export const getLanternTargetSuggestions = (
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => getInventoryAndWornTargetSuggestions(
    inventoryLines.filter(line => line.isItem && (hasObjectTrait(line, 'trait-lightsource') || /\blantern\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`))),
    wornLines.filter(line => line.isItem && (hasObjectTrait(line, 'trait-lightsource') || /\blantern\b/i.test(`${line.text} ${line.rawText || ''} ${line.context || ''}`)))
);

export const getFillTargetSuggestions = (
    inventoryLines: DrawerLine[] = [],
    wornLines: DrawerLine[] = []
): CommandTargetSuggestion[] => {
    const inventoryLanterns = inventoryLines.filter(line => line.isItem && /\blantern\b/i.test(`${line.text} ${line.context || ''}`));
    const wornLanterns = wornLines.filter(line => line.isItem && /\blantern\b/i.test(`${line.text} ${line.context || ''}`));
    const targets = getInventoryAndWornTargetSuggestions(inventoryLanterns, wornLanterns);
    return targets.length > 0 ? targets : [
        { key: 'fill-lantern', label: 'Lantern', value: 'lantern', meta: 'inventory' }
    ];
};

// --- Container Targets ---

const disambiguateGearSuggestions = (suggestions: CommandTargetSuggestion[]): CommandTargetSuggestion[] => {
    const baseValue = (value: string) => value.trim().replace(/^\d+\./, '');
    const counts = new Map<string, number>();
    suggestions.forEach(suggestion => {
        const key = baseValue(suggestion.value).toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const ordinals = new Map<string, number>();
    return suggestions.map(suggestion => {
        const value = baseValue(suggestion.value);
        const key = value.toLowerCase();
        if ((counts.get(key) || 0) < 2) return suggestion;
        const ordinal = (ordinals.get(key) || 0) + 1;
        ordinals.set(key, ordinal);
        const selector = `${ordinal}.${value}`;
        return {
            ...suggestion,
            label: selector,
            value: selector,
            containerCommand: suggestion.containerCommand ? `look in ${selector}` : undefined
        };
    });
};

export const getContainerTargetSuggestions = (
    roomItems: Array<string | GmcpOccupant>,
    inventoryLines: DrawerLine[],
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const roomTargets = getRoomContainerTargetSuggestions(roomItems).map((suggestion, index) => {
        const containerId = suggestion.objectId || `room-container-${index}-${suggestion.value}`;
        return {
            ...suggestion,
            key: suggestion.objectId || `room-container-${index}-${suggestion.value}`,
            meta: 'room',
            containerId,
            containerCommand: `look in ${suggestion.value}`
        };
    });

    const gearTargets = (lines: DrawerLine[], kind: 'inventory' | 'worn') => lines.flatMap((line, index) => {
        // Container rows may lack the generic item marker in a capture.
        if (line.isHeader || !(line.isContainer || hasObjectTrait(line, 'trait-container') || isItemContainer(`${line.text} ${line.rawText || ''}`))) return [];
        const suggestion = getGearTargetSuggestions([{ ...line, isItem: true }], kind)[0];
        if (!suggestion) return [];
        return [{
            ...suggestion,
            key: suggestion.objectId || `${kind}-${suggestion.key || index}`,
            meta: kind,
            containerId: line.id,
            containerCommand: getContainerCommand(line, lines) || `look in ${suggestion.value}`
        }];
    });

    return disambiguateGearSuggestions([
        { key: 'container-exit', label: 'Exit', value: 'exit', meta: 'exit' },
        ...roomTargets,
        ...gearTargets(inventoryLines, 'inventory'),
        ...gearTargets(wornLines, 'worn')
    ]);
};
