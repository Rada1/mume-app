/**
 * @file shaperZoneInfo.ts
 * @description Pure operations for zone keywords (/info zone) in Shaper workspaces.
 */

import type { ShaperWorkspaceDoc, ShaperZoneInfoKeyword } from './shaperTypes';

// --- Logic Section ---
export const decodeZoneInfoText = (text: string): string => text
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&amp;/gi, '&');

/**
 * Adds or updates a zone info keyword.
 */
export const addZoneInfoKeyword = (
    doc: ShaperWorkspaceDoc,
    keyword: string,
    body: string
): ShaperWorkspaceDoc => {
    const key = keyword.trim().toLowerCase();
    if (!key) return doc;

    const newKeyword: ShaperZoneInfoKeyword = {
        id: key,
        keyword: keyword.trim(),
        body: decodeZoneInfoText(body),
        rawText: decodeZoneInfoText(body),
        importedAt: Date.now()
    };

    return {
        ...doc,
        zoneInfoKeywords: {
            ...doc.zoneInfoKeywords,
            [key]: newKeyword
        }
    };
};

/**
 * Updates an existing zone info keyword. If the keyword name changes, re-keys the record.
 */
export const updateZoneInfoKeyword = (
    doc: ShaperWorkspaceDoc,
    id: string,
    nextKeyword: string,
    nextBody: string
): ShaperWorkspaceDoc => {
    const nextKey = nextKeyword.trim().toLowerCase();
    const oldKey = id.trim().toLowerCase();
    if (!nextKey || !oldKey) return doc;

    const existing = doc.zoneInfoKeywords[oldKey];
    if (!existing) return doc;

    const updated: ShaperZoneInfoKeyword = {
        ...existing,
        keyword: nextKeyword.trim(),
        body: decodeZoneInfoText(nextBody),
        rawText: decodeZoneInfoText(nextBody)
    };

    const nextKeywords = { ...doc.zoneInfoKeywords };
    if (oldKey !== nextKey) {
        delete nextKeywords[oldKey];
        updated.id = nextKey;
    }
    nextKeywords[nextKey] = updated;

    return {
        ...doc,
        zoneInfoKeywords: nextKeywords
    };
};

/**
 * Deletes a zone info keyword by ID.
 */
export const deleteZoneInfoKeyword = (
    doc: ShaperWorkspaceDoc,
    id: string
): ShaperWorkspaceDoc => {
    const key = id.trim().toLowerCase();
    if (!key || !doc.zoneInfoKeywords[key]) return doc;

    const nextKeywords = { ...doc.zoneInfoKeywords };
    delete nextKeywords[key];

    return {
        ...doc,
        zoneInfoKeywords: nextKeywords
    };
};
