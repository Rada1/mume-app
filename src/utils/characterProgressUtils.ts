/**
 * @file characterProgressUtils.ts
 * @description Pure utility functions for formatting XP & TP, calculating session gains,
 * and detecting leveling bottleneck states.
 */

// --- Types Section ---
export type LevelBlocker = 'none' | 'xp' | 'tp' | 'both';

export interface FloatingGainItem {
    id: string;
    type: 'xp' | 'tp';
    amount: number;
}

// --- Logic Section ---

/**
 * Format numbers in full with commas (e.g. 12605497 -> "12,605,497").
 */
export const formatFullNumber = (val: number | null | undefined): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '0';
    return val.toLocaleString();
};

/**
 * Format compact numbers for badges (e.g. 12,605,497 -> "12.6M", 113,711 -> "113.7k", 540 -> "540").
 */
export const formatCompactProgNumber = (val: number | null | undefined): string => {
    if (val === null || val === undefined || !Number.isFinite(val)) return '0';
    if (val >= 1_000_000) {
        const millions = val / 1_000_000;
        return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
    }
    if (val >= 10_000) {
        const thousands = val / 1_000;
        return `${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}k`;
    }
    return val.toLocaleString();
};

/**
 * Detects whether XP, TP, or both are blocking character advancement.
 */
export const determineLevelBlocker = (
    tnl: number,
    tpnl: number
): { blocker: LevelBlocker; statusText: string; statusClass: string } => {
    const xpMet = tnl <= 0;
    const tpMet = tpnl <= 0;

    if (xpMet && tpMet) {
        return {
            blocker: 'none',
            statusText: 'READY TO LEVEL',
            statusClass: 'status-ready'
        };
    }
    if (xpMet && !tpMet) {
        return {
            blocker: 'tp',
            statusText: 'BLOCKED BY TP',
            statusClass: 'status-blocked-tp'
        };
    }
    if (!xpMet && tpMet) {
        return {
            blocker: 'xp',
            statusText: 'BLOCKED BY XP',
            statusClass: 'status-blocked-xp'
        };
    }
    return {
        blocker: 'both',
        statusText: 'PROGRESSING',
        statusClass: 'status-progressing'
    };
};
