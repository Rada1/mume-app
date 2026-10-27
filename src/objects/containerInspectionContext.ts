/** @file containerInspectionContext.ts — Container inspection headings describe a source, not a room arrival. */
import { stripAnsiCodes } from '../utils/ansi';
import type { EntityLocation } from '../types';

// --- Container heading context ---
const headingText = (line: string): string => stripAnsiCodes(line).replace(/<[^>]*>/g, '').trim();

export const isContainerInspectionHeader = (line: string): boolean =>
    /^in\s+(?:your|the|an?|some)\s+.+:\s*$/i.test(headingText(line));

export const getPersonalContainerHeaderLocation = (line: string): EntityLocation | undefined => {
    const text = headingText(line);
    if (!/^in\s+your\s+.+:\s*$/i.test(text)) return undefined;
    return /\((?:worn|wielded|held)\b[^)]*\)/i.test(text) ? 'worn' : 'carried';
};
