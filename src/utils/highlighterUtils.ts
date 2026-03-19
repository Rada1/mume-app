/**
 * @file highlighterUtils.ts
 * @description Helper functions for building highlighter candidates
 */

import { RefObject } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject } from './gameUtils';
import { getCategoryForName, getGlowColorForCategory } from './categorizationUtils';
import {
    statusKeywords,
    combatActions,
    exitDirections,
    magicKeywords
} from '../constants/highlighterItems';

export interface Candidate {
    pattern: string;
    isRegex?: boolean;
    replacer: (m: string, match: RegExpExecArray | null) => string;
    priority: number;
    length: number;
}

// Escape a value for safe use inside an HTML attribute delimited by double-quotes
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const buildHighlighterCandidates = (
    mid: string,
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: string[],
    roomNpcs: string[],
    characterName: string | null,
    roomItems: string[],
    discoveredItems: string[],
    inlineCategories: InlineCategoryConfig[],
    type?: MessageType
): Candidate[] => {
    const candidates: Candidate[] = [];
    const pcNamesSet = new Set([...roomPlayers].filter(name => name !== characterName));
    const npcNamesSet = new Set(roomNpcs);

    // 1. Active Target
    if (target && type !== 'who-list' && type !== 'where-list') {
        let category = getCategoryForName(target, inlineCategories) || 'inline-default';
        if (pcNamesSet.has(target)) category = 'inlineplayer';
        else if (npcNamesSet.has(target)) category = 'inlinenpc';

        const glowColor = getGlowColorForCategory(category, inlineCategories);
        const command = category;

        candidates.push({
            pattern: target,
            priority: 90,
            replacer: (m, _match) => `<span class="inline-btn auto-target active-target" draggable="true" data-id="auto-target-${esc(target)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
            length: target.length
        });
    }

    // 2. Buttons
    buttonsRef.current?.filter(b => (b.display === 'inline' || b.trigger?.spit) && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
        const pattern = b.trigger!.pattern!;
        const isRegex = b.trigger!.isRegex;

        candidates.push({
            pattern: pattern,
            isRegex: isRegex,
            priority: 100,
            replacer: (m, match) => {
                let finalLabel = b.label;
                let finalCommand = b.command;
                if (match) {
                    for (let i = 1; i < match.length; i++) {
                        const val = match[i] || '';
                        finalLabel = finalLabel.replace(new RegExp(`\\$${i}`, 'g'), val);
                        finalCommand = finalCommand.replace(new RegExp(`\\$${i}`, 'g'), val);
                    }
                }
                return `<span class="inline-btn" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${esc(finalCommand)}" data-context="${esc(m)}" data-icon="${esc(b.icon || '')}" data-label="${esc(finalLabel)}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-duration="${b.trigger?.duration || ''}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${b.style.backgroundColor.replace('0.3', '0.6').replace('0.2', '0.5')}">${m}</span>`;
            },
            length: pattern.length
        });
    });

    // 3. PCs
    pcNamesSet.forEach(name => {
        const patterns = [name, pluralizeMumeSubject(name)].filter(Boolean);
        patterns.forEach(p => {
            candidates.push({
                pattern: p,
                priority: 5,
                replacer: (m, _match) => `<span class="inline-btn auto-occupant pc-highlighter" draggable="true" data-id="auto-${esc(name)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(name)}" data-action="menu" data-menu-display="list" style="--glow-color: rgb(150, 150, 255)">${m}</span>`,
                length: p.length
            });
        });
    });

    // 4. NPCs
    const npcNames = new Set(roomNpcs);
    const pSet = new Set(Array.from(pcNamesSet).map(p => (p as string).toLowerCase()));
    if (characterName) pSet.add(characterName.toLowerCase());

    npcNames.forEach(originalName => {
        const lowerName = originalName.toLowerCase();
        if (pSet.has(lowerName)) return;

        const stripped = originalName.replace(/^(A|An|The)\s+/i, '');
        const patterns = [originalName, stripped, pluralizeMumeSubject(originalName), pluralizeMumeSubject(stripped)].filter(Boolean);

        patterns.forEach(p => {
            const category = getCategoryForName(originalName, inlineCategories);
            const glowColor = category ? getGlowColorForCategory(category, inlineCategories) : 'rgba(255, 100, 100, 0.9)';
            const command = category || 'inlinenpc';

            candidates.push({
                pattern: p,
                priority: 5,
                replacer: (m, _match) => `<span class="inline-btn auto-npc npc-highlighter" draggable="true" data-id="auto-npc-${esc(originalName)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(originalName)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
                length: p.length
            });
        });
    });

    // 4.5. Corpses
    const corpseGlowColor = getGlowColorForCategory('inline-corpses', inlineCategories) || 'rgba(156, 163, 175, 0.9)';
    ['corpse', 'corpses'].forEach(p => {
        candidates.push({
            pattern: p,
            priority: 5,
            replacer: (m, _match) => `<span class="inline-btn auto-npc npc-highlighter" draggable="true" data-id="auto-corpse" data-mid="${mid}" data-cmd="inline-corpses" data-context="corpse" data-action="menu" data-menu-display="list" style="--glow-color: ${corpseGlowColor}">${m}</span>`,
            length: p.length
        });
    });

    // 5. Items (Room + Discovered)
    const allItems = Array.from(new Set([...roomItems, ...discoveredItems]));
    allItems.forEach(name => {
        const category = getCategoryForName(name, inlineCategories) || 'inline-default';
        const glowColor = getGlowColorForCategory(category, inlineCategories);
        const command = category;

        candidates.push({
            pattern: name,
            priority: 5,
            replacer: (m, _match) => `<span class="inline-btn auto-item" draggable="true" data-id="auto-item-${esc(name)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`,
            length: name.length
        });
    });

    // 6. Combat Verbs
    candidates.push({
        pattern: '\\*+[A-Z]+\\*+',
        isRegex: true,
        priority: 10,
        replacer: (m) => `<span class="keyword-highlight combat-verb">${m}</span>`,
        length: 5
    });

    // 7. Key Status Words
    statusKeywords.forEach(word => {
        candidates.push({
            pattern: word,
            priority: 10,
            replacer: (m) => `<span class="keyword-highlight status-word">${m}</span>`,
            length: word.length
        });
    });

    // 8. Combat Actions
    combatActions.forEach(word => {
        candidates.push({
            pattern: `\\b${word}(?:s|d|ed|ing)?\\b`,
            isRegex: true,
            priority: 10,
            replacer: (m) => `<span class="keyword-highlight combat-action">${m}</span>`,
            length: word.length
        });
    });

    // 9. Room Exits - Only highlight if this is an exits line
    if (type === 'room-exits') {
        const dirs = exitDirections.join('|');
        candidates.push({
            pattern: `(\\[|\\()?\\b(${dirs})\\b(\\]|\\))?`,
            isRegex: true,
            priority: 1,
            replacer: (m, match) => {
                if (!match) return m;
                const prefix = match[0] || '';
                const dir = match[1];
                const suffix = match[2] || '';

                // Brackets/Parentheses color yellow and toggle doors
                let bracketCmd = '';
                if (prefix === '(') bracketCmd = `close exit ${dir}`;
                else if (prefix === '[') bracketCmd = `open exit ${dir}`;

                const bracketStyle = `color: var(--ansi-yellow); font-weight: bold;`;
                
                const openBracket = prefix ? 
                    `<span class="inline-btn exit-bracket" data-mid="${mid}" data-action="command" data-cmd="${esc(bracketCmd)}" data-context="${esc(prefix)}" style="${bracketStyle}">${prefix}</span>` : '';
                const closeBracket = suffix ? 
                    `<span class="inline-btn exit-bracket" data-mid="${mid}" data-action="command" data-cmd="${esc(bracketCmd)}" data-context="${esc(suffix)}" style="${bracketStyle}">${suffix}</span>` : '';
                
                const dirBtn = `<span class="inline-btn exit-word" data-mid="${mid}" data-action="command" data-cmd="${esc(dir)}" data-context="${esc(dir)}">${dir}</span>`;

                return `${openBracket}${dirBtn}${closeBracket}`;
            },
            length: 8 // dummy length, will be sorted properly
        });
    }

    // 10. Magic Words
    magicKeywords.forEach(magic => {
        candidates.push({
            pattern: `\\b${magic}(?:s|al|ally|ing)?\\b`,
            isRegex: true,
            priority: 20,
            replacer: (m) => `<span class="keyword-highlight magic-word">${m}</span>`,
            length: magic.length
        });
    });

    return candidates;
};

