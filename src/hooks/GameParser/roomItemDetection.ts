/** @file roomItemDetection.ts — Identifies item tags and room-presence lines. */
import type { Token } from '../../types';

// --- Logic Section ---
export const isRoomItemPresenceLine = (
    textOnly: string,
    cleanLine: string,
    isRoomContext = false
): boolean => isRoomContext
    || /<room\b/i.test(cleanLine)
    || /\b(?:(?:is|are)\s+)?(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit|standing|stands|waiting|waits)\s+here\b/i.test(textOnly)
    || /\b(?:is|are|has been left|have been left)\s+here\b/i.test(textOnly)
    || /^there\s+are\s+.+\s+here\b/i.test(textOnly.trim());

export const getPlainRoomObjectDescription = (textOnly: string): string | null => {
    const line = textOnly.trim();
    const singleItem = line.match(/^(?:a|an|some)\s+(.+?)\s+(?:(?:is\s+)?(?:lying|lies|lie|resting|rests|rest|sitting|sits|sit|standing|stands|waiting|waits|is))\s+here(?:\s+\([^)]*\))?[.!]?$/i);
    const countedItems = line.match(/^there\s+(?:are|is)\s+(.+?)\s+here(?:\s+\([^)]*\))?[.!]?$/i);
    return singleItem?.[1] || countedItems?.[1] || null;
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
