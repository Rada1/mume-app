/**
 * @file commandActionTargetModel.ts
 * @description Combines room entities, group members, and personal gear for the command action picker.
 */

import type { DrawerLine, GearRow, GmcpOccupant, GroupMember } from '../types';
import { normalizeInlineCategoryId } from '../utils/inlineCategoryAxes';
import { sortWornGearRows, toGearRow, toNearbyGearRows } from '../utils/gearPanelUtils';
import { getRoomEntityMenuEntriesByKind } from './roomEntityMenuModel';
import { isGroupMemberOccupant } from '../utils/groupTargetSuggestions';
import { getRoomExitActionTargets } from './doorActionTargets';
import { getGearObjectCandidates, getObjectSelectors } from './objectTargetModel';

// --- Type Section ---
export type CommandActionTargetGroup = 'players' | 'npcs' | 'objects' | 'worn' | 'inventory' | 'group' | 'weather';

export interface CommandActionTargetEntry {
    id: string;
    label: string;
    keyword: string;
    context: string;
    category: string;
    group: CommandActionTargetGroup;
    scope: 'room' | 'self' | 'remote' | 'global';
    gearRow?: GearRow;
    groupMember?: GroupMember;
    parentNoun?: string;
    parentId?: string;
    hasDoor?: boolean;
    doorName?: string;
}

type RoomSource = string | GmcpOccupant;
type GearLocation = 'worn' | 'inventory';

// --- Logic Section ---
const toGearEntries = (lines: DrawerLine[], location: GearLocation, selectors: Map<DrawerLine, string>): CommandActionTargetEntry[] => {
    const rows = lines.map(toGearRow).filter((row): row is GearRow => row !== null);
    return (location === 'worn' ? sortWornGearRows(rows) : rows).map(row => ({
        id: row.line.entityId || row.line.stableId || row.line.id,
        label: location === 'worn' && row.slotLabel ? `${row.slotLabel}: ${row.name}` : row.name,
        keyword: selectors.get(row.line) || row.noun,
        context: selectors.get(row.line) || row.noun,
        category: location === 'worn' ? 'cat-worn-object' : 'cat-inventory-object',
        group: location,
        scope: 'self',
        gearRow: row
    }));
};

export const getCommandRoomActionTargets = (
    players: RoomSource[],
    npcs: RoomSource[],
    roomObjects: RoomSource[],
    groupMembers: GroupMember[] = [],
    roomExits: Record<string, unknown> = {}
): CommandActionTargetEntry[] => {
    const nearby = toNearbyGearRows(roomObjects.map(source => typeof source === 'string' ? { name: source } : source));
    const allRoomEntries = getRoomEntityMenuEntriesByKind(players, npcs, roomObjects);
    const roomCharacters = allRoomEntries.filter(entry => entry.group !== 'objects');
    const groupRoomEntry = (member: GroupMember) => roomCharacters.find(entry => {
        const roomId = entry.id.replace(/^roomchars:/, '');
        return isGroupMemberOccupant({ id: roomId, name: entry.context, short: entry.label, keyword: entry.keyword }, [member]);
    });
    const groupEntries: CommandActionTargetEntry[] = groupMembers.flatMap(member => {
        const roomEntry = groupRoomEntry(member);
        if (roomEntry) return [];
        const name = member.name || member.label || String(member.id);
        return [{
            id: `command-group-member:${member.id}`,
            label: name,
            keyword: name,
            context: name,
            category: 'cat-ally-remote',
            group: 'group',
            scope: 'remote',
            groupMember: member
        }];
    });
    const roomEntries = allRoomEntries.map(entry => {
        if (entry.group === 'objects') return entry;
        const member = groupMembers.find(candidate => {
            const roomId = entry.id.replace(/^roomchars:/, '');
            return isGroupMemberOccupant({ id: roomId, name: entry.context, short: entry.label, keyword: entry.keyword }, [candidate]);
        });
        return member ? { ...entry, groupMember: member } : entry;
    });
    return [
    ...roomEntries.map(entry => ({
        ...entry,
        scope: 'room' as const,
        gearRow: entry.group === 'objects' ? nearby.find(row => row.noun === entry.context) || toGearRow({ id: entry.id, text: entry.label, html: entry.label, isItem: true, context: entry.context }) || undefined : undefined
    })),
    ...groupEntries,
    ...getRoomExitActionTargets(roomExits)
    ];
};

