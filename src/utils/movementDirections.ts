/**
 * @file movementDirections.ts
 * @description Shared normalization and display helpers for MUME movement directions.
 */

// --- Logic Section ---
export type MovementDirection = 'n' | 's' | 'e' | 'w' | 'u' | 'd' | 'ne' | 'nw' | 'se' | 'sw';

const directionMap: Record<string, MovementDirection> = {
    n: 'n',
    north: 'n',
    s: 's',
    south: 's',
    e: 'e',
    east: 'e',
    w: 'w',
    west: 'w',
    u: 'u',
    up: 'u',
    d: 'd',
    down: 'd',
    ne: 'ne',
    northeast: 'ne',
    nw: 'nw',
    northwest: 'nw',
    se: 'se',
    southeast: 'se',
    sw: 'sw',
    southwest: 'sw'
};

const directionLabels: Record<MovementDirection, string> = {
    n: 'north',
    s: 'south',
    e: 'east',
    w: 'west',
    u: 'up',
    d: 'down',
    ne: 'northeast',
    nw: 'northwest',
    se: 'southeast',
    sw: 'southwest'
};

const directionArrows: Record<MovementDirection, string> = {
    n: '\u2191',
    s: '\u2193',
    e: '\u2192',
    w: '\u2190',
    ne: '\u2197',
    nw: '\u2196',
    se: '\u2198',
    sw: '\u2199',
    u: '\u21c8',
    d: '\u21ca'
};

export const normalizeMovementDirection = (dir: string | null | undefined): MovementDirection | null => {
    const key = dir?.trim().toLowerCase();
    return key ? directionMap[key] || null : null;
};

export const getMovementDirectionLabel = (dir: string): string => {
    const normalized = normalizeMovementDirection(dir);
    return normalized ? directionLabels[normalized] : dir;
};

export const formatMovementArrow = (dir: string | null | undefined): string => {
    const normalized = normalizeMovementDirection(dir);
    return normalized ? directionArrows[normalized] : '';
};
