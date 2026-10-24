/** @file commandTreePreview.ts — Formats command tree drafts for the command bar preview. */
// --- Logic Section ---
const TARGET_PLACEHOLDER = /%n(?:\|[^\s]+)?|\$1/gi;

export const getCommandTreeBasePreview = (command: string): string => command
    .replace(TARGET_PLACEHOLDER, '')
    .replace(/%p/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

export const getCommandTreeTargetPreview = (command: string, target?: string, parentNoun?: string): string => command
    .replace(TARGET_PLACEHOLDER, target?.trim() || '<target>')
    .replace(/%p/gi, parentNoun?.trim() || '<container>')
    .replace(/\s+/g, ' ')
    .trim();
