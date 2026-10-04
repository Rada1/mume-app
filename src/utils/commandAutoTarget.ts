/**
 * @file commandAutoTarget.ts
 * @description Chooses the first viable room character for room-target commands.
 */

// --- Logic Section ---
import type { GmcpOccupant, GroupMember } from '../types';
import { getRescueTargetSuggestions, getRoomTargetSuggestions } from './commandSuggestionUtils';
import { BLANK_TARGET_VALUE, getCommandTargetMenuKind, isOffensiveTargetCommand } from './commandTargetUtils';

const ROOM_CHARACTER_MENU_KINDS = new Set(['room', 'room-spell', 'room-spell-with-extras', 'bash']);

export const getViableRoomCharacterTargets = (
    command: string,
    roomOccupants: GmcpOccupant[],
    characterName = '',
    groupMembers: GroupMember[] = []
): string[] => {
    const kind = getCommandTargetMenuKind(command);
    if (!kind || !ROOM_CHARACTER_MENU_KINDS.has(kind)) return [];
    if (/^rescue(?:\s|$)/i.test(command.trim())) {
        return getRescueTargetSuggestions(roomOccupants, characterName, groupMembers)
            .filter(suggestion => suggestion.value !== BLANK_TARGET_VALUE)
            .map(suggestion => suggestion.value);
    }
    const roomTargets = getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName);
    const suggestions = isOffensiveTargetCommand(command)
        ? roomTargets.filter(suggestion => suggestion.meta?.toLowerCase() !== 'ally')
        : roomTargets;
    return suggestions.map(suggestion => suggestion.value);
};

const AUTO_TARGET_CHIP_DISABLED_ZONES = ['bree', 'grey havens', 'fornost', 'rivendell', 'lorien'];

/** Whether the room's zone suppresses the automatic target chip. */
export const isAutoTargetChipDisabledZone = (zone: string | null | undefined): boolean => {
    const normalizedZone = (zone || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/^the\s+/, '');

    return AUTO_TARGET_CHIP_DISABLED_ZONES.some(disabledZone =>
        normalizedZone === disabledZone || normalizedZone.startsWith(`${disabledZone} `)
    );
};

export const getAutoRoomTarget = (
    command: string,
    roomOccupants: GmcpOccupant[],
    characterName = '',
    roomZone?: string | null,
    groupMembers: GroupMember[] = []
): string | null => {
    if (isAutoTargetChipDisabledZone(roomZone)) return null;
    return getViableRoomCharacterTargets(command, roomOccupants, characterName, groupMembers)[0] || null;
};
