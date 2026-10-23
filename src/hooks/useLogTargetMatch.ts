/** @file useLogTargetMatch.ts — Matches log entities against command target keywords. */

import { useCallback } from 'react';
import type { EntityToken } from '../types';
import { getCorpseCommandKeyword } from '../objects/objectTargetModel';
import { getInlineCategoryAxes } from '../utils/inlineCategoryAxes';

// --- Logic Section ---

export const matchesLogTarget = (
    content: string,
    target: string | null,
    metadata?: EntityToken['metadata']
): boolean => {
    if (!target) return false;
    const normalizedTarget = target.trim().toLowerCase();
    const context = metadata?.context?.trim().toLowerCase();
    const label = content.toLowerCase();
    const isObject = getInlineCategoryAxes(metadata?.category).isObject;

    // A corpse's description names the deceased; that name is no longer its keyword.
    if (isObject && (/\bcorpse\b/i.test(content) || /-corpse$/i.test(context || ''))) {
        const keyword = getCorpseCommandKeyword(context?.endsWith('-corpse') ? context : content);
        return normalizedTarget === keyword || normalizedTarget === keyword.replace(/^\d+\./, '') ||
            normalizedTarget === 'corpse';
    }

    return label === normalizedTarget || Boolean(metadata && (
        context === normalizedTarget ||
        (metadata.category !== 'cat-room' && label.includes(normalizedTarget))
    ));
};

export const useLogTargetMatch = (target: string | null) => useCallback(
    (content: string, metadata?: EntityToken['metadata']) => matchesLogTarget(content, target, metadata),
    [target]
);
