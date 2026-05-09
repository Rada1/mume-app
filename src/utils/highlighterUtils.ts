/**
 * @file highlighterUtils.ts
 * @description Helper functions for building highlighter candidates
 */

import { RefObject } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject } from './gameUtils';
import { getCategoryIdForKindLocation, getKindForCategory } from './inlineActionModel';
import { getEffectiveKeyword } from './keywordUtils';
import { getMemberColor } from './groupUtils';
import {
    statusKeywords,
    combatActions,
    exitDirections,
    magicKeywords
} from '../constants/highlighterItems';
import { isObjectSelected } from './selectionUtils';
import { renderInlineSpan, esc } from './inlineSpanRenderer';

/**
 * Regex constants for movement detection.
 */
export const ARRIVE_REGEX = /^(.+?)\s+(has arrived from|arrives from|enters from)\s+(the\s+)?(.+?)\.?$/i;
export const LEAVE_REGEX = /^(.+?)\s+(leaves|enters|flees|fled)\s+(the\s+)?(.+?)\.?$/i;

/**
 * Returns true if this NPC name appears in a "corpse of ..." phrase in the current line.
 * Centralized logic for T3 refactor.
 */
export const isInCorpseContext = (npcName: string, textOnly: string): boolean => {
    const lowerTextOnly = textOnly.toLowerCase();
    if (!lowerTextOnly.includes('corpse')) return false;
    
    // Exact same logic as before, just centralized
    const stripped = npcName.replace(/^(A|An|The|Some)\s+/i, '').toLowerCase();
    const escaped = stripped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const corpseRe = new RegExp(`corpses?\\s+of\\s+(?:a |an |the |some )?${escaped}\\b`, 'i');
    return corpseRe.test(lowerTextOnly);
};

export interface Candidate {
    pattern: string;
    isRegex?: boolean;
    replacer: (m: string, match: RegExpExecArray | null) => string;
    priority: number;
    length: number;
}

export const getTargetAwareStyles = (text: string, context: string, baseGlow: string, target: string | null) => {
    if (!target) return { glow: baseGlow, classExtra: '' };
    const lowerText = text.toLowerCase();
    const lowerContext = context.toLowerCase();
    const lowerTarget = target.toLowerCase();
    
    const isTarget = lowerText === lowerTarget || 
                     lowerContext === lowerTarget ||
                     lowerText.startsWith(`${lowerTarget} `) || 
                     lowerText.endsWith(` ${lowerTarget}`) || 
                     lowerText.includes(` ${lowerTarget} `);
                     
    if (isTarget) {
        return { glow: baseGlow, classExtra: ' active-target' };
    }
    return { glow: baseGlow, classExtra: '' };
};


/**
 * Safely applies a highlight pattern to an HTML string, avoiding tags.
 */
