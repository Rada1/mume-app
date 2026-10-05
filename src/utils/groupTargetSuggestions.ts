/** @file groupTargetSuggestions.ts — Build Group command targets from GMCP data. */

// --- Logic Section ---
import type { GroupMember, GmcpOccupant } from '../types';
import { getRoomTargetSuggestions, isTargetSuggestionMatch, type CommandTargetSuggestion } from './commandSuggestionUtils';

const normalize = (value: string | number | undefined): string => String(value ?? '').trim().toLowerCase();

export const isGroupMemberOccupant = (entity: string | GmcpOccupant, groupMembers: GroupMember[]): boolean => {
    const groupIds = new Set(groupMembers.map(member => normalize(member.id)));
    const groupNames = new Set(groupMembers.flatMap(member => [normalize(member.name), normalize(member.label)]).filter(Boolean));
    const id = typeof entity === 'string' ? undefined : entity.id;
    const values = typeof entity === 'string'
        ? [entity]
        : [entity.name, entity.short, entity.shortdesc, entity.keyword];
    const names = values.map(value => normalize(value || '')).filter(Boolean);
    return (id !== undefined && groupIds.has(normalize(id))) || names.some(name => groupNames.has(name));
};

export const getNonGroupmateRoomTargetSuggestions = (
    roomCharacters: Array<string | GmcpOccupant>,
    groupMembers: GroupMember[],
    characterName: string
): CommandTargetSuggestion[] => getRoomTargetSuggestions(
    roomCharacters.filter(entity => !isGroupMemberOccupant(entity, groupMembers)),
    [],
    'characters',
    characterName
);

export const isGroupMemberTarget = (
    target: string,
    roomCharacters: GmcpOccupant[],
    groupMembers: GroupMember[],
    characterName = ''
): boolean => {
    const normalizedTarget = normalize(target).replace(/^\d+\./, '').replace(/^[*-]+|[*-]+$/g, '');
    const matchesGroupName = groupMembers.some(member => [member.name, member.label]
        .some(name => normalize(name).replace(/\s+/g, '-') === normalizedTarget));
    const groupedCharacters = roomCharacters.filter(entity => isGroupMemberOccupant(entity, groupMembers));
    const roomGroupmateSuggestions = getRoomTargetSuggestions(groupedCharacters, [], 'characters', characterName);
    return matchesGroupName || roomGroupmateSuggestions.some(suggestion => isTargetSuggestionMatch(suggestion, target));
};

const GROUP_DETAIL_LABELS: Record<string, string> = {
    'hp-string': 'Health',
    'mana-string': 'Mana',
    'mp-string': 'Movement',
    maxhp: 'Max HP',
    maxmana: 'Max mana',
    maxmoves: 'Max moves',
};

const isHiddenGroupDetail = (key: string): boolean => ['id', 'mapid'].includes(key.toLowerCase().replace(/[-_\s]/g, ''));

const formatDetailLabel = (key: string): string => GROUP_DETAIL_LABELS[key]
    || key.replace(/[-_]/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

const formatDetailValue = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'boolean') return value ? 'Yes' : null;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'false') return null;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'true') return 'Yes';
    return String(value);
};

const getGroupDetails = (member: GroupMember): Array<{ label: string; value: string }> => Object.entries(member)
    .filter(([key]) => key !== 'name' && key !== 'label' && !isHiddenGroupDetail(key))
    .flatMap(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            return Object.entries(value).flatMap(([nestedKey, nestedValue]) => {
                if (isHiddenGroupDetail(nestedKey)) return [];
                const formattedValue = formatDetailValue(nestedValue);
                return formattedValue ? [{ label: formatDetailLabel(nestedKey), value: formattedValue }] : [];
            });
        }
        const formattedValue = formatDetailValue(value);
        return formattedValue ? [{ label: formatDetailLabel(key), value: formattedValue }] : [];
    });

// --- Suggestion Section ---
export const getGroupSelectionSuggestions = (
    groupMembers: GroupMember[],
    roomCharacters: GmcpOccupant[],
    roomItems: GmcpOccupant[],
    characterName: string
): CommandTargetSuggestion[] => {
    const memberSuggestions = groupMembers.map(member => ({
        key: `group-member-${member.id}`,
        label: member.name || member.label || String(member.id),
        value: member.name || member.label || String(member.id),
        meta: 'group-member',
        details: getGroupDetails(member),
    }));
    const roomSuggestions = [
        ...getNonGroupmateRoomTargetSuggestions(roomCharacters, groupMembers, characterName),
        ...getRoomTargetSuggestions([], roomItems.filter(entity => !isGroupMemberOccupant(entity, groupMembers)), 'objects'),
    ];

    return [...memberSuggestions, ...roomSuggestions];
};

// --- Give Recipient Ordering ---
export const getGiveRecipientNames = (
    roomPlayers: Array<string | GmcpOccupant>,
    roomNpcs: Array<string | GmcpOccupant>,
    groupMembers: GroupMember[]
): string[] => {
    const groupIds = new Set(groupMembers.map(member => normalize(member.id)));
    const groupNames = new Set(groupMembers.flatMap(member => [normalize(member.name), normalize(member.label)]).filter(Boolean));
    const candidates = [
        ...roomPlayers.map((source, index) => ({ source, kindPriority: 1, index })),
        ...roomNpcs.map((source, index) => ({ source, kindPriority: 2, index: roomPlayers.length + index }))
    ].flatMap(candidate => {
        const { source } = candidate;
        const name = typeof source === 'string'
            ? source
            : source.name || source.shortdesc || source.short || source.keyword || '';
        if (!name) return [];

        const aliases = typeof source === 'string'
            ? [normalize(source)]
            : [source.name, source.shortdesc, source.short, source.keyword].map(value => normalize(value)).filter(Boolean);
        const matchesGroupId = typeof source !== 'string'
            && source.id !== undefined
            && groupIds.has(normalize(source.id));
        const isGroupMember = matchesGroupId || aliases.some(alias => groupNames.has(alias));

        return [{
            name,
            priority: isGroupMember ? 0 : candidate.kindPriority,
            index: candidate.index
        }];
    }).sort((left, right) => left.priority - right.priority || left.index - right.index);

    const seen = new Set<string>();
    return candidates.flatMap(({ name }) => {
        const key = normalize(name);
        if (seen.has(key)) return [];
        seen.add(key);
        return [name];
    });
};
