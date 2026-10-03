/**
 * @file commandAutoTarget.ts
 * @description Chooses the first viable room character for room-target commands.
 */

// --- Logic Section ---
import type { GmcpOccupant } from '../types';
import { getRoomTargetSuggestions } from './commandSuggestionUtils';
import { getCommandTargetMenuKind, isOffensiveTargetCommand } from './commandTargetUtils';

const ROOM_CHARACTER_MENU_KINDS = new Set(['room', 'room-spell', 'room-spell-with-extras', 'bash']);

export interface CombatTargetIdentity {
    id: string | number | null;
    name: string | null;
}

const normalizeCombatTargetName = (value: string): string => value
    .trim()
    .toLowerCase()
    .replace(/^\d+\./, '')
    .replace(/^[*-]+|[*-]+$/g, '')
    .replace(/^(?:a|an|the|some)\s+/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');

const findCombatTargetSuggestion = (
    suggestions: ReturnType<typeof getRoomTargetSuggestions>,
    occupants: GmcpOccupant[],
    opponent: CombatTargetIdentity | null | undefined
): ReturnType<typeof getRoomTargetSuggestions>[number] | null => {
    if (!opponent || (opponent.id == null && !opponent.name)) return null;

    let matchIndex = -1;
    if (opponent.id != null) {
        const id = String(opponent.id);
        const occupantIndex = occupants.findIndex(occupant => String(occupant.id) === id);
        if (occupantIndex >= 0) {
            const keyPrefix = `${occupants[occupantIndex].id ?? occupantIndex}-`;
            matchIndex = suggestions.findIndex(suggestion => suggestion.key.startsWith(keyPrefix));
        }
    }

    if (matchIndex < 0 && opponent.name) {
        const targetName = normalizeCombatTargetName(opponent.name);
        matchIndex = suggestions.findIndex(suggestion => [suggestion.label, suggestion.value]
            .some(value => normalizeCombatTargetName(value) === targetName));
        if (matchIndex < 0) {
            const targetWord = targetName.split(' ').pop();
            const candidates = suggestions.flatMap((suggestion, index) => {
                const names = [suggestion.label, suggestion.value].map(normalizeCombatTargetName);
                return names.some(name => name.split(' ').pop() === targetWord) ? [index] : [];
            });
            if (candidates.length === 1) matchIndex = candidates[0];
        }
    }

    return matchIndex < 0 ? null : suggestions[matchIndex];
};

const prioritizeCombatTarget = (
    suggestions: ReturnType<typeof getRoomTargetSuggestions>,
    occupants: GmcpOccupant[],
    opponent: CombatTargetIdentity | null | undefined
) => {
    const target = findCombatTargetSuggestion(suggestions, occupants, opponent);
    if (!target) return suggestions;
    const matchIndex = suggestions.indexOf(target);
    return matchIndex <= 0
        ? suggestions
        : [target, ...suggestions.slice(0, matchIndex), ...suggestions.slice(matchIndex + 1)];
};

export const getCombatRoomTarget = (
    command: string,
    roomOccupants: GmcpOccupant[],
    characterName = '',
    combatOpponent?: CombatTargetIdentity | null
): string | null => {
    const kind = getCommandTargetMenuKind(command);
    if (!kind || !ROOM_CHARACTER_MENU_KINDS.has(kind)) return null;
    const suggestions = getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName);
    const viableSuggestions = isOffensiveTargetCommand(command)
        ? suggestions.filter(suggestion => suggestion.meta?.toLowerCase() !== 'ally')
        : suggestions;
    return findCombatTargetSuggestion(viableSuggestions, roomOccupants, combatOpponent)?.value || null;
};

export const getViableRoomCharacterTargets = (
    command: string,
    roomOccupants: GmcpOccupant[],
    characterName = '',
    combatOpponent?: CombatTargetIdentity | null
): string[] => {
    const kind = getCommandTargetMenuKind(command);
    if (!kind || !ROOM_CHARACTER_MENU_KINDS.has(kind)) return [];
    const roomTargets = getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName);
    const suggestions = isOffensiveTargetCommand(command)
        ? roomTargets.filter(suggestion => suggestion.meta?.toLowerCase() !== 'ally')
        : roomTargets;
    return prioritizeCombatTarget(suggestions, roomOccupants, combatOpponent)
        .map(suggestion => suggestion.value);
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
    combatOpponent?: CombatTargetIdentity | null
): string | null => {
    if (isAutoTargetChipDisabledZone(roomZone)) return null;
    return getViableRoomCharacterTargets(command, roomOccupants, characterName, combatOpponent)[0] || null;
};
