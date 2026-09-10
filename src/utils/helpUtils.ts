/**
 * @file helpUtils.ts
 * @description Helper functions to format and sanitize MUME help text and topic links.
 */

import { ansiConvert } from './ansi';
import { sanitizeMumeHtml } from './securityUtils';

export interface ParsedHelpResult {
    contentHtml: string;
    keywords: string[];
}

/**
 * Parses raw MUME help data into sanitized HTML with interactive topic buttons and extracts "See also" keywords.
 */
export function parseHelpContent(helpData: string): ParsedHelpResult {
    if (!helpData || !helpData.trim()) {
        return { contentHtml: '', keywords: [] };
    }

    const seeAlsoMatch = helpData.match(/See also:\s*([^\r\n]+)\.?\s*$/i);
    let mainText = helpData;
    let keywords: string[] = [];

    if (seeAlsoMatch) {
        mainText = helpData.substring(0, seeAlsoMatch.index).trim();
        keywords = seeAlsoMatch[1]
            .split(',')
            .map(k => k.trim().replace(/^"(.*)"$/, '$1').replace(/[.,;:]+$/, ''))
            .filter(k => k.length > 0);
    }

    let contentHtmlRaw = ansiConvert.toHtml(mainText);

    // Restore escaped XML formatting tags and entities
    contentHtmlRaw = contentHtmlRaw
        .replace(/&lt;code&gt;/gi, '<code>')
        .replace(/&lt;\/code&gt;/gi, '</code>')
        .replace(/&lt;em&gt;/gi, '<em>')
        .replace(/&lt;\/em&gt;/gi, '</em>')
        .replace(/&amp;lt;/gi, '&lt;')
        .replace(/&amp;gt;/gi, '&gt;')
        .replace(/&amp;amp;/gi, '&amp;')
        .replace(/&amp;quot;/gi, '&quot;')
        .replace(/&amp;apos;/gi, '&apos;')
        .replace(/&amp;#039;/gi, '&#039;');

    // Convert all CAPS words to clickable help button spans (length >= 2) with gold theming (#ffcc00)
    const contentWithTopics = contentHtmlRaw.replace(/(<[^>]+>)|(\b[A-Z]{2,}\b)/g, (match, tag, word) => {
        if (tag) return tag;
        return `<span class="help-topic-btn" data-cmd="${word}">${word}</span>`;
    });

    return {
        contentHtml: sanitizeMumeHtml(contentWithTopics),
        keywords
    };
}
