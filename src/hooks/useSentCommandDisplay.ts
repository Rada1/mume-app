/** @file useSentCommandDisplay.ts — Resolves command echo labels using the alias snapshot taken at send time. */

import type { SentCommandTextProps } from '../types';
import { getMumeCommandMatch } from '../utils/mumeCommandCatalog';

// --- Logic Section ---
export const useSentCommandDisplay = ({ message }: SentCommandTextProps) => {
    const raw = message.textRaw || '';
    const match = getMumeCommandMatch(raw.trim());
    const remainder = match.entry && match.token !== match.entry.full
        ? match.entry.full.slice(match.token.length) : null;
    return { raw, alias: message.aliasCommandDisplay, token: match.token, suffix: match.suffix, remainder };
};
