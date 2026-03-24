/**
 * @file highlighterUtils.ts
 * @description Helper functions for building highlighter candidates
 */

import { RefObject } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject } from './gameUtils';
import { getCategoryForName, getGlowColorForCategory } from './categorizationUtils';
import { getEffectiveKeyword } from './keywordUtils';
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
        return { glow: baseGlow, classExtra: ' active-target' };
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
    textOnly: string = '',
    keywordOverrides: Record<string, string> = {},
    selectedPrefixes: Set<string> = new Set()
): Candidate[] => {
    const candidates: Candidate[] = [];
    // Normalized sets to handle accent mismatches (e.g. Dúnadan vs Dunadan)
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const ACCENT_MAP: Record<string, string> = {
        'a': '[a\u00e0-\u00e5]',
        'e': '[e\u00e8-\u00eb]',
        'i': '[i\u00ec-\u00ef]',
        'o': '[o\u00f2-\u00f6]',
        'u': '[u\u00f9-\u00fc]',
        'n': '[n\u00f1]',
        'c': '[c\u00e7]'
    };

    const toAccentAgnostic = (s: string) => {
        let res = '';
        const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        for (const char of norm) {
            if (ACCENT_MAP[char]) {
                res += ACCENT_MAP[char];
            } else {
                res += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        }
        // Use a simpler word boundary for MUD text
        return `(?:^|(?<=[\\s\\.,:;\\!]))${res}(?=[\\s\\.,:;\\!]|$)`;
    };

    const pcNames = roomPlayers.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name && name !== characterName);
    const npcNames = roomNpcs.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name);
    
    const pcNamesSet = new Set(pcNames);
    const npcNamesSet = new Set(npcNames);
    const normalizedPcSet = new Set(pcNames.map(normalize));
    const normalizedNpcSet = new Set(npcNames.map(normalize));

    // 1. Active Target
    if (target && type !== 'who-list' && type !== 'where-list') {
        const isRoomItem = roomItems.some(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            return itemName === target || itemName?.toLowerCase() === target.toLowerCase();
        });
        
        let category = getCategoryForName(target, inlineCategories) || (isRoomItem ? 'inline-obj-room' : 'inline-object');
        if (pcNamesSet.has(target)) category = 'inlineplayer';
        else if (npcNamesSet.has(target)) category = 'inlinenpc';

        // Target highlights are always yellow to distinguish from static npc/pc/item groups
        const glowColor = '#facc15'; 
        const command = category;
        const buttonId = `auto-target-${target}`;
        const isSelected = selectedPrefixes.has(`${command}:${buttonId}`);

        candidates.push({
            pattern: target,
            priority: 1, // Lowest priority: only highlights if no other button matches this text
            replacer: (m, _match) => `<span class="inline-btn auto-target active-target${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m.replace(/,/g, '')}</span>`,
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
                const isSelected = selectedPrefixes.has(`${finalCommand}:${b.id}`);
                return `<span class="inline-btn${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${esc(finalCommand)}" data-context="${esc(m)}" data-icon="${esc(b.icon || '')}" data-label="${esc(finalLabel)}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-duration="${b.trigger?.duration || ''}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${glow}">${m}</span>`;
            },
            length: pattern.length
        });
    });

    // 3. PCs
    pcNamesSet.forEach(name => {
        const patterns = [name, pluralizeMumeSubject(name)].filter(Boolean);
        patterns.forEach(p => {
            candidates.push({
                pattern: toAccentAgnostic(p),
                isRegex: true,
                priority: 5,
                replacer: (m, _match) => {
                    const { glow, classExtra } = getTargetAwareStyles(m, name, 'rgba(125, 211, 252, 1)', target);
                    const buttonId = `auto-${name}`;
                    const isSelected = selectedPrefixes.has(`inlineplayer:${buttonId}`);
                    return `<span class="inline-btn auto-occupant pc-highlighter${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(name)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}; font-weight: 800">${m.replace(/,/g, '')}</span>`;
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

        const stripped = originalName.replace(/^(A|An|The|Some)\s+/i, '');
        const normalizedOriginal = normalize(originalName);
        const normalizedStripped = normalize(stripped);

        // MUME sometimes sends the full description (e.g., "An experienced Dûnadan officer") 
        // in room.npcs as the .name property. We need to match this exactly.
        const patterns = new Set([
            originalName, 
            stripped, 
            pluralizeMumeSubject(originalName), 
            pluralizeMumeSubject(stripped),
            normalizedOriginal,
            normalizedStripped,
            pluralizeMumeSubject(normalizedOriginal),
            pluralizeMumeSubject(normalizedStripped)
        ].filter(Boolean));

        // If the name is long, and has a prefix, also try matching the part after the prefix
        if (originalName.includes(' ') && !originalName.match(/^(A|An|The|Some)\s/i)) {
            const shortName = originalName.split(' ').pop()!;
            patterns.add(shortName);
            patterns.add(normalize(shortName));
        }

        patterns.forEach(p => {
            const category = getCategoryForName(originalName, inlineCategories);
            // Default to 'inlinenpc' which is Magenta.
            const glowColor = getGlowColorForCategory(category || 'inlinenpc', inlineCategories);
            const command = 'inlinenpc';
            const context = getEffectiveKeyword(originalName, undefined, undefined, keywordOverrides);

            candidates.push({
                pattern: toAccentAgnostic(p),
                isRegex: true,
                priority: 6, // Slightly higher than items to favor NPC match in ambiguous cases
                replacer: (m, _match) => {
                    const { glow, classExtra } = getTargetAwareStyles(m, originalName, glowColor, target);
                    const buttonId = `auto-npc-${originalName}`;
                    const isSelected = selectedPrefixes.has(`${command}:${buttonId}`);
                    return `<span class="inline-btn auto-npc npc-highlighter${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(context)}" data-category="${esc(category || '')}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
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
            replacer: (m, _match) => {
                const isSelected = selectedPrefixes.has('inline-corpses:auto-corpse');
                return `<span class="inline-btn auto-item${isSelected ? ' selected' : ''}" draggable="true" data-id="auto-corpse" data-mid="${mid}" data-cmd="inline-corpses" data-context="corpse" data-action="menu" data-menu-display="list" style="--glow-color: ${corpseGlowColor}">${m}</span>`;
            },
            length: p.length
        });
    });

    // 5. Room Items
    roomItems.forEach(item => {
        const itemName = typeof item === 'string' ? item : item.name;
        if (!itemName) return;
        
        // Use our unified data-driven keyword extractor
        const noun = getEffectiveKeyword(itemName, undefined, undefined, keywordOverrides);
        if (!noun) return;

        const category = getCategoryForName(itemName, inlineCategories);
        const glowColor = getGlowColorForCategory(category || 'inline-obj-room', inlineCategories);
        const command = 'inline-obj-room';

        const strippedItem = itemName.replace(/^(A|An|The|Some)\s+/i, '');
        const normalizedItem = normalize(itemName);
        const normalizedStrippedItem = normalize(strippedItem);

        const itemPatterns = new Set([
            itemName,
            strippedItem,
            normalizedItem,
            normalizedStrippedItem
        ].filter(Boolean));

        itemPatterns.forEach(p => {
            candidates.push({
                pattern: toAccentAgnostic(p),
                isRegex: true,
                priority: 5,
                replacer: (m, _match) => {
                    const { glow, classExtra } = getTargetAwareStyles(m, itemName, glowColor, target);
                    const buttonId = `auto-item-${noun}`;
                    const isSelected = selectedPrefixes.has(`${command}:${buttonId}`);
                    return `<span class="inline-btn auto-item${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(noun)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
                },
                length: p.length
            });
        });
    });

    // 6. Discovered Items (from inventory/equipment/look in)
    discoveredItems.forEach(itemName => {
        const noun = getEffectiveKeyword(itemName, undefined, undefined, keywordOverrides);
        if (!noun) return;

        const category = getCategoryForName(itemName, inlineCategories);
        // Default to inline-object (examine only) since we don't know if it's in the room
        const command = 'inline-object';

        candidates.push({
            pattern: itemName,
            priority: 5,
            replacer: (m, _match) => {
                const { glow, classExtra } = getTargetAwareStyles(m, itemName, getGlowColorForCategory(category || command, inlineCategories), target);
                const buttonId = `auto-item-${noun}`;
                const isSelected = selectedPrefixes.has(`${command}:${buttonId}`);
                return `<span class="inline-btn auto-item${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(noun)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
            },
            length: itemName.length
        });
    });

    // 7. Combat Verbs
    candidates.push({
        pattern: '\\*+[A-Z]+\\*+',
        isRegex: true,
        priority: 10,
        replacer: (m) => `<span class="keyword-highlight combat-verb">${m}</span>`,
        length: 5
    });

    // 8. Key Status Words
    statusKeywords.forEach(word => {
        candidates.push({
            pattern: word,
            priority: 10,
            replacer: (m) => `<span class="keyword-highlight status-word">${m}</span>`,
            length: word.length
        });
    });

    // 9. Combat Actions
    combatActions.forEach(word => {
        candidates.push({
            pattern: `\\b${word}(?:s|d|ed|ing)?\\b`,
            isRegex: true,
            priority: 10,
            replacer: (m) => `<span class="keyword-highlight combat-action">${m}</span>`,
            length: word.length
        });
    });

    // 10. Room Exits - Only highlight if this is an exits line
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

    // 11. Magic Words
    magicKeywords.forEach(magic => {
        candidates.push({
            pattern: `\\b${magic}(?:s|al|ally|ing)?\\b`,
            isRegex: true,
            priority: 20,
            replacer: (m) => `<span class="keyword-highlight magic-word">${m}</span>`,
            length: magic.length
        });
    });

    // 12. State Transitions (Locked, Closed, Latched)
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
                const keyword = getEffectiveKeyword(noun, undefined, undefined, keywordOverrides) || noun;
                
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

export const applyColorTaggedObjects = (
    html: string, 
    mid: string, 
    inlineCategories: InlineCategoryConfig[], 
    target: string | null, 
    type?: MessageType,
    keywordOverrides: Record<string, string> = {},
    selectedPrefixes: Set<string> = new Set(),
    roomPlayers: import('../types').GmcpOccupant[] = [],
    roomNpcs: import('../types').GmcpOccupant[] = []
): string => {
    if (!html.includes(OBJECT_SIGNAL_COLOR)) return html;

    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    // Normalized sets to check if the color-tagged object is actually an NPC or Player
    const pcNames = roomPlayers.map(p => typeof p === 'string' ? p : p.name).filter((n): n is string => !!n);
    const npcNames = roomNpcs.map(p => typeof p === 'string' ? p : p.name).filter((n): n is string => !!n);
    
    const normalizedPcSet = new Set(pcNames.map(normalize));
    const normalizedNpcSet = new Set(npcNames.map(normalize));

    let cmd: string;
    const lowerHtml = html.toLowerCase();
    const lowerInner = html.match(OBJECT_COLOR_RE)?.[2]?.toLowerCase() || '';
    
    if (type === 'equipment-list' || lowerHtml.includes('(worn)') || lowerInner.includes('(worn)')) cmd = 'inline-obj-worn';
    else if (type === 'shop-item') cmd = 'inline-obj-shop';
    else if (type === 'inventory-list' || lowerHtml.includes('(carried)') || lowerInner.includes('(carried)')) cmd = 'inline-obj-char';
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
        cmd = 'inline-obj-char';
    }
    else cmd = 'inline-obj-room';

    return html.replace(OBJECT_COLOR_RE, (_match, _open, innerHtml: string, _close) => {
        const displayName = decodeHtmlEntities(innerHtml);
        const name = displayName.toLowerCase();
        const keywordBase = name.replace(/^(a|an|some)\s+/, '').replace(/^pair\s+of\s+/, '');
        const keyword = keywordBase.replace(/\s+/g, '-');
        const finalContext = getEffectiveKeyword(displayName, undefined, undefined, keywordOverrides);

        const category = getCategoryForName(displayName, inlineCategories);
        let finalCmd = cmd;
        
        // Priority: If it matches a room NPC/PC by name, use 그 command
        const normalizedName = normalize(name);
        const normalizedStripped = normalize(keywordBase);
        
        if (normalizedNpcSet.has(normalizedName) || normalizedNpcSet.has(normalizedStripped)) {
            finalCmd = 'inlinenpc';
        } else if (normalizedPcSet.has(normalizedName) || normalizedPcSet.has(normalizedStripped)) {
            finalCmd = 'inlineplayer';
        } else if (category === 'inline-npc') {
            finalCmd = 'inlinenpc';
        }
        
        const baseGlow = getGlowColorForCategory(category || finalCmd, inlineCategories);
        const { glow, classExtra } = getTargetAwareStyles(displayName, finalContext, baseGlow, target);
        
        const buttonId = `auto-obj-${keyword}`;
        const isSelected = selectedPrefixes.has(`${finalCmd}:${buttonId}`);
        
        return `<span class="inline-btn auto-obj color-tagged-obj${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${finalCmd}" data-context="${esc(finalContext)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${innerHtml.replace(/,/g, '')}</span>`;
    });
};
