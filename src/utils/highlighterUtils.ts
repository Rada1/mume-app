/**
 * @file highlighterUtils.ts
 * @description Helper functions for building highlighter candidates
 */

import { RefObject } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject, extractMumeKeyword } from './gameUtils';
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

const getTargetAwareStyles = (text: string, context: string, baseGlow: string, target: string | null) => {
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
        return { glow: '#facc15', classExtra: ' active-target' };
    }
    return { glow: baseGlow, classExtra: '' };
};

export const buildHighlighterCandidates = (
    mid: string,
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: import('../types').GmcpOccupant[],
    roomNpcs: import('../types').GmcpOccupant[],
    characterName: string | null,
    roomItems: import('../types').GmcpOccupant[],
    discoveredItems: string[],
    inlineCategories: InlineCategoryConfig[],
    type?: MessageType,
    textOnly: string = ''
): Candidate[] => {
    const candidates: Candidate[] = [];
    const pcNamesSet = new Set(roomPlayers.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name && name !== characterName));
    const npcNamesSet = new Set(roomNpcs.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name));

    // 1. Active Target
    if (target && type !== 'who-list' && type !== 'where-list') {
        let category = getCategoryForName(target, inlineCategories) || 'inline-obj-room';
        if (pcNamesSet.has(target)) category = 'inlineplayer';
        else if (npcNamesSet.has(target)) category = 'inlinenpc';

        // Target highlights are always yellow to distinguish from static npc/pc/item groups
        const glowColor = '#facc15'; 
        const command = category;

        candidates.push({
            pattern: target,
            priority: 1, // Lowest priority: only highlights if no other button matches this text
            replacer: (m, _match) => `<span class="inline-btn auto-target active-target" draggable="true" data-id="auto-target-${esc(target)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m.replace(/,/g, '')}</span>`,
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
                const { glow, classExtra } = getTargetAwareStyles(m, finalCommand, b.style.backgroundColor.replace('0.3', '0.6').replace('0.2', '0.5'), target);
                return `<span class="inline-btn${classExtra}" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${esc(finalCommand)}" data-context="${esc(m)}" data-icon="${esc(b.icon || '')}" data-label="${esc(finalLabel)}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-duration="${b.trigger?.duration || ''}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${glow}">${m}</span>`;
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
                replacer: (m, _match) => {
                    const { glow, classExtra } = getTargetAwareStyles(m, name, 'rgba(125, 211, 252, 1)', target);
                    return `<span class="inline-btn auto-occupant pc-highlighter${classExtra}" draggable="true" data-id="auto-${esc(name)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(name)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}; font-weight: 800">${m.replace(/,/g, '')}</span>`;
                },
                length: p.length
            });
        });
    });

    // 4. NPCs
    const npcOccupants = roomNpcs;
    const pSet = new Set(Array.from(pcNamesSet).map(p => p.toLowerCase()));
    if (characterName) pSet.add(characterName.toLowerCase());

    npcOccupants.forEach(occupant => {
        const originalName = typeof occupant === 'string' ? occupant : occupant.name;
        if (!originalName) return;
        const lowerName = originalName.toLowerCase();
        if (pSet.has(lowerName)) return;

        const stripped = originalName.replace(/^(A|An|The)\s+/i, '');
        const patterns = [originalName, stripped, pluralizeMumeSubject(originalName), pluralizeMumeSubject(stripped)].filter(Boolean);

        patterns.forEach(p => {
            const category = getCategoryForName(originalName, inlineCategories);
            const glowColor = getGlowColorForCategory(category || 'inlinenpc', inlineCategories);
            const command = 'inlinenpc';
            const context = extractMumeKeyword(originalName);

            candidates.push({
                pattern: p,
                priority: 5,
                replacer: (m, _match) => {
                    const { glow, classExtra } = getTargetAwareStyles(m, originalName, glowColor, target);
                    return `<span class="inline-btn auto-npc npc-highlighter${classExtra}" draggable="true" data-id="auto-npc-${esc(originalName)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(context)}" data-category="${esc(category || '')}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
                },
                length: p.length
            });
        });
    });

    // 4.5. Corpses (Recategorized as Objects)
    const corpseGlowColor = getGlowColorForCategory('inline-corpses', inlineCategories) || 'rgba(180, 100, 50, 0.9)';
    ['corpse', 'corpses'].forEach(p => {
        candidates.push({
            pattern: p,
            priority: 5,
            replacer: (m, _match) => `<span class="inline-btn auto-item" draggable="true" data-id="auto-corpse" data-mid="${mid}" data-cmd="inline-corpses" data-context="corpse" data-action="menu" data-menu-display="list" style="--glow-color: ${corpseGlowColor}">${m}</span>`,
            length: p.length
        });
    });

    // 5. Items (Room + Discovered)
    const itemNames = roomItems.map(i => typeof i === 'string' ? i : i.name).filter((n): n is string => !!n);
    const allItems = Array.from(new Set([...itemNames, ...discoveredItems]));
    allItems.forEach(name => {
        const category = getCategoryForName(name, inlineCategories);
        const glowColor = getGlowColorForCategory(category || 'inline-obj-room', inlineCategories);
        const command = 'inline-obj-room';

        candidates.push({
            pattern: name,
            priority: 5,
            replacer: (m, _match) => {
                const { glow, classExtra } = getTargetAwareStyles(m, name, glowColor, target);
                return `<span class="inline-btn auto-item${classExtra}" draggable="true" data-id="auto-item-${esc(name)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
            },
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
                const glowColor = 'var(--color-exit)';
                const dirBtn = `<span class="inline-btn exit-word" data-mid="${mid}" data-action="command" data-cmd="${esc(dir)}" data-context="${esc(dir)}" style="--glow-color: ${glowColor}; color: ${glowColor}">${dir}</span>`;

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

    // 11. State Transitions (Locked, Closed, Latched)
    // We use contextual noun extraction from the full textOnly to handle split tags.
    const stateCounts: Record<string, number> = {};
    ['locked', 'closed', 'latched'].forEach(stateWord => {
        candidates.push({
            pattern: `\\b${stateWord}\\b`,
            isRegex: true,
            priority: 15,
            replacer: (m) => {
                const count = (stateCounts[stateWord] || 0) + 1;
                stateCounts[stateWord] = count;
                
                // Find the Nth occurrence of this word in textOnly (case insensitive search)
                let pos = -1;
                const lowerText = textOnly.toLowerCase();
                for (let i = 0; i < count; i++) {
                    pos = lowerText.indexOf(stateWord, pos + 1);
                }
                
                if (pos === -1) return m;
                
                // Look back up to 45 chars for a noun: "The gate seems to be ", "door is ", "gate (", "chest: "
                const lookback = textOnly.substring(Math.max(0, pos - 45), pos);
                // Matches "the noun is|was|seems|appears...", "noun (", or "noun: "
                const nounRegex = /(?:the\s+)?([A-Za-z-]+(?:\s+[A-Za-z-]+){0,3})(?:\s+(?:is|was|seems|appears|remains)(?:\s+to\s+be)?|\s*[:\-(/])\s*$/i;
                const nounMatch = lookback.match(nounRegex);
                const noun = nounMatch ? nounMatch[1].trim() : 'it'; // Default to "it" if no noun found
                const keyword = extractMumeKeyword(noun);
                
                let cmd = '';
                if (stateWord === 'locked') cmd = `unlock ${keyword}`;
                else if (stateWord === 'closed') cmd = `open ${keyword}`;
                else if (stateWord === 'latched') cmd = `unlock ${keyword}`;
                
                const glowColor = '#facc15';
                return `<span class="inline-btn state-toggle-btn" data-mid="${mid}" data-action="command" data-cmd="${esc(cmd)}" data-context="${esc(stateWord)}" style="--glow-color: ${glowColor}; color: ${glowColor}; font-weight: 800">${m}</span>`;
            },
            length: stateWord.length
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
export const applyColorTaggedObjects = (html: string, mid: string, inlineCategories: InlineCategoryConfig[], target: string | null, type?: MessageType): string => {
    if (!html.includes(OBJECT_SIGNAL_COLOR)) return html;

    let cmd: string;
    if (type === 'equipment-list') cmd = 'inline-obj-worn';
    else if (type === 'shop-item') cmd = 'inline-obj-shop';
    else if (type === 'inventory-list') cmd = 'inline-obj-char';
    else cmd = 'inline-obj-room';

    return html.replace(OBJECT_COLOR_RE, (_match, _open, innerHtml: string, _close) => {
        const displayName = decodeHtmlEntities(innerHtml).toLowerCase();
        
        const name = displayName.toLowerCase();
        const keywordBase = name.replace(/^(a|an|some)\s+/, '').replace(/^pair\s+of\s+/, '');
        const keyword = keywordBase.replace(/\s+/g, '-');
        const finalContext = extractMumeKeyword(displayName);

        const category = getCategoryForName(displayName, inlineCategories);
        const finalCmd = cmd;
        const baseGlow = getGlowColorForCategory(category || finalCmd, inlineCategories);
        const { glow, classExtra } = getTargetAwareStyles(displayName, finalContext, baseGlow, target);

        return `<span class="inline-btn auto-obj color-tagged-obj${classExtra}" draggable="true" data-id="auto-obj-${esc(keyword)}" data-mid="${mid}" data-cmd="${finalCmd}" data-context="${esc(finalContext)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${innerHtml.replace(/,/g, '')}</span>`;
    });
};