// --- Personal Gear Projection ---
export const getCommandGearActionTargets = (wornLines: DrawerLine[], inventoryLines: DrawerLine[]): CommandActionTargetEntry[] => {
    // Number against the complete gear snapshot, before any command filters its targets.
    const candidates = [...getGearObjectCandidates(inventoryLines, 'inventory'), ...getGearObjectCandidates(wornLines, 'worn')];
    const numbered = getObjectSelectors(candidates.map(candidate => ({
        ...candidate, keyword: candidate.keyword.replace(/^\d+\./, '')
    })), () => 'player-gear');
    const selectors = new Map<DrawerLine, string>();
    candidates.forEach((candidate, index) => {
        const explicit = /^\d+\./.test(candidate.keyword) ? candidate.keyword : undefined;
        const selector = numbered[index] || candidate.keyword;
        selectors.set(candidate.source as DrawerLine, /^\d+\./.test(selector) ? selector : explicit || selector);
    });
    return [...toGearEntries(wornLines, 'worn', selectors), ...toGearEntries(inventoryLines, 'inventory', selectors)];
};

export const getCommandActionTargetEntries = (
    players: RoomSource[], npcs: RoomSource[], roomObjects: RoomSource[],
    wornLines: DrawerLine[], inventoryLines: DrawerLine[], groupMembers: GroupMember[] = [],
    roomExits: Record<string, unknown> = {}
): CommandActionTargetEntry[] => [
    ...getCommandRoomActionTargets(players, npcs, roomObjects, groupMembers, roomExits),
    ...getCommandGearActionTargets(wornLines, inventoryLines)
];

export const getGlobalWeatherActionTargets = (): CommandActionTargetEntry[] => [
    { id: 'command-weather-global', label: 'Precipitation / Clouds', keyword: 'global', context: 'global', category: 'cat-weather', group: 'weather', scope: 'global' },
    { id: 'command-weather-fog', label: 'Fog', keyword: 'fog', context: 'fog', category: 'cat-weather', group: 'weather', scope: 'global' }
];

// --- Room Selection Sections ---
const ROOM_TARGET_SECTIONS = [
    { id: 'npcs', label: 'NPCs' },
    { id: 'allies', label: 'Allies' },
    { id: 'enemies', label: 'Enemies' },
    { id: 'neutral', label: 'Neutral characters' },
    { id: 'mounts', label: 'Mounts' },
    { id: 'players', label: 'Players' },
    { id: 'objects', label: 'Objects' },
    { id: 'exits', label: 'Exits' }
] as const;

const getRoomTargetSection = (entry: CommandActionTargetEntry): string => {
    const category = normalizeInlineCategoryId(entry.category);
    if (category === 'cat-exit') return 'exits';
    if (entry.group === 'objects') return 'objects';
    if (category === 'cat-ally' || category === 'cat-ally-remote') return 'allies';
    if (category === 'cat-enemy') return 'enemies';
    if (category === 'cat-neutral') return 'neutral';
    if (category === 'cat-mount') return 'mounts';
    if (category === 'cat-npc') return 'npcs';
    return entry.group === 'players' ? 'players' : 'npcs';
};

export const getCommandRoomTargetGroups = (entries: CommandActionTargetEntry[]) => {
    const roomEntries = entries.filter(entry => entry.scope === 'room');
    return ROOM_TARGET_SECTIONS.map(section => ({
        ...section,
        entries: roomEntries.filter(entry => getRoomTargetSection(entry) === section.id)
    })).filter(section => section.entries.length > 0 || ['npcs', 'allies', 'enemies', 'objects'].includes(section.id));
};
