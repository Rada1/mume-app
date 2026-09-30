/**
 * @file gearTargetSuggestions.ts
 * @description Shared inventory, equipment, food, drink, and container menus.
 */

import type { DrawerLine, GmcpOccupant } from '../types';
import { isFluidContainer, isItemContainer } from '../utils/gameUtils';
import { getContainerCommand, getWornSlotLabel } from '../utils/gearPanelUtils';
import {
    createObjectTargetEntries,
    getGearObjectCandidates,
    getRoomObjectCandidates,
    hasObjectTrait,
    type ObjectLocation
} from './objectTargetModel';
import { getRoomTargetSuggestions } from './roomTargetSuggestions';
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
    wornLines: DrawerLine[]
): CommandTargetSuggestion[] => {
    const fluidContainers = (lines: DrawerLine[]) => lines.filter(line =>
        line.isItem && !line.isHeader && (hasObjectTrait(line, 'trait-fluid-container') || isFluidContainer(`${line.text} ${line.rawText || ''} ${line.context || ''}`))
    );
    return [
        ...getInventoryAndWornTargetSuggestions(fluidContainers(inventoryLines), fluidContainers(wornLines)),
        { key: 'drink-water', label: 'Water', value: 'water', meta: 'source' }
    ];
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
    const roomTargets = roomItems.flatMap((source, index) => {
        const item: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const label = item.short || item.shortdesc || item.name || item.keyword || '';
        if (!label || (!hasObjectTrait(item, 'trait-container') && !isItemContainer(label))) return [];
        const suggestion = getRoomTargetSuggestions([], [item], 'objects')[0];
        if (!suggestion) return [];
        const containerId = item.id !== undefined ? String(item.id) : `room-container-${index}-${suggestion.value}`;
        return [{
            ...suggestion,
            key: suggestion.objectId || `room-${containerId}-${suggestion.value}`,
            meta: 'room',
            containerId,
            containerCommand: `look in ${suggestion.value}`
        }];
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
