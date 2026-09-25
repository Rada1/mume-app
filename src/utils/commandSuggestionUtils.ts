/**
 * @file commandSuggestionUtils.ts
 * @description Helper functions and interfaces for command, spell, and target suggestion processing.
 */

import type { GmcpOccupant } from '../types';
import { getOccupantCommandKeyword } from './occupantKeywordUtils';

// --- Type Section ---

export interface CommandTargetSuggestion {
    key: string;
    label: string;
    value: string;
    meta: string;
}

export interface CommandTextParts {
    leading: string;
    token: string;
    suffix: string;
    isValid: boolean;
    autocomplete: string;
}

// --- Logic Section ---

export const getRoomTargetSuggestions = (
    characters: Array<string | GmcpOccupant>,
    objects: Array<string | GmcpOccupant>,
    kind: 'characters' | 'allies' | 'objects',
    selfName = ''
): CommandTargetSuggestion[] => {
    const sources = kind === 'objects' ? objects : characters;
    return sources.flatMap((source, index) => {
        const occupant: GmcpOccupant = typeof source === 'string' ? { name: source } : source;
        const type = (occupant.type || '').toLowerCase();
        if (kind === 'allies' && (type === 'enemy' || type === 'npc' || occupant.pc === false || occupant.pc === 0)) return [];
        const label = occupant.short || occupant.shortdesc || occupant.name || occupant.keyword || '';
        if (!label || (selfName && label.toLowerCase() === selfName.toLowerCase())) return [];
        const value = getOccupantCommandKeyword(occupant, label);
        if (!value) return [];
        return [{ key: `${occupant.id ?? index}-${value}`, label, value, meta: type || kind }];
    });
};

/**
 * Replaces or appends the target argument for a command string.
 */
export const replaceCommandArgumentToken = (command: string, target: string): string => {
    const leadingWhitespace = command.match(/^\s*/)?.[0] ?? '';
    const leadingTrimmed = command.trimStart();
    const commandMatch = /^(\S+)(\s*)([\s\S]*)$/.exec(leadingTrimmed);
    if (!commandMatch) return command;

    const commandToken = commandMatch[1];
    const spacing = commandMatch[2] || ' ';
    const argumentText = commandMatch[3] || '';
    const argumentLeading = argumentText.match(/^\s*/)?.[0] ?? '';
    const argumentRest = argumentText.slice(argumentLeading.length);
    const trailing = argumentRest.replace(/^\S*/, '');

    return `${leadingWhitespace}${commandToken}${spacing}${argumentLeading}${target}${trailing || ' '}`;
};

/**
 * Maps suggestion index to 1-9 or 0 hotkey string.
 */
export const suggestionHotkeyForIndex = (index: number): string | null => {
    if (index < 9) return String(index + 1);
    if (index === 9) return '0';
    return null;
};
