/**
 * @file highlighterUtils.ts
 * @description Helper functions for building highlighter candidates
 */

import { RefObject } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { pluralizeMumeSubject } from './gameUtils';
import { getGlowColorForCategory, getCategoryForName } from './categorizationUtils';
import { getEffectiveKeyword } from './keywordUtils';
import { getMemberColor } from './groupUtils';
import {
    statusKeywords,
    combatActions,
    exitDirections,
    magicKeywords
} from '../constants/highlighterItems';
import { isObjectSelected } from './selectionUtils';

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
    selectedObjectIds: Set<string> = new Set(),
    isCombatLine: boolean = false,
    inCombat: boolean = false,
    combatSide?: 'player' | 'opponent' | 'groupmate',
    spectateCharacterName?: string | null,
    groupMembers?: import('../types').GroupMember[]
): Candidate[] => {
    const candidates: Candidate[] = [];
    // Normalized sets to handle accent mismatches (e.g. Dúnadan vs Dunadan)
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const ACCENT_MAP: Record<string, string> = {
        'a': '[a\u00e0-\u00e5\u00c0-\u00c5]',
        'e': '[e\u00e8-\u00eb\u00c8-\u00cb]',
        'i': '[i\u00ec-\u00ef\u00cc-\u00cf]',
        'o': '[o\u00f2-\u00f6\u00d2-\u00d6]',
        'u': '[u\u00f9-\u00fc\u00d9-\u00dc]',
        'n': '[n\u00f1\u00d1]',
        'c': '[c\u00e7\u00c7]'
    };

    const toAccentAgnosticCore = (s: string) => {
        let res = '';
        const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        for (const char of norm) {
            if (ACCENT_MAP[char]) {
                res += ACCENT_MAP[char];
            } else {
                res += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
        }
        return res;
    };

    const WORD_BOUNDARY_START = `(?:^|(?<=[\\s\\.,:;\\!'(m\\[>]))`;
    const WORD_BOUNDARY_END = `(?=[\\s\\.,:;\\!'()&\\x1b\\]<]|&#(?:x27|39|apos);|$)`;

    const toAccentAgnostic = (s: string) => {
        // Use a simpler word boundary for MUD text
        // Include ' and its HTML entities (&#x27; &#39; &apos;) so possessives like "orc-guard's" match
        return `${WORD_BOUNDARY_START}${toAccentAgnosticCore(s)}${WORD_BOUNDARY_END}`;
    };

    // Always exclude the *app user's* own name — you never want your own name as a button
    // in your own log. In spectate mode we still exclude characterName for the same reason,
    // but we do NOT exclude spectateCharacterName: the snooped player's name should always be
    // a clickable button so the spectator can interact with them (look, assist, etc.).
    // Room.Chars.Set from MUME never includes the room "owner" themselves (they are "you"
    // to their own client), so without explicit injection the snooped player's name would
    // never appear in any PC source and would be invisible to the highlighter.
    const selfName = characterName;

    const pcNamesList = roomPlayers.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name && name !== selfName);

    // Add group members to the list (ensures groupmates are always buttons even if room GMCP is delayed)
    if (groupMembers) {
        groupMembers.forEach(m => {
            if (m.name && m.name !== selfName && !pcNamesList.includes(m.name)) {
                pcNamesList.push(m.name);
            }
        });
    }

    // In spectate mode, always inject the snooped character's name as a PC so their actions
    // in the log ("Khach wakes up", "Khach enters combat...") are highlighted and clickable.
    if (spectateCharacterName && spectateCharacterName !== selfName && !pcNamesList.includes(spectateCharacterName)) {
        pcNamesList.push(spectateCharacterName);
    }
    const pcNamesSet = new Set(pcNamesList);
    const npcNames = roomNpcs.map(p => typeof p === 'string' ? p : p.name).filter((name): name is string => !!name);
    
    const npcNamesSet = new Set(npcNames);
    const normalizedPcSet = new Set(pcNamesList.map(normalize));
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
        const isSelected = isObjectSelected(selectedObjectIds, buttonId, command);

        candidates.push({
            pattern: target,
            priority: 1, // Lowest priority: only highlights if no other button matches this text
            replacer: (m, _match) => `<span class="inline-btn auto-target active-target${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(m)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}; color: ${glowColor}">${m.replace(/,/g, '')}</span>`,
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
                const isSelected = isObjectSelected(selectedObjectIds, b.id, finalCommand);
                return `<span class="inline-btn${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${b.id}" data-mid="${mid}" data-cmd="${esc(finalCommand)}" data-context="${esc(m)}" data-icon="${esc(b.icon || '')}" data-label="${esc(finalLabel)}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="${b.trigger?.spit ? 'true' : 'false'}" data-duration="${b.trigger?.duration || ''}" data-swipes='${b.swipeCommands ? JSON.stringify(b.swipeCommands).replace(/'/g, "&apos;") : ""}' data-swipe-actions='${b.swipeActionTypes ? JSON.stringify(b.swipeActionTypes).replace(/'/g, "&apos;") : ""}' style="--glow-color: ${glow}">${m}</span>`;
            },
            length: pattern.length
        });
    });

    // 3. PCs
    pcNamesSet.forEach(name => {
        const stripped = name.replace(/^(A|An|The|Some)\s+/i, '');
        const patterns = new Set([
            name,
            stripped,
            pluralizeMumeSubject(name),
            pluralizeMumeSubject(stripped)
        ].filter(Boolean));

        // MUME PC names are often stored with a title ("Khazik the Brave", "Ildaeth the Elf").
        // Log/action text only uses the first token ("Khazik wakes up"), so add the first word
        // as a pattern whenever the name is multi-word and doesn't start with an article.
        if (stripped.includes(' ')) {
            const firstWord = stripped.split(/\s+/)[0];
            if (firstWord && firstWord.length > 1) {
                patterns.add(firstWord);
                patterns.add(pluralizeMumeSubject(firstWord));
            }
        }
        
        patterns.forEach(p => {
            candidates.push({
                pattern: toAccentAgnostic(p),
                isRegex: true,
                priority: 5,
                replacer: (m, _match) => {
                    const groupMemberIndex = groupMembers?.findIndex(gm => gm.name.toLowerCase() === name.toLowerCase());
                    const isGroupmate = groupMemberIndex !== undefined && groupMemberIndex !== -1;
                    
                    let baseColor = 'rgba(125, 211, 252, 1)'; // Default PC blue
                    if (isGroupmate && groupMembers) {
                        baseColor = getMemberColor(groupMemberIndex).core;
                    }
                    
                    const { glow, classExtra } = getTargetAwareStyles(m, name, baseColor, target);
                    const buttonId = `auto-${name}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'inlineplayer');
                    return `<span class="inline-btn auto-occupant pc-highlighter${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(name)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}; font-weight: 800">${m.replace(/,/g, '')}</span>`;
                },
                length: p.length
            });
        });
    });

    // 4. NPCs
    const pSet = new Set(Array.from(pcNamesSet).map(p => p.toLowerCase()));
    if (characterName) pSet.add(characterName.toLowerCase());

    const npcOccupants = [...roomNpcs];
    // Add current target as an NPC candidate if not already present and not a PC
    if (target && target.length > 2 && !pSet.has(target.toLowerCase())) {
        const isAlreadyIn = npcOccupants.some(n => (typeof n === 'string' ? n : n.name)?.toLowerCase() === target.toLowerCase());
        if (!isAlreadyIn) {
            npcOccupants.push({ name: target, id: `target-${target}` } as any);
        }
    }

    const corpseGlowColor = getGlowColorForCategory('inline-corpses', inlineCategories) || 'rgba(180, 100, 50, 0.9)';

    // Pre-detect which NPC names appear in "corpse of ..." context in this message.
    // MUME often splits "corpse of a pack horse" across HTML color spans, so we can't
    // rely on a single regex matching the full phrase in safeHighlight. Instead, check
    // the tag-stripped textOnly and restyle NPC matches as corpses when appropriate.
    const lowerTextOnly = textOnly.toLowerCase();
    const isCorpseLine = lowerTextOnly.includes('corpse');
    const corpseNpcNames = new Set<string>(); // normalized NPC names that appear in corpse context
    if (isCorpseLine) {
        npcOccupants.forEach(occupant => {
            const name = typeof occupant === 'string' ? occupant : occupant.name;
            if (!name) return;
            const stripped = name.replace(/^(A|An|The|Some)\s+/i, '').toLowerCase();
            // Check all substrings: "corpse of a pack horse", "corpse of pack horse", etc.
            const corpseRe = new RegExp(`corpses?\\s+of\\s+(?:a |an |the |some )?${stripped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (corpseRe.test(lowerTextOnly)) {
                corpseNpcNames.add(normalize(stripped));
            }
        });
    }

    npcOccupants.forEach(occupant => {
        const originalName = typeof occupant === 'string' ? occupant : occupant.name;
        if (!originalName) return;
        const lowerName = originalName.toLowerCase();
        if (pSet.has(lowerName)) return;

        const stripped = originalName.replace(/^(A|An|The|Some)\s+/i, '');
        const normalizedOriginal = normalize(originalName);
        const normalizedStripped = normalize(stripped);

        // If this NPC name appears in a corpse context in this message,
        // render it as a corpse/object instead of an NPC.
        const isCorpseContext = corpseNpcNames.has(normalizedStripped);

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
            if (isCorpseContext) {
                // Corpse context: style as corpse/object instead of NPC
                const context = getEffectiveKeyword(originalName, undefined, undefined, keywordOverrides);
                candidates.push({
                    pattern: toAccentAgnostic(p),
                    isRegex: true,
                    priority: 6,
                    replacer: (m, _match) => {
                        const isSelected = isObjectSelected(selectedObjectIds, 'auto-corpse', 'inline-corpses');
                        return `<span class="inline-btn auto-item${isSelected ? ' selected' : ''}" draggable="true" data-id="auto-corpse" data-mid="${mid}" data-cmd="inline-corpses" data-context="${esc(context)}" data-action="menu" data-menu-display="list" style="--glow-color: ${corpseGlowColor}">${m.replace(/,/g, '')}</span>`;
                    },
                    length: p.length
                });
            } else {
                const category = getCategoryForName(originalName, inlineCategories);
                const command = 'inlinenpc';
                const context = getEffectiveKeyword(originalName, undefined, undefined, keywordOverrides);

                candidates.push({
                    pattern: toAccentAgnostic(p),
                    isRegex: true,
                    priority: 6, // Slightly higher than items to favor NPC match in ambiguous cases
                    replacer: (m, _match) => {
                        // Default to 'inlinenpc' which is Magenta.
                        let baseColor = getGlowColorForCategory(category || 'inlinenpc', inlineCategories) || 'rgba(217, 70, 239, 0.9)';
                        
                        // Check if this NPC is in the group (charmies)
                        const groupMemberIndex = groupMembers?.findIndex(gm => 
                            gm.name.toLowerCase() === originalName.toLowerCase() ||
                            gm.name.toLowerCase() === stripped.toLowerCase()
                        );
                        
                        if (groupMemberIndex !== undefined && groupMemberIndex !== -1) {
                            baseColor = getMemberColor(groupMemberIndex).core;
                        }

                        const { glow, classExtra } = getTargetAwareStyles(m, originalName, baseColor, target);
                        const buttonId = `auto-npc-${originalName}`;
                        const isSelected = isObjectSelected(selectedObjectIds, buttonId, command);
                        return `<span class="inline-btn auto-npc npc-highlighter${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${command}" data-context="${esc(context)}" data-category="${esc(category || '')}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${m.replace(/,/g, '')}</span>`;
                    },
                    length: p.length
                });
            }
        });
    });

    // 4.5. Corpses (generic fallback for corpses not matching any NPC)
    ['corpse', 'corpses'].forEach(p => {
        candidates.push({
            pattern: p,
            priority: 5,
            replacer: (m, _match) => {
                const isSelected = isObjectSelected(selectedObjectIds, 'auto-corpse', 'inline-corpses');
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

        let category = getCategoryForName(itemName, inlineCategories);
        
        // Force objects to stay objects even if they contain NPC keywords (e.g. "corpse of an orc")
        if (category && category.includes('npc')) {
            category = 'inline-obj-room';
        }
        
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
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, command);
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
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, command);
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

    // 8. Experience Highlighting
    ['receive your share of experience', 'receive \\d+ experience'].forEach(word => {
        candidates.push({
            pattern: word,
            isRegex: true,
            priority: 10,
            replacer: (m) => `<span class="keyword-highlight status-word">${m}</span>`,
            length: word.length
        });
    });

    // 9. Combat Actions
    // (Section removed: combat action highlighting disabled)

    // 10. Room Exits - Removed per user request

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
    ['locked', 'latched'].forEach(stateWord => {
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
    selectedObjectIds: Set<string> = new Set(),
    roomPlayers: import('../types').GmcpOccupant[] = [],
    roomNpcs: import('../types').GmcpOccupant[] = [],
    groupMembers: import('../types').GroupMember[] = []
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

        let category = getCategoryForName(displayName, inlineCategories);
        let finalCmd = cmd;
        
        // Priority: If it matches a room NPC/PC by name, use that command
        // Exception: if this is a corpse line, keep the NPC name as an object
        const normalizedName = normalize(name);
        const normalizedStripped = normalize(keywordBase);
        const isCorpseLineColor = lowerHtml.includes('corpse');

        if ((normalizedNpcSet.has(normalizedName) || normalizedNpcSet.has(normalizedStripped)) && !isCorpseLineColor) {
            finalCmd = 'inlinenpc';
        } else if (normalizedPcSet.has(normalizedName) || normalizedPcSet.has(normalizedStripped)) {
            finalCmd = 'inlineplayer';
            
            // Re-check for group status here to ensure color-tagged names also get the group color
            const groupMemberIndex = groupMembers?.findIndex(gm => normalize(gm.name) === normalizedName || normalize(gm.name) === normalizedStripped);
            if (groupMemberIndex !== -1 && groupMemberIndex !== undefined) {
                category = `group-${groupMemberIndex}`; // Temporary internal ID for color matching
            }
        }
        
        // Prevent objects from inheriting NPC colors just because their name contains an NPC keyword
        if (finalCmd.startsWith('inline-obj') && category && category.includes('npc')) {
            category = 'inline-obj-room'; // Force object styling
        }
        
        let baseGlow = getGlowColorForCategory(category || finalCmd, inlineCategories);
        
        // Special case for our temporary group ID
        if (category?.startsWith('group-')) {
            const idx = parseInt(category.split('-')[1]);
            baseGlow = getMemberColor(idx).core;
        }
        const { glow, classExtra } = getTargetAwareStyles(displayName, finalContext, baseGlow, target);
        
        const buttonId = `auto-obj-${keyword}`;
        const isSelected = isObjectSelected(selectedObjectIds, buttonId, finalCmd);
        
        return `<span class="inline-btn auto-obj color-tagged-obj${classExtra}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${finalCmd}" data-context="${esc(finalContext)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glow}; color: ${glow}">${innerHtml.replace(/,/g, '')}</span>`;
    });
};
