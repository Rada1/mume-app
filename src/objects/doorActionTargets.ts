/** @file doorActionTargets.ts — Room exits and door metadata shared by target views. */
import type { CommandActionTargetEntry } from './commandActionTargetModel';

// --- Room Exit Projection ---
const EXIT_DIRECTIONS: Record<string, string> = {
    n: 'North', ne: 'Northeast', e: 'East', se: 'Southeast',
    s: 'South', sw: 'Southwest', w: 'West', nw: 'Northwest', u: 'Up', d: 'Down'
};

const getDoorDetails = (value: unknown): { hasDoor: boolean; doorName?: string } | null => {
    if (value === false || value === null || value === undefined) return null;
    if (typeof value !== 'object') return typeof value === 'number' ? { hasDoor: false } : null;

    const exit = value as Record<string, unknown>;
    const doorName = typeof exit.doorName === 'string' ? exit.doorName
        : typeof exit.name === 'string' ? exit.name : undefined;
    const flags = Array.isArray(exit.flags) ? exit.flags.map(String) : [];
    const hasDoor = Boolean(doorName || exit.hasDoor || exit.door || exit.closed)
        || flags.some(flag => /door|gate|portcullis|secret|closed|locked/i.test(flag));
    return { hasDoor, doorName: hasDoor ? doorName : undefined };
};

export const getRoomExitActionTargets = (exits: Record<string, unknown>): CommandActionTargetEntry[] =>
    Object.entries(exits).flatMap(([direction, value]) => {
        const door = getDoorDetails(value);
        if (!door) return [];
        const normalizedDirection = direction.toLowerCase();
        return [{
            id: `room-exit:${direction}`,
            label: EXIT_DIRECTIONS[normalizedDirection] || `${direction.charAt(0).toUpperCase()}${direction.slice(1)}`,
            keyword: direction,
            context: `exit ${direction}`,
            category: 'cat-exit',
            group: 'objects',
            scope: 'room',
            hasDoor: door.hasDoor,
            doorName: door.doorName
        }];
    });
