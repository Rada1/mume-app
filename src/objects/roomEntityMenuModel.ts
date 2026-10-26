/**
 * @file roomEntityMenuModel.ts
 * @description Projects the current room into selectable character and object menu entries.
 */

import type { DrawerLine, GmcpOccupant } from '../types';
import { classifyOccupant } from '../services/classification/classifyOccupant';
import { getRoomTargetSuggestions } from './roomTargetSuggestions';
import { getRoomObjectCandidates } from './objectTargetModel';
import { getCategoryIdForKindLocation, toCategoryId } from '../utils/inlineActionModel';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';
import { isCurrentCommandTarget } from '../utils/currentCommandTarget';
import { getGearTargetSuggestions } from './gearTargetSuggestions';

export interface RoomEntityMenuEntry {
    id: string;
    label: string;
    keyword: string;
    context: string;
    category: string;
    group: 'characters' | 'objects' | 'players' | 'npcs' | 'self' | 'inventory' | 'equipment';
    isCurrentTarget?: boolean;
    isOutOfRoom?: boolean;
    isContext?: boolean;
}

export type RoomEntityMenuEntryByKind = Omit<RoomEntityMenuEntry, 'group'> & {
    group: 'players' | 'npcs' | 'objects';
};

type RoomObjectMenuEntry = Omit<RoomEntityMenuEntry, 'group'> & { group: 'objects' };

type RoomSource = string | GmcpOccupant;

const getOccupant = (source: RoomSource): GmcpOccupant => (
    typeof source === 'string' ? { name: source } : source
);

const getCharacterLabel = (occupant: GmcpOccupant): string => (
    occupant._visibleRoomLabel || occupant.short || occupant.shortdesc || occupant.name || occupant.keyword || ''
);

const createCharacterEntries = (sources: RoomSource[]): RoomEntityMenuEntry[] => {
    const sourceBySuggestionKey = new Map<string, GmcpOccupant>();
    sources.forEach((source, index) => {
        const occupant = getOccupant(source);
        const label = getCharacterLabel(occupant);
        const keyword = getOccupantCommandKeyword(occupant, label);
        if (!label || !keyword) return;
        sourceBySuggestionKey.set(`${occupant.id ?? index}-${keyword}`, occupant);
    });

    return getRoomTargetSuggestions(sources, [], 'characters').flatMap(suggestion => {
        const occupant = sourceBySuggestionKey.get(suggestion.key);
        if (!occupant) return [];
        const category = toCategoryId(occupant.category)
            || classifyOccupant(occupant)?.category
            || getCategoryIdForKindLocation(normalizeOccupantType(occupant) || 'npc', 'room');
        const id = occupant.id === undefined
            ? `roomchars:${suggestion.value}`
            : `roomchars:${occupant.id}`;
        return [{
            id,
            label: suggestion.label,
            keyword: suggestion.value,
            context: suggestion.value,
            category,
            group: 'characters' as const
        }];
    });
};

const createObjectEntries = (sources: RoomSource[]): RoomObjectMenuEntry[] => {
    const sourceById = new Map(getRoomObjectCandidates(sources).map(candidate => [candidate.id, candidate.source]));
    return getRoomTargetSuggestions([], sources, 'objects').flatMap(suggestion => {
        const source = suggestion.objectId ? sourceById.get(suggestion.objectId) : undefined;
        if (!source) return [];
        const id = suggestion.objectId || `room-object:${suggestion.value}`;
        return [{
            id,
            label: suggestion.label,
            keyword: suggestion.value,
            context: suggestion.value,
            category: toCategoryId('category' in source ? source.category : undefined) || 'cat-room-object',
            group: 'objects' as const
        }];
    });
};

const includeCurrentTarget = (entries: RoomEntityMenuEntry[], currentTarget?: string | null): RoomEntityMenuEntry[] => {
    const normalizedTarget = currentTarget?.trim();
    if (!normalizedTarget) return entries;

    const currentEntry = entries.find(entry => isCurrentCommandTarget(entry, normalizedTarget));
    if (currentEntry) {
        currentEntry.isCurrentTarget = true;
        const currentIndex = entries.indexOf(currentEntry);
        const firstGroupIndex = entries.findIndex(entry => entry.group === currentEntry.group);
        if (currentIndex !== firstGroupIndex && firstGroupIndex >= 0) {
            entries.splice(currentIndex, 1);
            entries.splice(firstGroupIndex, 0, currentEntry);
        }
        return entries;
    }

    if (normalizedTarget.toLowerCase() === 'self') return entries;
    const targetEntry: RoomEntityMenuEntry = {
        id: `command-current-target:${normalizedTarget.toLowerCase().replace(/\s+/g, '-')}`,
        label: normalizedTarget,
        keyword: normalizedTarget,
        context: normalizedTarget,
        category: 'cat-enemy',
        group: 'characters',
        isCurrentTarget: true,
        isOutOfRoom: true
    };
    const firstCharacterIndex = entries.findIndex(entry => entry.group === 'characters');
    entries.splice(firstCharacterIndex < 0 ? 0 : firstCharacterIndex, 0, targetEntry);
    return entries;
};

const createPersonalTargetEntries = (
    characterName: string,
    inventoryLines: DrawerLine[],
    equipmentLines: DrawerLine[]
): RoomEntityMenuEntry[] => [
    {
        id: 'inline-target-self',
        label: characterName || 'Self',
        keyword: 'self',
        context: 'self',
        category: 'cat-ally',
        group: 'self',
        isContext: true
    },
    ...getGearTargetSuggestions(inventoryLines, 'inventory').map(suggestion => ({
        id: suggestion.objectId || suggestion.key,
        label: suggestion.label,
        keyword: suggestion.keyword || suggestion.value,
        context: suggestion.value,
        category: 'cat-inventory-object',
        group: 'inventory' as const
    })),
    ...getGearTargetSuggestions(equipmentLines, 'worn').map(suggestion => ({
        id: suggestion.objectId || suggestion.key,
        label: suggestion.label,
        keyword: suggestion.keyword || suggestion.value,
        context: suggestion.value,
        category: 'cat-worn-object',
        group: 'equipment' as const
    }))
];

export const getRoomEntityMenuEntries = (
    players: RoomSource[],
    npcs: RoomSource[],
    objects: RoomSource[],
    currentTarget?: string | null
): RoomEntityMenuEntry[] => {
    const characters = createCharacterEntries([...players, ...npcs]);
    return includeCurrentTarget([...characters, ...createObjectEntries(objects)], currentTarget);
};

export const getInlineTargetMenuEntries = (
    players: RoomSource[],
    npcs: RoomSource[],
    objects: RoomSource[],
    characterName: string,
    inventoryLines: DrawerLine[],
    equipmentLines: DrawerLine[],
    currentTarget?: string | null
): RoomEntityMenuEntry[] => includeCurrentTarget([
    ...getRoomEntityMenuEntries(players, npcs, objects),
    ...createPersonalTargetEntries(characterName, inventoryLines, equipmentLines)
], currentTarget);

export const getRoomEntityMenuEntriesByKind = (
    players: RoomSource[],
    npcs: RoomSource[],
    objects: RoomSource[]
): RoomEntityMenuEntryByKind[] => [
    ...createCharacterEntries(players).map(entry => ({ ...entry, group: 'players' as const })),
    ...createCharacterEntries(npcs).map(entry => ({ ...entry, group: 'npcs' as const })),
    ...createObjectEntries(objects)
];
