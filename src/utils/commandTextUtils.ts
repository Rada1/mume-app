/**
 * @file commandTextUtils.ts
 * @description Helpers for normalizing command text before it reaches MUME.
 */

// --- Logic Section ---

export const decodeCommandEntities = (command: string): string => command
    .replace(/&amp;/gi, '&')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&quot;|&#34;|&#x22;/gi, '"');
