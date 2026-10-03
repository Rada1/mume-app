/**
 * @file roomTargetSuggestions.ts
 * @description Shared projections for room objects, characters, and allies.
 */

import type { GmcpOccupant } from '../types';
import { BLANK_TARGET_VALUE } from '../utils/commandTargetUtils';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';
import { normalizeOccupantType } from '../services/classification/normalizeOccupantType';
import { createObjectTargetEntries, getRoomObjectCandidates, hasObjectTrait } from './objectTargetModel';
import { makeCommandTargetSuggestion, type CommandTargetSuggestion } from './targetSuggestionTypes';

// --- Room Target Projections ---

const getAllyPriority = (source: string | GmcpOccupant): number | null => {
    if (typeof source === 'string') return null;
    const normalizedType = normalizeOccupantType(source)?.toLowerCase();
    if (normalizedType === 'enemy' || normalizedType === 'neutral' || normalizedType === 'you' || normalizedType === 'self') return null;

    const tags = [source.category, ...(source.labels || []), ...(source.flags || [])]
        .filter(Boolean)
        .map(tag => String(tag).toLowerCase().replace(/^(?:cat|trait)-/, ''));
    const hasAllyTag = tags.some(tag => ['ally', 'allies', 'friend', 'grouped'].includes(tag));
    if (hasAllyTag) return 0;
    if (normalizedType === 'ally' || normalizedType === 'player' || source.pc === true || source.pc === 1) return 1;
    return null;
};

export const getRoomTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    objects: Array<string | GmcpOccupant>,
    kind: 'characters' | 'allies' | 'objects',
    selfName = ''
): CommandTargetSuggestion[] => {
    const roomSources = kind === 'objects' ? objects : characters;
    const hasRoomOrder = kind !== 'objects'
        && roomSources.some(source => typeof source !== 'string' && source._roomOrder !== undefined);
    const sources = hasRoomOrder
        ? roomSources
            .map((source, index) => ({ source, index, order: typeof source === 'string' ? undefined : source._roomOrder }))
            .sort((left, right) => (left.order ?? Number.POSITIVE_INFINITY) - (right.order ?? Number.POSITIVE_INFINITY) || left.index - right.index)
            .map(entry => entry.source)
        : roomSources;
    if (kind === 'objects') {
        return createObjectTargetEntries(getRoomObjectCandidates(objects)).map(entry => {
            const source = entry.source as GmcpOccupant;
            return {
                key: entry.id,
                label: entry.label,
                value: entry.selector,
                meta: source.type?.toLowerCase() || 'object',
                objectId: entry.id,
                objectLocation: entry.location,
                objectTraits: entry.traits
            };
        });
    }
    const orderedSources = kind === 'allies'
        ? sources.map((source, index) => ({ source, index, priority: getAllyPriority(source) }))
            .filter((entry): entry is { source: string | GmcpOccupant; index: number; priority: number } => entry.priority !== null)
            .sort((a, b) => a.priority - b.priority)
        : sources.map((source, index) => ({ source, index, priority: 0 }));
    const suggestions = orderedSources.flatMap(({ source, index }) => {
        const occupant: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const type = (occupant.type || '').toLowerCase();
        const label = occupant.short || occupant.shortdesc || occupant.name || occupant.keyword || '';
        if (!label || (selfName && label.toLowerCase() === selfName.toLowerCase())) return [];
        const value = getOccupantCommandKeyword(occupant, label);
        if (!value) return [];
        const meta = getAllyPriority(source) !== null
            ? 'ally'
            : normalizeOccupantType(occupant)?.toLowerCase() || type || kind;
        return [{ key: `${occupant.id ?? index}-${value}`, label, value, meta }];
    });

    const totalByKeyword = new Map<string, number>();
    suggestions.forEach(({ value }) => {
        const keyword = value.toLowerCase();
        totalByKeyword.set(keyword, (totalByKeyword.get(keyword) || 0) + 1);
    });

    const ordinalByKeyword = new Map<string, number>();
    return suggestions.map(suggestion => {
        const keyword = suggestion.value.toLowerCase();
        const total = totalByKeyword.get(keyword) || 0;
        if (total < 2) return suggestion;

        const ordinal = (ordinalByKeyword.get(keyword) || 0) + 1;
        ordinalByKeyword.set(keyword, ordinal);
        const displayKeyword = suggestion.value.replace(/^[*-]+|[*-]+$/g, '');
        return {
            ...suggestion,
            label: `${ordinal}.${displayKeyword}`,
            value: `${ordinal}.${suggestion.value}`
        };
    });
};

export const getGiveRecipientSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => {
    const orderedCharacters = characters
        .map((source, index) => ({
            source,
            index,
            priority: getAllyPriority(source)
                ?? (typeof source !== 'string' && (source.pc === true || source.pc === 1) ? 1 : 2)
        }))
        .sort((left, right) => left.priority - right.priority || left.index - right.index)
        .map(entry => entry.source);
    return getRoomTargetSuggestions(orderedCharacters, [], 'characters', selfName);
};

export const getAssistTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => [
    makeCommandTargetSuggestion('Blank Target', BLANK_TARGET_VALUE, 'source'),
    ...getRoomTargetSuggestions(characters, [], 'allies', selfName)
];

export const getGroupTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => {
    const allies = getRoomTargetSuggestions(characters, [], 'allies', selfName)
        .map(suggestion => ({ ...suggestion, meta: 'ally' }));
    const allyKeywords = new Set(allies.map(suggestion => suggestion.value.toLowerCase().replace(/^\d+\./, '')));
    const roomNpcs = characters.filter(source => (
        typeof source !== 'string' && normalizeOccupantType(source)?.toLowerCase() === 'npc'
    ));
    const npcs = getRoomTargetSuggestions(roomNpcs, [], 'characters', selfName)
        .filter(suggestion => !allyKeywords.has(suggestion.value.toLowerCase().replace(/^\d+\./, '')))
        .map(suggestion => ({ ...suggestion, meta: 'npc' }));

    return [
        makeCommandTargetSuggestion('Blank Target', BLANK_TARGET_VALUE, 'source'),
        ...allies,
        ...npcs
    ];
};

export const getRescueTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    selfName = ''
): CommandTargetSuggestion[] => [
    makeCommandTargetSuggestion('Blank Target', BLANK_TARGET_VALUE, 'source'),
    ...getRoomTargetSuggestions(characters, [], 'allies', selfName)
];

// --- Room Object Menu Helpers ---

export const getRoomObjectTargetsWithExit = (
    roomObjects: Array<string | GmcpOccupant>
): CommandTargetSuggestion[] => [
    ...getRoomTargetSuggestions([], roomObjects, 'objects'),
    makeCommandTargetSuggestion('Exit', 'exit', 'exit')
];

export const getRoomCorpseTargetSuggestions = (
    roomObjects: Array<string | GmcpOccupant>
): CommandTargetSuggestion[] => getRoomTargetSuggestions(
    [],
    roomObjects.filter(source => hasObjectTrait(source, 'trait-corpse')),
    'objects'
);
