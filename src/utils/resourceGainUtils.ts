/**
 * @file resourceGainUtils.ts
 * @description Parses XP and TP gain lines for inline log badges.
 */

// --- Logic Section ---
import { ResourceGain } from '../types';

const NUMBER_TEXT = String.raw`([\d,]+)`;

export const parseResourceGainLine = (text: string): ResourceGain | null => {
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
    const xpMatch = clean.match(new RegExp(`\\byou receive ${NUMBER_TEXT} experience(?: points?)?\\b`, 'i'));
    if (xpMatch) {
        return {
            kind: 'xp',
            amount: parseInt(xpMatch[1].replace(/,/g, ''), 10)
        };
    }

    const tpMatch = clean.match(new RegExp(`\\byou (?:receive|gain) ${NUMBER_TEXT} (?:tp|tps|travel points?)\\b`, 'i'));
    if (tpMatch) {
        return {
            kind: 'tp',
            amount: parseInt(tpMatch[1].replace(/,/g, ''), 10)
        };
    }

    return null;
};
