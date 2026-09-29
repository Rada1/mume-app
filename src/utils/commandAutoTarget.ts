/**
 * @file commandAutoTarget.ts
 * @description Chooses the first viable room character for room-target commands.
 */

// --- Logic Section ---
import type { GmcpOccupant } from '../types';
import { getRoomTargetSuggestions } from './commandSuggestionUtils';
import { getCommandTargetMenuKind } from './commandTargetUtils';

const ROOM_CHARACTER_MENU_KINDS = new Set(['room', 'room-spell', 'room-spell-with-extras', 'bash']);

export const getViableRoomCharacterTargets = (
    command: string,
    roomOccupants: GmcpOccupant[],
    characterName = ''
): string[] => {
    const kind = getCommandTargetMenuKind(command);
    if (!kind || !ROOM_CHARACTER_MENU_KINDS.has(kind)) return [];
    return getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName).map(suggestion => suggestion.value);
};

export const getAutoRoomTarget = (command: string, roomOccupants: GmcpOccupant[], characterName = ''): string | null =>
    getViableRoomCharacterTargets(command, roomOccupants, characterName)[0] || null;
