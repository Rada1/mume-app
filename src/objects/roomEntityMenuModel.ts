/**
 * @file roomEntityMenuModel.ts
 * @description Projects the current room into selectable character and object menu entries.
 */

import type { GmcpOccupant } from '../types';
import { classifyOccupant } from '../services/classification/classifyOccupant';
import { getRoomTargetSuggestions } from './roomTargetSuggestions';
import { getRoomObjectCandidates } from './objectTargetModel';
import { getCategoryIdForKindLocation, toCategoryId } from '../utils/inlineActionModel';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';

export interface RoomEntityMenuEntry {
    id: string;
    label: string;
    keyword: string;
    context: string;
    category: string;
    group: 'characters' | 'objects' | 'players' | 'npcs';
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

export const getRoomEntityMenuEntries = (
    players: RoomSource[],
    npcs: RoomSource[],
    objects: RoomSource[]
): RoomEntityMenuEntry[] => [
    ...createCharacterEntries([...players, ...npcs]),
    ...createObjectEntries(objects)
];

export const getRoomEntityMenuEntriesByKind = (
    players: RoomSource[],
    npcs: RoomSource[],
    objects: RoomSource[]
): RoomEntityMenuEntryByKind[] => [
    ...createCharacterEntries(players).map(entry => ({ ...entry, group: 'players' as const })),
    ...createCharacterEntries(npcs).map(entry => ({ ...entry, group: 'npcs' as const })),
    ...createObjectEntries(objects)
];