export const safeHighlight = (
    currentHtml: string, 
    patternStr: string, 
    isRegex: boolean, 
    replacer: (match: string, matchObj: RegExpExecArray | null) => string,
    cache?: { get: (key: string) => RegExp | undefined; set: (key: string, val: RegExp) => void }
) => {
    if (!patternStr) return currentHtml;

    const escaped = isRegex ? patternStr : patternStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = currentHtml.split(/(<[^>]+>)/g);
    let changed = false;
    let highlightDepth = 0;

    const regexKey = `${escaped}:${isRegex}`;
    let regex = cache?.get(regexKey);
    if (!regex) {
        // For plain strings, enforce word boundaries to avoid partial matching.
        // Use lookahead/lookbehind for Unicode/accented character support.
        const pattern = isRegex ? escaped : `(?<![A-Za-z\\u00C0-\\u024F])${escaped}(?![A-Za-z\\u00C0-\\u024F])`;
        regex = new RegExp(pattern, 'gi');
        cache?.set(regexKey, regex);
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

// ---------------------------------------------------------------------------
// Color-tagged object detection
// ---------------------------------------------------------------------------

export const OBJECT_SIGNAL_COLOR = 'rgb(175,255,255)';

const OBJECT_COLOR_RE = /(<span style="[^"]*color:rgb\(175,255,255\)[^"]*">)(.*?)(<\/span>)/g;

const decodeHtmlEntities = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export const applyColorTaggedObjects = (
    html: string, 
    mid: string, 
    inlineCategories: InlineCategoryConfig[], 
    target: string | null, 
    type?: MessageType,
    keywordOverrides: Record<string, string> = {},
    selectedObjectIds: Set<string> = new Set(),
    roomPlayers: import('../types').GmcpOccupant[] = [],
    roomNpcs: import('../types').GmcpOccupant[] = [],
    groupMembers: import('../types').GroupMember[] = [],
    textOnly: string = ''
): string => {
    if (!html.includes(OBJECT_SIGNAL_COLOR)) return html;

    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    const pcNames = roomPlayers.map(p => typeof p === 'string' ? p : p.name).filter((n): n is string => !!n);
    const npcNames = roomNpcs.map(p => typeof p === 'string' ? p : p.name).filter((n): n is string => !!n);
    
    const normalizedPcSet = new Set(pcNames.map(normalize));
    const normalizedNpcSet = new Set(npcNames.map(normalize));

    let location: string = 'room';
    const lowerHtml = html.toLowerCase();
    const lowerInner = html.match(OBJECT_COLOR_RE)?.[2]?.toLowerCase() || '';
    
    if (type === 'equipment-list' || lowerHtml.includes('(worn)') || lowerInner.includes('(worn)')) location = 'worn';
    else if (type === 'shop-item') location = 'shop';
    else if (type === 'inventory-list' || lowerHtml.includes('(carried)') || lowerInner.includes('(carried)')) location = 'carried';
    else if (lowerHtml.includes('you stop using') || 
             lowerHtml.includes('you are carrying') || 
             lowerHtml.includes('you have') || 
             lowerHtml.includes('you get') || 
             lowerHtml.includes('you put') || 
             lowerHtml.includes('you take') ||
             lowerHtml.includes('you wear') ||
             lowerHtml.includes('you wield') ||
             lowerHtml.includes('you remove') ||
             lowerHtml.includes('gives you')) {
        location = 'carried';
    }

    return html.replace(OBJECT_COLOR_RE, (_match, _open, innerHtml: string, _close) => {
        const displayName = decodeHtmlEntities(innerHtml);
        const name = displayName.toLowerCase();
        const keywordBase = name.replace(/^(a|an|some)\s+/, '').replace(/^pair\s+of\s+/, '');
        const keyword = keywordBase.replace(/\s+/g, '-');
        const finalContext = getEffectiveKeyword(displayName, undefined, undefined, keywordOverrides);

        let kind: string = 'object';
        
        const normalizedName = normalize(name);
        const normalizedStripped = normalize(keywordBase);
        let isGroupmate = false;
        let groupColor = '';

        const isNpcCandidate = normalizedNpcSet.has(normalizedName) || normalizedNpcSet.has(normalizedStripped);
        const inCorpseContext = isInCorpseContext(displayName, textOnly);

        if (isNpcCandidate && !inCorpseContext) {
            kind = 'npc';
            location = 'room'; // NPCs are always in room for now
        } else if (normalizedPcSet.has(normalizedName) || normalizedPcSet.has(normalizedStripped)) {
            kind = 'player';
            location = 'room';
            
            const groupMemberIndex = groupMembers?.findIndex(gm => gm.name && (normalize(gm.name) === normalizedName || normalize(gm.name) === normalizedStripped));
            if (groupMemberIndex !== -1 && groupMemberIndex !== undefined) {
                isGroupmate = true;
                groupColor = getMemberColor(groupMemberIndex).core;
            }
        }
        
        const category = getCategoryIdForKindLocation(kind, location);
        const catType = getKindForCategory(category) || kind;
        const { glow, classExtra } = getTargetAwareStyles(displayName, finalContext, groupColor || '', target);
        
        const buttonId = `auto-obj-${keyword}`;
        const isSelected = isObjectSelected(selectedObjectIds, buttonId, kind);
        
        return renderInlineSpan({
            id: buttonId,
            mid,
            cmd: kind,
            kind: catType,
            location,
            context: finalContext,
            category: category || catType,
            action: 'menu',
            extraClasses: ['auto-obj', 'color-tagged-obj', ...classExtra.trim().split(' ').filter(Boolean)],
            draggable: true,
            selected: isSelected,
            glowColor: glow,
            textColor: isGroupmate ? glow : undefined,
            innerHtml: innerHtml.replace(/,/g, '')
        });
    });
};
