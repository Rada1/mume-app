/** @file entityCountPrompt.ts — Recognizes internal entity-count prompt lines. */

// --- Logic Section ---
export function parseEntityCountPrompt(text: string): { kind: string; count: string }[] | null {
    // Ordinary game output overwhelmingly does not start with this marker. Avoid
    // allocating a match iterator and array for every retained log line.
    if (!text.startsWith('[Player:') && !text.startsWith('[NPC:') && !text.startsWith('[Object:')) return null;
    const matches = [...text.matchAll(/\[(Player|NPC|Object):\s*(\d+)\]/g)];
    if (matches.length === 0 || matches.map(match => match[0]).join('') !== text) return null;
    return matches.map(([, kind, count]) => ({ kind, count }));
}
