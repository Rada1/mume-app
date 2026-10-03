/** @file roomItemDetection.ts — Identifies item tags and room-presence lines. */
import type { Token } from '../../types';

// --- Logic Section ---
export interface RoomSurfaceItemList {
    surface: string;
    items: string[];
    pendingItem: string | null;
}

export const parseRoomSurfaceItemList = (textOnly: string): RoomSurfaceItemList | null => {
    const line = textOnly.trim();
    const contentsMatch = line.match(/^on\s+(?:the\s+)?([^,]+),\s*there\s+(?:is|are)\s+(.+?)\s*$/i);
    if (!contentsMatch) return null;

    const listText = contentsMatch[2].replace(/[.!?]\s*$/, '').trim();
    const complete = /[.!?]\s*$/.test(contentsMatch[2]);
    const parts = listText
        .replace(/,\s+and\s+/gi, ', ')
        .split(/,\s*|\s+and\s+/i)
        .map(item => item.trim().replace(/^(?:a|an|some|the)\s+/i, ''))
        .filter(Boolean);
    const pendingItem = complete ? null : (parts.pop() || null);
    return { surface: contentsMatch[1].trim(), items: parts, pendingItem };
};

export const isRoomItemPresenceLine = (
    textOnly: string,
    cleanLine: string,
    isRoomContext = false
): boolean => isRoomContext
    || /<room\b/i.test(cleanLine)
    || /\b(?:(?:is|are)\s+)?(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit|standing|stands|waiting|waits)\s+here\b/i.test(textOnly)
    || /^there\s+(?:is|are)\s+.+?\s+(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit)\s+on\s+(?:the\s+)?ground\b/i.test(textOnly.trim())
    || /\b(?:is|are|has been left|have been left)\s+here\b/i.test(textOnly)
    || /^there\s+are\s+.+\s+here\b/i.test(textOnly.trim())
    || parseRoomSurfaceItemList(textOnly) !== null;

export const getPlainRoomObjectDescription = (textOnly: string): string | null => {
    const line = textOnly.trim();
    const singleItem = line.match(/^(?:a|an|some)\s+(.+?)\s+(?:(?:is\s+)?(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit|standing|stands|waiting|waits|is))\s+here(?:\s+\([^)]*\))?[.!]?$/i);
    const countedItems = line.match(/^there\s+(?:are|is)\s+(.+?)\s+here(?:\s+\([^)]*\))?[.!]?$/i);
    const groundItem = line.match(/^there\s+(?:is|are)\s+(.+?)\s+(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit)\s+on\s+(?:the\s+)?ground(?:\s+\([^)]*\))?[.!]?$/i);
    return singleItem?.[1] || countedItems?.[1] || groundItem?.[1] || null;
};

export const getTaggedRoomObjectNames = (cleanLine: string): string[] => {
    const decodedLine = cleanLine
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');
    const objectMatches = Array.from(decodedLine.matchAll(/<object\b[^>]*>(.*?)<\/object>/gis));
    return objectMatches
        .filter(match => !/<character\b[^>]*>/i.test(decodedLine.slice(0, match.index)))
        .map(match => match[1]);
};

export const getRoomObjectEntityNames = (tokens: Token[]): string[] => {
    let characterSeen = false;
    return tokens.flatMap(token => {
        if (token.type !== 'entity') return [];
        const kind = token.metadata?.kind?.toLowerCase();
        if (['character', 'player', 'npc', 'enemy', 'neutral', 'ally'].includes(kind || '')) {
            characterSeen = true;
            return [];
        }
        if (kind !== 'object' || token.metadata?.location !== 'room' || characterSeen) return [];
        return [token.content];
    });
};
