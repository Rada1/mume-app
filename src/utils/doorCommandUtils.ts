/** @file doorCommandUtils.ts — Shared checks for commands that require a room door. */
import { getRoomExitActionTargets } from '../objects/doorActionTargets';
import type { CommandTargetSuggestion } from '../objects/targetSuggestionTypes';

// --- Logic Section ---
export const isDoorPresenceSpellCommand = (command: string): boolean => {
    const normalized = command.trim().toLowerCase().replace(/^(?:cast|c|commune)\s+/, '');
    const quotedSpell = normalized.match(/^(['"])(.*?)\1/)?.[2];
    return /^(?:block door|break door)(?:\s|$)/.test(quotedSpell || normalized);
};

export const getRoomDoorSpellTargets = (exits: Record<string, unknown>): CommandTargetSuggestion[] =>
    getRoomExitActionTargets(exits).filter(entry => entry.hasDoor === true).map(entry => ({
        key: entry.id, label: entry.doorName ? `${entry.label}: ${entry.doorName}` : entry.label,
        value: entry.keyword, meta: 'exit', category: 'cat-exit'
    }));
