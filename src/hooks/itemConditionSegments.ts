/** @file itemConditionSegments.ts — Shares equipment condition colors across complete and split log text. */
import type { ItemConditionSegment, ItemConditionTextProps } from '../types';
import { classifyItemCondition } from '../utils/itemTier';

// --- Logic Section ---
export const getItemConditionSegments = ({ content, source = content, offset = 0 }: ItemConditionTextProps): ItemConditionSegment[] => {
    const segments: ItemConditionSegment[] = [];
    let cursor = 0;
    for (const match of source.matchAll(/\([^()]*\)/g)) {
        const { state } = classifyItemCondition(match[0]);
        if (!state) continue;
        const start = Math.max(0, match.index - offset);
        const end = Math.min(content.length, match.index + match[0].length - offset);
        if (end <= start) continue;
        if (start > cursor) segments.push({ text: content.slice(cursor, start) });
        segments.push({ text: content.slice(start, end), state });
        cursor = end;
    }
    if (cursor < content.length) segments.push({ text: content.slice(cursor) });
    return segments;
};
