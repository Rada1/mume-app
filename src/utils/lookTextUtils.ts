/**
 * @file lookTextUtils.ts
 * @description Shared parsing for "look"-style captured output (condition/equipment/description split).
 */

import { sanitizeMumeHtml } from './securityUtils';

export const stripHtml = (html: string): string => (
    html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
);

export const isConditionLine = (html: string): boolean => {
    const text = stripHtml(html).toLowerCase();
    return /\bis\s+in\s+(?:an?\s+)?(?:excellent|perfect|good|fine|fair|bad|awful|terrible|poor|wounded|hurt|healthy|dying)\s+condition\.?$/.test(text) ||
        /\blooks\s+(?:excellent|perfect|healthy|fine|hurt|wounded|bad|awful|terrible|poor|dead|dying)\b/.test(text);
};

// Matches the line that introduces a mob's worn/wielded gear, e.g.
// "A Morgundul orc-guard is using:" — everything after it is equipment.
export const isEquipmentHeader = (html: string): boolean => {
    const text = stripHtml(html).toLowerCase();
    return /\bis\s+(?:using|wearing|wielding|carrying|equipped with)\s*:?\s*$/.test(text);
};

export const sanitizeLines = (lines?: string[]): string[] => (
    (lines || []).map(line => sanitizeMumeHtml(line)).filter(Boolean)
);

export interface SplitLookLines {
    description: string[];
    condition: string[];
    equipment: string[];
}

export const splitLookLines = (lines?: string[]): SplitLookLines => {
    const description: string[] = [];
    const condition: string[] = [];
    const equipment: string[] = [];
    let inEquipment = false;

    sanitizeLines(lines).forEach(line => {
        if (isConditionLine(line)) {
            condition.push(line);
            return;
        }
        if (!inEquipment && isEquipmentHeader(line)) {
            // Drop the "is using:" header; the equipment section has its own label.
            inEquipment = true;
            return;
        }
        if (inEquipment) equipment.push(line);
        else description.push(line);
    });

    return { description, condition, equipment };
};
