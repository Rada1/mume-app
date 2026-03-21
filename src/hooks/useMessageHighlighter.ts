/**
 * @file useMessageHighlighter.ts
 * @description Hook for highlighting MUME game messages with interactive elements and keywords.
 */

import { useCallback, RefObject, useRef } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { buildHighlighterCandidates, applyColorTaggedObjects } from '../utils/highlighterUtils';

// --- Logic Section: Message Processing & Highlighting ---

export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
    roomNpcs: string[],
    characterName: string | null,
    roomItems: string[],
    inlineCategories: InlineCategoryConfig[] = [],
    isHighlighterEnabled: boolean = true,
    highlightVersion: number = 0,
    discoveredItems: string[] = []
) => {
    const cacheRef = useRef<Map<string, { html: string, htmlRaw: string, deps: string }>>(new Map());
    const regexCacheRef = useRef<Map<string, RegExp>>(new Map());

    // Clear cache when highlight version or toggle changes
    const lastVersionRef = useRef(highlightVersion);
    const lastEnabledRef = useRef(isHighlighterEnabled);
    if (highlightVersion !== lastVersionRef.current || isHighlighterEnabled !== lastEnabledRef.current) {
        cacheRef.current.clear();
        regexCacheRef.current.clear();
        lastVersionRef.current = highlightVersion;
        lastEnabledRef.current = isHighlighterEnabled;
    }

    /**
     * Safely applies a highlight pattern to an HTML string, avoiding tags.
     */
    const safeHighlight = (currentHtml: string, patternStr: string, isRegex: boolean, replacer: (match: string, matchObj: RegExpExecArray | null) => string) => {
        if (!patternStr) return currentHtml;

        const escaped = isRegex ? patternStr : patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = currentHtml.split(/(<[^>]+>)/g);
        let changed = false;
        let highlightDepth = 0;

        const regexKey = `${escaped}:${isRegex}`;
        let regex = regexCacheRef.current.get(regexKey);
        if (!regex) {
            // For plain strings, enforce word boundaries to avoid partial matching (e.g. "Sting" in "Resting").
            // Use lookahead/lookbehind instead of \b so Unicode names like Éorenel are matched correctly
            // (\b treats accented letters as non-word chars and fails on them).
            const pattern = isRegex ? escaped : `(?<![A-Za-z\\u00C0-\\u024F])${escaped}(?![A-Za-z\\u00C0-\\u024F])`;
            regex = new RegExp(pattern, 'gi');
            regexCacheRef.current.set(regexKey, regex);
        }

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('<')) {
                if (part === '</span>') {
                    if (highlightDepth > 0) highlightDepth--;
                } else if (!part.startsWith('</') && /class="[^"]*(?:inline-btn|keyword-highlight|comm-content)/.test(part)) {
                    highlightDepth++;
                }
            } else if (highlightDepth === 0) {
                const nodeText = parts[i];
                const replaced = nodeText.replace(regex, (m, ...args) => {
                    const groups = args.slice(0, -2);
                    return replacer(m, groups as any);
                });

                if (replaced !== nodeText) {
                    parts[i] = replaced;
                    changed = true;
                }
            }
        }

        return changed ? parts.join('') : currentHtml;
    };

    /**
     * Generates a hash of dependencies to determine when cache should be invalidated.
     */
    const generateDepsHash = useCallback(() => {
        const rp = roomPlayers.join('|');
        const rn = roomNpcs.join('|');
        const ri = roomItems.join('|');
        const di = discoveredItems.join('|');
        const ic = inlineCategories.map(c => `${c.id}:${c.keywords.join(',')}`).join('|');
        return `${target || ''}:${rp}:${rn}:${ri}:${di}:${ic}:${isHighlighterEnabled}:${highlightVersion}`;
    }, [target, roomPlayers, roomNpcs, roomItems, discoveredItems, inlineCategories, isHighlighterEnabled, highlightVersion]);

    /**
     * Main entry point for processing a message's HTML and applying highlights.
     */
    const processMessageHtml = useCallback((originalHtml: string, mid: string, isRoomName: boolean, type?: MessageType) => {
        // --- 1. Rule: No highlighted words in room names ---
        if (isRoomName || !isHighlighterEnabled) {
            return originalHtml;
        }

        const depsHash = `${generateDepsHash()}:${type || ''}`;
        const cached = cacheRef.current.get(mid);
        if (cached && cached.htmlRaw === originalHtml && cached.deps === depsHash) {
            return cached.html;
        }

        let prefixHtml = '';
        let targetHtml = originalHtml;

        // --- 2. Rule: In equipment lists, don't highlight the slot label ---
        if (type === 'equipment-list') {
            const eqSplitRegex = /^([^&]*&lt;[^&]+&gt;)(.*)/;
            const match = originalHtml.match(eqSplitRegex);
            if (match) {
                prefixHtml = match[1];
                targetHtml = match[2];
            }
        }

        let newHtml = targetHtml;
        const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // --- 0. Color-tagged object detection (runs first so highlightDepth protects these spans) ---
        newHtml = applyColorTaggedObjects(newHtml, mid, inlineCategories, target, type);

        const textOnly = targetHtml
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&#x([0-9A-Fa-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
            .normalize('NFC');

        // --- 3. Specialized List Highlighting (WHO/WHERE) ---
        if (type === 'who-list' || type === 'where-list') {
            // Strip MUME XML-style markup tags that ansi-to-html encodes as HTML entities,
            // causing them to render as visible literal text (e.g. &lt;C&gt; → "<C>").
            // Also strip bracket-style markers like [AW] that appear as plain text.
            newHtml = newHtml.replace(/&lt;\/?[A-Za-z]+&gt;\s*/g, '').replace(/\[[A-Za-z]+\]\s*/g, '');

            let cleanText = textOnly.trim();
            let lastLength = 0;
            while (cleanText.length !== lastLength) {
                lastLength = cleanText.length;
                cleanText = cleanText.replace(/^\[.*?\]\s*/, '');
                cleanText = cleanText.replace(/^<.*?>\s*/, '');
                cleanText = cleanText.replace(/^\(.*?\)\s*/, '');
                cleanText = cleanText.replace(/^\*.*?\*\s*/, '');
                cleanText = cleanText.replace(/^\*+\s*/, '');
            }

            const nameCandidate = cleanText.split(/\s+/)[0].replace(/[.,:;!]+$/, '');
            const commonHeaders = ['Players', 'Allies', 'Minions', 'Who', 'Where', 'Visible'];
            if (nameCandidate && nameCandidate.length > 2 && /^[A-Z\u00C0-\u00DE]/.test(nameCandidate) && !commonHeaders.includes(nameCandidate)) {
                // Search newHtml using the entity-encoded form (how ansi-to-html wrote it)
                const htmlNameCandidate = nameCandidate.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`);
                let highlighted = false;
                newHtml = safeHighlight(newHtml, htmlNameCandidate, false, (m) => {
                    if (highlighted) return m;
                    highlighted = true;
                    return `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${esc(nameCandidate)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(nameCandidate)}" data-action="menu" data-menu-display="list" style="--glow-color: rgba(125, 211, 252, 1); color: var(--glow-color); font-weight: 800">${m}</span>`;
                });
            }
        }

        if (!isRoomName) {
            // Build and sort candidates using utility
            const candidates = buildHighlighterCandidates(
                mid, target, buttonsRef, roomPlayers, roomNpcs, characterName, 
                roomItems, discoveredItems, inlineCategories, type, textOnly
            );

            candidates
                .sort((a, b) => {
                    if (b.priority !== a.priority) return b.priority - a.priority;
                    return b.length - a.length;
                })
                .forEach(c => {
                    newHtml = safeHighlight(newHtml, c.pattern, !!c.isRegex, c.replacer);
                });
        }

        const finalHtml = prefixHtml + newHtml;
        cacheRef.current.set(mid, { html: finalHtml, htmlRaw: originalHtml, deps: depsHash });
        
        // Cache management
        if (cacheRef.current.size > 1000) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) cacheRef.current.delete(firstKey);
        }

        return finalHtml;
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems, inlineCategories, generateDepsHash, highlightVersion, discoveredItems]);

    return { processMessageHtml };
};
