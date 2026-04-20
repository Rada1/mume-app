import { CombatHealthStatus } from '../types';

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
