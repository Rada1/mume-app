/**
 * @file combatUtils.ts
 * @description Shared combat parsing and combatant-name normalization helpers.
 */

import { CombatHealthStatus } from '../types';

// --- Logic Section ---

/**
 * Normalizes MUME combatant labels so prompt text and GMCP names can match.
 */
export const normalizeCombatantName = (name: string | null | undefined): string => {
    if (!name) return '';

    return name
        .replace(/\s*\([^)]{1,12}\)\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Parses health status from a given string.
 */
export const findStatus = (str: string | undefined): CombatHealthStatus | null => {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes('healthy') || lower.includes('fine')) return 'Healthy';
    if (lower.includes('hurt')) return 'Hurt';
    if (lower.includes('wounded')) return 'Wounded';
    if (lower.includes('bad')) return 'Bad';
    if (lower.includes('awful')) return 'Awful';
    if (lower.includes('dying')) return 'Dying';
    if (lower.includes('stunned')) return 'Stunned';
    return 'None';
};