// ---------------------------------------------------------------------------
// Color-tagged object detection
// ---------------------------------------------------------------------------

/**
 * The xterm-256 color used by MUME to signal interactable objects.
 * Configure MUME to use color index 159 (\e[38;5;159m) for object text.
 * Index 159 in the 6x6x6 cube: rgb(175,255,255) — MUME code &355.
 */
export const OBJECT_SIGNAL_COLOR = 'rgb(175,255,255)';

// ansi-to-html emits `style="color:..."` (no space after colon).
// The regex accepts combined styles (e.g. "font-weight:bold;color:rgb(175,255,255)")
// so it still matches when MUME emits bold+color in a single SGR sequence.
const OBJECT_COLOR_RE = /(<span style="[^"]*color:rgb\(175,255,255\)[^"]*">)(.*?)(<\/span>)/g;

const decodeHtmlEntities = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/**
 * Scans already-converted HTML for spans colored with OBJECT_SIGNAL_COLOR and
 * rewraps them as inline-btn elements with context-appropriate commands.
 * Must run before safeHighlight so highlightDepth protects these spans.
 */
export const applyColorTaggedObjects = (html: string, mid: string, type?: MessageType): string => {
    if (!html.includes(OBJECT_SIGNAL_COLOR)) return html;

    let cmd: string;
    if (type === 'equipment-list') cmd = 'inline-obj-worn';
    else if (type === 'shop-item') cmd = 'inline-obj-shop';
    else if (type === 'inventory-list') cmd = 'inline-obj-char';
    else cmd = 'inline-obj-room';

    return html.replace(OBJECT_COLOR_RE, (_match, _open, innerHtml: string, _close) => {
        const displayName = decodeHtmlEntities(innerHtml);
        // Use hyphenated lowercase keywords for commands (e.g. "old black bottle" → "old-black-bottle")
        const keyword = displayName.toLowerCase().replace(/\s+/g, '-');
        return `<span class="inline-btn auto-obj color-tagged-obj" draggable="true" data-id="auto-obj-${esc(keyword)}" data-mid="${mid}" data-cmd="${cmd}" data-context="${esc(keyword)}" data-action="menu" data-menu-display="list" style="--glow-color: ${OBJECT_SIGNAL_COLOR}">${innerHtml}</span>`;
    });
};
