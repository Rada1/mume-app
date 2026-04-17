/**
 * @file useMessageHighlighter.ts
 * @description Hook for highlighting MUME game messages with interactive elements and keywords.
 */

import { useCallback, RefObject, useRef } from 'react';
import { CustomButton, InlineCategoryConfig, MessageType } from '../types';
import { buildHighlighterCandidates, applyColorTaggedObjects } from '../utils/highlighterUtils';
import { getGlowColorForCategory, getCategoryForName } from '../utils/categorizationUtils';
import { isObjectSelected } from '../utils/selectionUtils';
import { ARRIVE_REGEX, LEAVE_REGEX } from './useMessageLog';

// --- Logic Section: Message Processing & Highlighting ---

export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: RefObject<CustomButton[]>,
    roomPlayers: import('../types').GmcpOccupant[],
    roomNpcs: import('../types').GmcpOccupant[],
    characterName: string | null,
    roomItems: import('../types').GmcpOccupant[],
    inlineCategories: InlineCategoryConfig[] = [],
    isHighlighterEnabled: boolean = true,
    highlightVersion: number = 0,
    discoveredItems: string[] = [],
    keywordOverrides: Record<string, string> = {},
    selectedObjectIds: Set<string> = new Set(),
    inCombat: boolean = false,
    spectateCharacterName: string | null = null,
    groupMembers: import('../types').GroupMember[] = []
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
        const rp = roomPlayers.map(p => typeof p === 'string' ? p : `${p.id || ''}${p.name}`).join('|');
        const rn = roomNpcs.map(p => typeof p === 'string' ? p : `${p.id || ''}${p.name}`).join('|');
        const ri = roomItems.map(p => typeof p === 'string' ? p : `${p.id || ''}${p.name}`).join('|');
        const di = discoveredItems.join('|');
        const ic = inlineCategories.map(c => `${c.id}:${c.keywords.join(',')}`).join('|');
        const ko = Object.entries(keywordOverrides).map(([k, v]) => `${k}:${v}`).join('|');
        const g = groupMembers.map(m => `${m.id || ''}${m.name}`).join('|');
        const sel = Array.from(selectedObjectIds).join(',');
        return `${target || ''}:${rp}:${rn}:${ri}:${di}:${ic}:${ko}:${isHighlighterEnabled}:${highlightVersion}:${sel}:${inCombat}:${spectateCharacterName || ''}:${g}`;
    }, [target, roomPlayers, roomNpcs, roomItems, discoveredItems, inlineCategories, isHighlighterEnabled, highlightVersion, selectedObjectIds, keywordOverrides, inCombat, spectateCharacterName, groupMembers]);

    /**
     * Main entry point for processing a message's HTML and applying highlights.
     */
    const processMessageHtml = useCallback((originalHtml: string, mid: string, isRoomName: boolean, type?: MessageType, isCombatMessage: boolean = false, combatSide?: 'player' | 'opponent' | 'groupmate') => {
        if (!isHighlighterEnabled) {
            return originalHtml;
        }

        const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // --- 0. Rule: No highlighting for prompts in spectate mode ---
        if (type === 'prompt' && spectateCharacterName) {
            return originalHtml;
        }

        // --- 0.1. Rule: No highlighting for Room Names and Room Descriptions ---
        if (isRoomName || type === 'room-description') {
            return originalHtml;
        }

        // --- 1. Rule: Specialized Comm Sender Highlighting ---
        // If the type is 'comm-sender', we treat the entire input as a player name
        // and wrap it in the same interactive button markup used for PCs.
        if (type === 'comm-sender') {
            const name = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            const playerGlow = getGlowColorForCategory('inlineplayer');
            const buttonId = `auto-${name}`;
            const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'inlineplayer');
            
            return `<span class="inline-btn auto-occupant pc-highlighter${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(name)}" data-action="menu" data-menu-display="list" style="--glow-color: ${playerGlow}; color: var(--glow-color); font-weight: 800">${originalHtml}</span>`;
        }

        // --- 1.2. Rule: Account Selection Buttons (Whole-Line Wrapper) ---
        // We wrap the ENTIRE HTML for the line to avoid issues where ANSI color spans
        // split the text into multiple nodes (e.g., green digits vs white choice text).
        if (type === 'account-selection' || type === 'account-selection-edit') {
            const rawText = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            const numMatch = rawText.match(/\((\d+)\)/);
            const num = numMatch ? numMatch[1] : '';
            const accountGlow = '#facc15'; // MUME yellow
            const isEdit = type === 'account-selection-edit' || rawText.includes('Edit');
            const editAttr = isEdit ? 'data-account-stage="stat-editing"' : '';
            
            return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="${esc(num)}" data-action="command" ${editAttr} style="--glow-color: ${accountGlow}; color: inherit; font-weight: 800; cursor: pointer; display: inline-block; width: 100%">${originalHtml}</span>`;
        }

        // --- 1.3. Rule: Account Stat Edit Buttons (+/-) ---
        // Redesign: Transmute the standard stat line into a collection of styled blocks.
        if (type === 'account-stat-edit') {
            const statRegex = /([a-z]{3}):\s*(?:<[^>]+>)*(\d+)(?:<[^>]+>)*/gi;
            const accountGlow = '#facc15';
            
            const blocks = originalHtml.replace(statRegex, (m, stat, valStr) => {
                const val = parseInt(valStr);
                const plusCmd = `${stat} ${val + 1}`;
                const minusCmd = `${stat} ${val - 1}`;
                
                return `
                    <div class="stat-block">
                        <div class="stat-label">${stat}:</div>
                        <div class="stat-controls">
                            <span class="inline-btn stat-btn" data-mid="${mid}" data-cmd="${esc(plusCmd)}" data-action="command" data-silent="true" style="--glow-color: ${accountGlow}">+</span>
                            <span class="stat-value">${valStr}</span>
                            <span class="inline-btn stat-btn" data-mid="${mid}" data-cmd="${esc(minusCmd)}" data-action="command" data-silent="true" style="--glow-color: ${accountGlow}">-</span>
                        </div>
                    </div>
                `.trim();
            });
            
            // Note: We wrap in a container that allows the blocks to wrap naturally.
            return `<div class="stat-editor-row">${blocks}</div>`;
        }

        // --- 1.4. Rule: Account Character List Buttons ---
        // Specifically for the 'list' output in the account menu or character selection.
        if (type === 'account-character-list') {
            const rawText = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            // If it's the indexed format "1) Name", we want the name (second word). 
            // If it's tabular "Name race level", we want the name (first word).
            const parts = rawText.split(/\s+/);
            const characterName = parts[0].endsWith(')') ? parts[1] : parts[0];
            const accountGlow = '#facc15';
            
            return safeHighlight(originalHtml, characterName, false, (m) => {
                return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="play ${esc(characterName)}" data-action="command" style="--glow-color: ${accountGlow}; color: var(--glow-color); font-weight: 800; border-bottom: 1px solid var(--glow-color)">${m}</span>`;
            });
        }

        // --- 1.1. Rule: No general highlighted words in room names, EXCEPT the active target ---
        if (isRoomName) {
            if (target) {
                const glowColor = '#facc15'; // Target gold
                return safeHighlight(originalHtml, target, false, (m) => {
                    return `<span class="inline-btn auto-target active-target" draggable="true" data-mid="${mid}" data-cmd="target" data-context="${esc(target)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}">${m}</span>`;
                });
            }
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

        // --- 0. Color-tagged object detection (runs first so highlightDepth protects these spans) ---
        newHtml = applyColorTaggedObjects(newHtml, mid, inlineCategories, target, type, keywordOverrides, selectedObjectIds, roomPlayers, roomNpcs);

        const textOnly = targetHtml
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&#x([0-9A-Fa-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .replace(/&#([0-9]+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
            .normalize('NFC');

        // --- 0.5. Movement Highlighting (Arrive/Leave/Enter) ---
        // Match Arrive/Leave patterns and wrap verb/direction in bright-white spans.
        const arriveMatch = textOnly.match(ARRIVE_REGEX);
        const leaveMatch = textOnly.match(LEAVE_REGEX);

        if (arriveMatch || leaveMatch) {
            const movementMatch = arriveMatch || leaveMatch!;
            const subject = movementMatch[1];
            const verb = movementMatch[2];
            const direction = movementMatch[4];

            if (subject) {
                const subjectLower = subject.toLowerCase();
                const isNpcSubject = /^(a|an|the|some)\s/i.test(subject);
                const category = isNpcSubject ? 'inlinenpc' : 'inlineplayer';
                const glowColor = getGlowColorForCategory(category, inlineCategories);
                const buttonId = isNpcSubject ? `auto-npc-${subject}` : `auto-${subject}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, category);
                
                newHtml = safeHighlight(newHtml, subject, false, (m) => {
                    return `<span class="inline-btn auto-occupant movement-subject ${isNpcSubject ? 'npc-highlighter' : 'pc-highlighter'}${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="${category}" data-context="${esc(subject)}" data-action="menu" data-menu-display="list" style="--glow-color: ${glowColor}; color: ${glowColor}; font-weight: 800">${m}</span>`;
                });
            }

        }

        // --- 0.6. Item Acquisition Highlighting ---
        // Match "You now have a(n) <item>." and wrap the item in an interactive span.
        // We do this BEFORE built-in candidates to ensure specific acquisition context is captured.
        const acquisitionMatch = textOnly.match(/You now have (?:a|an)\s+(.*?)(?:\.|$)/i);
        if (acquisitionMatch) {
            const itemName = acquisitionMatch[1]?.trim();
            if (itemName) {
                const itemCategory = getCategoryForName(itemName, inlineCategories) || 'inline-default';
                const itemGlow = getGlowColorForCategory(itemCategory, inlineCategories);
                const buttonId = `auto-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'inline-obj-char');
                
                newHtml = safeHighlight(newHtml, itemName, false, (m) => {
                    return `<span class="inline-btn auto-item${isSelected ? ' selected' : ''}" draggable="true" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="inline-obj-char" data-context="${esc(itemName)}" data-action="menu" data-menu-display="list" style="--glow-color: ${itemGlow}; color: var(--glow-color); font-weight: 800">${m}</span>`;
                });
            }
        }


        // --- 3.5. Quest List Highlighting ---
        if (type === 'quest-list') {
            const trimmed = textOnly.trim();
            if (trimmed.length > 0) {
                const lowerTrimmed = trimmed.toLowerCase();
                // Exclude headers, informational lines, and separators
                const isHeader = lowerTrimmed.includes('you have') || 
                                 lowerTrimmed.includes('you are') || 
                                 lowerTrimmed.includes('unfinished') || 
                                 lowerTrimmed.startsWith('(*') ||
                                 lowerTrimmed.includes('---');
                
                if (!isHeader) {
                    // It's a quest name or area name (e.g., "Valinor")
                    const questGlow = '#facc15'; // Quest yellow
                    // If it starts with *, strip it and take the name before any description dash/colon
                    const context = trimmed.startsWith('*') ? trimmed.substring(1).trim().split(/\s*[-:]\s*/)[0].trim() : trimmed;
                    const buttonId = `quest-${context.toLowerCase().replace(/\s+/g, '-')}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'quest');
                    
                    return `<span class="inline-btn auto-quest${isSelected ? ' selected' : ''}" data-id="${esc(buttonId)}" data-mid="${mid}" data-cmd="quest %n" data-context="${esc(context)}" data-action="command" data-from-drawer="true" style="--glow-color: ${questGlow}; color: var(--glow-color); font-weight: 800">${originalHtml}</span>`;
                }
            }
        }

        // --- 3.5.1 Account Menu Item Highlighting ---
        if (type === 'account-menu-item') {
            const menuKeywords = ['create', 'play', 'time', 'list', 'move', 'password', 'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit', 'side', 'race', 'level', 'alphabetic', 'custom'];
            let tempHtml = originalHtml;
            const accountGlow = '#facc15'; // MUME yellow

            menuKeywords.forEach(kw => {
                tempHtml = safeHighlight(tempHtml, kw, false, (m) => {
                    const lower = m.toLowerCase();
                    if (lower === 'play') {
                        return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-action="menu" data-cmd="play-character-select" style="--glow-color: ${accountGlow}; color: var(--glow-color); font-weight: 800; border-bottom: 1px solid var(--glow-color)">${m}</span>`;
                    }
                    return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="${esc(lower)}" data-action="command" style="--glow-color: ${accountGlow}; color: var(--glow-color); font-weight: 800; border-bottom: 1px solid var(--glow-color)">${m}</span>`;
                });
            });

            // Handle special keywords NEW and ? separately
            tempHtml = safeHighlight(tempHtml, 'NEW', false, (m) => {
                return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="new" data-action="command" style="--glow-color: ${accountGlow}; color: var(--glow-color); font-weight: 800; border-bottom: 1px solid var(--glow-color)">${m}</span>`;
            });
            tempHtml = safeHighlight(tempHtml, '\\?', true, (m) => {
                return `<span class="inline-btn auto-account-cmd" data-mid="${mid}" data-cmd="?" data-action="command" style="--glow-color: ${accountGlow}; color: var(--glow-color); font-weight: 800; border-bottom: 1px solid var(--glow-color)">${m}</span>`;
            });

            return tempHtml;
        }

        // --- 3.6. Specialized List Highlighting (WHO/WHERE) ---
        if (type === 'who-list' || type === 'where-list') {
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
            const commonHeaders = ['Players', 'Player', 'Allies', 'Minions', 'Who', 'Where', 'Visible'];
            if (nameCandidate && nameCandidate.length > 2 && /^[A-Z\u00C0-\u00DE]/.test(nameCandidate) && !commonHeaders.includes(nameCandidate)) {
                // Search newHtml using the entity-encoded form (how ansi-to-html wrote it)
                const htmlNameCandidate = nameCandidate.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`);
                let highlighted = false;
                const playerGlow = getGlowColorForCategory('inlineplayer');
                newHtml = safeHighlight(newHtml, htmlNameCandidate, false, (m) => {
                    if (highlighted) return m;
                    highlighted = true;
                    const buttonId = `auto-${nameCandidate}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'inlineplayer');
                    return `<span class="inline-btn auto-occupant pc-highlighter${isSelected ? ' selected' : ''}" draggable="true" data-id="auto-${esc(nameCandidate)}" data-mid="${mid}" data-cmd="inlineplayer" data-context="${esc(nameCandidate)}" data-action="menu" data-menu-display="list" style="--glow-color: ${playerGlow}; color: var(--glow-color); font-weight: 800">${m}</span>`;
                });
            }
        }

        // --- 3.6. Combat Damage Highlighting ---
        // (Section removed: combat message highlighting for 'hit, body, etc' is now disabled)

        if (!isRoomName) {
            // Build and sort candidates using utility
            const candidates = buildHighlighterCandidates(
                mid || 'unknown', target, buttonsRef, roomPlayers, roomNpcs, characterName, 
                roomItems, discoveredItems, inlineCategories, type, textOnly, keywordOverrides,
                selectedObjectIds, isCombatMessage, inCombat, combatSide, spectateCharacterName,
                groupMembers
            );

            candidates
                .sort((a, b) => {
                    if (b.priority !== a.priority) return b.priority - a.priority;
                    return b.length - a.length;
                })
                .forEach(c => {
                    newHtml = safeHighlight(newHtml, c.pattern, !!c.isRegex, c.replacer);
                });

            // --- 4. Special Pass: Full-Line Spat Buttons ---
            // These match against the textOnly content but wrap the entire HTML line.
            // This is necessary for sentence-level triggers where parts of the sentence 
            // (like the name) might already be wrapped in tags.
            buttonsRef.current?.filter(b => b.trigger?.spit && b.trigger?.enabled && b.trigger.pattern).forEach(b => {
                const pattern = b.trigger!.pattern!;
                const isRegex = b.trigger!.isRegex;
                const regex = new RegExp(isRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                
                const match = regex.exec(textOnly);
                if (match) {
                    let finalLabel = b.label;
                    let finalCommand = b.command;
                    for (let i = 1; i < match.length; i++) {
                        const val = match[i] || '';
                        finalLabel = finalLabel.replace(new RegExp(`\\$${i}`, 'g'), val);
                        finalCommand = finalCommand.replace(new RegExp(`\\$${i}`, 'g'), val);
                    }
                    
                    const isSelected = isObjectSelected(selectedObjectIds, b.id, finalCommand);
                    const glowColor = b.style.backgroundColor || 'var(--accent)';
                    
                    // Wrap the entire line HTML in the spat trigger
                    newHtml = `<span class="inline-btn spat-row-trigger${isSelected ? ' selected' : ''}" data-id="${b.id}" data-mid="${mid}" data-cmd="${esc(finalCommand)}" data-context="${esc(textOnly)}" data-icon="${esc(b.icon || '')}" data-label="${esc(finalLabel)}" data-color="${b.style.backgroundColor}" data-action="${b.actionType || 'command'}" data-menu-display="${b.menuDisplay || 'list'}" data-spit="true" data-duration="${b.trigger?.duration || 20}" style="--glow-color: ${glowColor}">${newHtml}</span>`;
                }
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
    }, [target, buttonsRef, roomPlayers, roomNpcs, characterName, roomItems, inlineCategories, generateDepsHash, highlightVersion, discoveredItems, isHighlighterEnabled, keywordOverrides, selectedObjectIds, inCombat, spectateCharacterName, groupMembers]);

    return { processMessageHtml };
};
