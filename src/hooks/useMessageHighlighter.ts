/**
 * @file useMessageHighlighter.ts
 * @description Hook that processes game message lines to add interactive highlights and buttons.
 */

import { useMemo, useCallback } from 'react';
import { 
    MessageType, 
    GmcpOccupant, 
    GroupMember, 
    InlineCategoryConfig,
    EntityKind,
} from '../types';
import { isObjectSelected } from '../utils/selectionUtils';
import { renderInlineSpan, esc } from '../utils/inlineSpanRenderer';
import { isInCorpseContext } from '../utils/highlighterUtils';
import { 
    getCategoryForName, 
    getCategoryType,
    getGlowColorForCategory
} from '../utils/categorizationUtils';
import { getMemberColor } from '../utils/groupUtils';
import { safeHighlight, applyColorTaggedObjects, getTargetAwareStyles } from '../utils/highlighterUtils';
import { useSpecialLineWrappers } from './useSpecialLineWrappers';

// Priority constants
const PRIO_CUSTOM_BUTTON = 100;
const PRIO_PC = 10;
const PRIO_NPC = 5;
const PRIO_ITEM = 2;
const PRIO_TARGET = 50;

/**
 * Hook that processes game message lines to add interactive highlights and buttons.
 */
export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: any, // keywordHighlights
    currentOccupants: GmcpOccupant[],
    roomNpcs: GmcpOccupant[], // often merged with occupants or used separately
    characterName: string,
    roomItems: any[],
    inlineCategories: InlineCategoryConfig[] = [],
    isHighlighterEnabled: boolean = true,
    highlightVersion: number = 0,
    discoveredItems: any[] = [],
    keywordOverrides: any = {},
    selectedObjectIds: Set<string> = new Set(),
    inCombat: boolean = false,
    spectateCharacterName: string | null = null,
    activeGroupMembers: GroupMember[] = []
) => {
    // Cache for compiled RegExps to avoid re-compiling on every line
    const regexCache = useMemo(() => new Map<string, RegExp>(), [highlightVersion]);
    
    // Get special line wrappers (menus, lists, movement, acquisition, etc)
    const { wrapSpecialLine } = useSpecialLineWrappers(
        selectedObjectIds, 
        activeGroupMembers, 
        inlineCategories, 
        regexCache
    );

    /**
     * Primary entry point for line processing.
     */
    const processMessageHtml = useCallback((html: string, mid: string, isRoomName: boolean, type?: MessageType, isCombatMessage?: boolean, combatSide?: 'player' | 'opponent' | 'groupmate'): string => {
        if (!isHighlighterEnabled) return html;

        // 1. Check for whole-line special wrappers (Menus, Stats, Lists, Movement, etc.)
        const wrappedLine = wrapSpecialLine(html, mid, type);
        if (wrappedLine) return wrappedLine;

        // 2. Otherwise apply inline highlights
        let processed = html;
        
        // Don't highlight structural lines or simple prompts
        if (type === 'prompt' || type === 'room-exits') return html;

        // Compute textOnly once for reuse in filters and matches
        const textOnly = html.replace(/<[^>]*>/g, '');

        // --- STEP 1: Apply Color-Tagged Objects (Built-in) ---
        processed = applyColorTaggedObjects(
            processed, 
            mid, 
            inlineCategories, 
            target, 
            type, 
            keywordOverrides, 
            selectedObjectIds, 
            currentOccupants, 
            roomNpcs, 
            activeGroupMembers, 
            textOnly
        );

        // --- STEP 2: Collect all candidate patterns for prioritized highlighting ---
        const candidates: Array<{
            pattern: string;
            isRegex: boolean;
            priority: number;
            render: (match: string) => string;
        }> = [];

        // 2a. Static Custom Highlights
        const keywords = buttonsRef.current || [];
        keywords.forEach((kh: any) => {
            if (!kh.pattern || !kh.enabled) return;
            candidates.push({
                pattern: kh.pattern,
                isRegex: !!kh.isRegex,
                priority: PRIO_CUSTOM_BUTTON,
                render: (match) => {
                    const style = `color: ${kh.color}; font-weight: ${kh.bold ? 'bold' : 'normal'};`;
                    return `<span class="keyword-highlight" style="${style}">${match}</span>`;
                }
            });
        });

        // 2b. Target Highlight (Highest Priority occupant/item)
        if (target) {
            candidates.push({
                pattern: target,
                isRegex: false,
                priority: PRIO_TARGET,
                render: (match) => renderInlineSpan({
                    id: `target-${target.toLowerCase().replace(/\s+/g, '-')}`,
                    mid,
                    cmd: 'target',
                    kind: 'none', // Target doesn't specify a kind
                    location: 'none',
                    context: target,
                    category: 'target',
                    glowColor: 'var(--accent)',
                    extraClasses: ['target-highlighter'],
                    innerHtml: match
                })
            });
        }

        // 2c. Occupants (NPCs/Players)
        const allOccupants = [...currentOccupants];
        roomNpcs.forEach(npc => {
            if (!allOccupants.find(o => o.name === npc.name)) allOccupants.push(npc);
        });

        allOccupants.forEach(occ => {
            const isNpc = !!occ.id;
            const category = isNpc ? (getCategoryForName(occ.name!, inlineCategories) || 'npc') : 'player';
            const baseColor = getGlowColorForCategory(category, inlineCategories);
            const { glow, classExtra } = getTargetAwareStyles(occ.name!, occ.name!, baseColor || '', target);
            const isCorpse = isInCorpseContext(occ.name!, textOnly);

            // Add the primary name match
            if (occ.name) {
                candidates.push({
                    pattern: occ.name,
                    isRegex: false,
                    priority: isNpc ? PRIO_NPC : PRIO_PC,
                    render: (match) => {
                        if (isCorpse) {
                            return renderInlineSpan({
                                id: 'auto-corpse',
                                mid,
                                cmd: 'object',
                                kind: 'object',
                                location: 'room',
                                context: occ.name!,
                                category: 'object-corpse',
                                selected: isObjectSelected(selectedObjectIds, 'auto-corpse', 'object'),
                                extraClasses: ['auto-item'],
                                innerHtml: match
                            });
                        }

                        const isSelected = isObjectSelected(selectedObjectIds, `auto-${occ.name}`, category);
                        const groupMemberIndex = activeGroupMembers.findIndex(gm => gm.name?.toLowerCase() === occ.name?.toLowerCase());
                        const isGroupmate = groupMemberIndex !== -1;

                        return renderInlineSpan({
                            id: isNpc ? (occ.id ? String(occ.id) : `roomnpcs:${occ.name}`) : `roomplayers:${occ.name}`,
                            mid,
                            cmd: occ.name!,
                            kind: isNpc ? 'npc' : 'player',
                            location: 'room',
                            context: occ.name!,
                            category: category,
                            glowColor: isGroupmate ? getMemberColor(groupMemberIndex).core : glow,
                            textColor: (isGroupmate || glow) ? 'var(--glow-color)' : undefined,
                            action: 'menu',
                            selected: isSelected,
                            draggable: true,
                            extraClasses: ['auto-occupant', isNpc ? 'npc-highlighter' : 'pc-highlighter', classExtra],
                            innerHtml: match
                        });
                    }
                });
            }

            // Add keyword match (crucial for MUME descriptive lines)
            if (occ.keyword && occ.keyword !== occ.name) {
                candidates.push({
                    pattern: occ.keyword,
                    isRegex: false,
                    priority: (isNpc ? PRIO_NPC : PRIO_PC) - 1, // Slightly lower than full name
                    render: (match) => {
                        const isSelected = isObjectSelected(selectedObjectIds, `auto-${occ.name}`, category);
                        return renderInlineSpan({
                            id: isNpc ? (occ.id ? String(occ.id) : `roomnpcs:${occ.name}`) : `roomplayers:${occ.name}`,
                            mid,
                            cmd: occ.name || occ.keyword!,
                            kind: isNpc ? 'npc' : 'player',
                            location: 'room',
                            context: occ.name || occ.keyword!,
                            category: category,
                            glowColor: glow,
                            textColor: glow ? 'var(--glow-color)' : undefined,
                            action: 'menu',
                            selected: isSelected,
                            draggable: true,
                            extraClasses: ['auto-occupant', isNpc ? 'npc-highlighter' : 'pc-highlighter', 'keyword-match', classExtra],
                            innerHtml: match
                        });
                    }
                });
            }
        });

        // 2d. Object Category Keywords
        inlineCategories.forEach(cat => {
            if (cat.kind !== 'object' || !cat.keywords) return;
            cat.keywords.forEach(keyword => {
                candidates.push({
                    pattern: keyword,
                    isRegex: false,
                    priority: PRIO_ITEM + 1, // Slightly above standard items
                    render: (match) => {
                        const buttonId = `auto-obj-${cat.id}-${keyword.toLowerCase().replace(/\s+/g, '-')}`;
                        return renderInlineSpan({
                            id: buttonId,
                            mid,
                            cmd: 'object',
                            kind: 'object',
                            location: 'room',
                            context: keyword,
                            category: cat.id,
                            action: 'menu',
                            selected: isObjectSelected(selectedObjectIds, buttonId, 'object'),
                            draggable: false,
                            extraClasses: ['auto-object'],
                            innerHtml: match
                        });
                    }
                });
            });
        });

        // 2e. Room/Discovered Items
        const allItems = [...roomItems, ...discoveredItems];
        const processedItemNames = new Set<string>();
        allItems.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            if (!itemName || processedItemNames.has(itemName)) return;
            processedItemNames.add(itemName);

            candidates.push({
                pattern: itemName,
                isRegex: false,
                priority: PRIO_ITEM,
                render: (match) => {
                    const category = getCategoryForName(itemName, inlineCategories) || 'object';
                    const kind = getCategoryType(category, inlineCategories) || 'object';
                    const baseColor = getGlowColorForCategory(category, inlineCategories);
                    const { glow, classExtra } = getTargetAwareStyles(itemName, itemName, baseColor || '', target);
                    const buttonId = `auto-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'object-room');

                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: itemName,
                        kind: kind as EntityKind,
                        location: 'room',
                        context: itemName,
                        category: category,
                        glowColor: glow,
                        textColor: glow ? 'var(--glow-color)' : undefined,
                        action: 'menu',
                        selected: isSelected,
                        draggable: true,
                        extraClasses: ['auto-obj', classExtra],
                        innerHtml: match
                    });
                }
            });
        });

        // --- STEP 3: Deterministic Run ---
        // Sort by priority DESC so higher priority candidates run later (and thus "win" by wrapping previous wraps)
        // Actually, safeHighlight handles non-overlapping matches. 
        // If we want deterministic "who wins", we should sort by priority DESC and apply them.
        // If multiple patterns match the same text, the one applied FIRST wins because safeHighlight 
        // won't touch already-wrapped spans.
        candidates.sort((a, b) => b.priority - a.priority);

        candidates.forEach(c => {
            processed = safeHighlight(processed, c.pattern, c.isRegex, c.render, regexCache);
        });

        return processed;
    }, [
        isHighlighterEnabled, wrapSpecialLine, buttonsRef, inlineCategories, target, keywordOverrides, 
        selectedObjectIds, currentOccupants, roomNpcs, activeGroupMembers, roomItems, discoveredItems, regexCache
    ]);

    return { processMessageHtml };
};
