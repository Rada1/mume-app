/**
 * @file playerCountUtils.ts
 * @description Utilities to parse and derive the online player count from who command output and whoList.
 */

import { DrawerLine } from '../types';
import { getWhoPlayerNames } from './chatWindowUtils';

// --- Logic Section ---

/**
 * Extracts a numeric online player count from raw captured who lines.
 * Checks for server summary phrases (e.g., "28 players on.", "1 player on.", "Visible players: 14")
 * and falls back to counting non-header player rows.
 */
export const parsePlayerCountFromLines = (lines: DrawerLine[]): number => {
    if (!lines || lines.length === 0) return 0;

    // 1. Check for server summary lines like "28 players on." or "visible players: 14"
    for (const line of lines) {
        const text = (line.text || '').trim();
        const match =
            text.match(/(\d+)\s+players?\s+on\b/i) ||
            text.match(/visible\s+players?(?:\s+in\s+the\s+world)?:\s*(\d+)/i) ||
            text.match(/(\d+)\s+visible\s+players?\b/i) ||
            text.match(/\[\s*(\d+)\s+players?\s+on\s*\]/i);
        if (match && match[1]) {
            const count = parseInt(match[1], 10);
            if (!isNaN(count) && count > 0) {
                return count;
            }
        }
    }

    // 2. Fall back to non-header player lines
    const playerLines = lines.filter(l => !l.isHeader && l.text && l.text.trim().length > 0);
    return playerLines.length;
};

/**
 * Derives the online player count using whoLines or whoList.
 */
export const getOnlinePlayerCount = (whoList?: string[], whoLines?: DrawerLine[]): number => {
    // 1. Check whoLines first (gives accurate server totals even when invisible players or opposite faction are hidden)
    if (whoLines && whoLines.length > 0) {
        const lineCount = parsePlayerCountFromLines(whoLines);
        if (lineCount > 0) return lineCount;
    }

    // 2. Check whoList array of player names
    if (whoList && whoList.length > 0) {
        const names = getWhoPlayerNames(whoList);
        if (names.length > 0) return names.length;
    }

    return 0;
};
