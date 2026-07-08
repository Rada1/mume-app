/**
 * @file xmlTagUtils.ts
 * @description Small helpers for recognizing raw and escaped MUME XML tags.
 */

// --- Logic Section ---

export const hasXmlTag = (text: string | null | undefined, tagName: string): boolean => {
    if (!text || !tagName) return false;
    const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`<(?:${escaped})(?:\\s+[^>]*)?>`, 'i').test(text) ||
        new RegExp(`&lt;(?:${escaped})(?:\\s+[^&]*)?&gt;`, 'i').test(text);
};
