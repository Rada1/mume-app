/**
 * @file useMessageHighlighter.ts
 * @description Hook that processes game message lines to add interactive highlights and buttons.
 */

import { useMemo, useCallback } from 'react';
import { 
    MessageType, 
    Occupant, 
    GroupMember, 
    InlineCategoryConfig,
} from '../types';
import { isObjectSelected } from '../utils/selectionUtils';
import { renderInlineSpan, esc } from '../utils/inlineSpanRenderer';
import { isInCorpseContext } from '../utils/highlighterUtils';
import { 
    getCategoryForName, 
    getCategoryType
} from '../utils/categorizationUtils';
import { getMemberColor } from '../utils/groupUtils';
import { safeHighlight, applyColorTaggedObjects } from '../utils/highlighterUtils';
import { useSpecialLineWrappers } from './useSpecialLineWrappers';

/**
 * Hook that processes game message lines to add interactive highlights and buttons.
 */
export const useMessageHighlighter = (
    target: string | null,
    buttonsRef: any, // keywordHighlights
    currentOccupants: Occupant[],
    roomNpcs: Occupant[], // often merged with occupants or used separately
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

    // --- Logic Section: Highlighting Layers ---

    /**
     * Applies static keyword highlights defined in buttonsRef (keywordHighlights).
     */
    const applyStaticHighlights = useCallback((html: string, mid: string) => {
        let result = html;
        const keywords = buttonsRef.current || [];
        
        keywords.forEach((kh: any) => {
            if (!kh.pattern || !kh.enabled) return;
            
            result = safeHighlight(result, kh.pattern, !!kh.isRegex, (match) => {
                const style = `color: ${kh.color}; font-weight: ${kh.bold ? 'bold' : 'normal'};`;
                return `<span class="keyword-highlight" style="${style}">${match}</span>`;
            }, regexCache);
        });
        return result;
    }, [buttonsRef, regexCache]);

    /**
     * Applies dynamic highlights based on room occupants (NPCs/Players) and categorized objects.
     */
    const applyDynamicHighlights = useCallback((html: string, mid: string) => {
        let result = html;

        // 1. NPC/Player Highlights (Room Occupants)
        const allOccupants = [...currentOccupants];
        // Merge roomNpcs if not already present
        roomNpcs.forEach(npc => {
            if (!allOccupants.find(o => o.name === npc.name)) {
                allOccupants.push(npc);
            }
        });

        allOccupants.forEach(occ => {
            if (!occ.name) return;
            
            result = safeHighlight(result, occ.name, false, (match) => {
                const textOnly = html.replace(/<[^>]*>/g, '');
                const isCorpse = isInCorpseContext(occ.name, textOnly);
                
                if (isCorpse) {
                    return renderInlineSpan({
                        id: 'auto-corpse',
                        mid,
                        cmd: 'object',
                        kind: 'object',
                        location: 'room',
                        context: occ.name,
                        category: 'object-corpse',
                        selected: isObjectSelected(selectedObjectIds, 'auto-corpse', 'object'),
                        extraClasses: ['auto-item'],
                        innerHtml: match
                    });
                }

                const isNpc = occ.type === 'npc';
                const category = isNpc ? 'npc' : 'player';
                const buttonId = isNpc ? `auto-npc-${occ.name}` : `auto-${occ.name}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, category);
                
                // Group highlighting
                const groupMemberIndex = activeGroupMembers.findIndex(gm => 
                    gm.name?.toLowerCase() === occ.name?.toLowerCase()
                );
                const isGroupmate = groupMemberIndex !== -1;
                const catType = isNpc ? 'npc' : 'player';

                return renderInlineSpan({
                    id: buttonId,
                    mid,
                    cmd: category,
                    kind: catType,
                    location: 'room',
                    context: occ.name,
                    category: category,
                    selected: isSelected,
                    draggable: true,
                    glowColor: isGroupmate ? getMemberColor(groupMemberIndex).core : undefined,
                    textColor: isGroupmate ? 'var(--glow-color)' : undefined,
                    extraClasses: ['auto-occupant', isNpc ? 'npc-highlighter' : 'pc-highlighter'],
                    innerHtml: match
                });
            }, regexCache);
        });

        // 2. Object Category Keywords
        inlineCategories.forEach(cat => {
            if (cat.type !== 'object' || !cat.keywords) return;
            
            cat.keywords.forEach(keyword => {
                result = safeHighlight(result, keyword, false, (match) => {
                    const buttonId = `auto-obj-${cat.name}-${keyword.toLowerCase().replace(/\s+/g, '-')}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'object');
                    
                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: 'object',
                        kind: 'object',
                        location: 'room',
                        context: keyword,
                        category: cat.id,
                        selected: isSelected,
                        draggable: true,
                        extraClasses: ['auto-object'],
                        innerHtml: match
                    });
                }, regexCache);
            });
        });

        return result;
    }, [currentOccupants, roomNpcs, activeGroupMembers, inlineCategories, selectedObjectIds, regexCache]);

    /**
     * Applies highlights for room items and discovered items.
     */
    const applyItemHighlights = useCallback((html: string, mid: string) => {
        let result = html;
        const allItems = [...roomItems, ...discoveredItems];
        const processedNames = new Set<string>();

        allItems.forEach(item => {
            const itemName = typeof item === 'string' ? item : item.name;
            if (!itemName || processedNames.has(itemName)) return;
            processedNames.add(itemName);

            result = safeHighlight(result, itemName, false, (match) => {
                const itemCategory = getCategoryForName(itemName, inlineCategories) || 'object';
                const buttonId = `auto-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'object-room');
                const catType = getCategoryType(itemCategory, inlineCategories) || 'object';

                return renderInlineSpan({
                    id: buttonId,
                    mid,
                    cmd: 'object',
                    kind: catType,
                    location: 'room',
                    context: itemName,
                    category: itemCategory,
                    selected: isSelected,
                    draggable: true,
                    extraClasses: ['auto-item'],
                    innerHtml: match
                });
            }, regexCache);
        });

        return result;
    }, [roomItems, discoveredItems, inlineCategories, selectedObjectIds, regexCache]);

    // --- Logic Section: Main Processor ---

    /**
     * Primary entry point for line processing.
     */
    const processMessageHtml = useCallback((html: string, mid: string, type?: MessageType): string => {
        if (!isHighlighterEnabled) return html;

        // 1. Check for whole-line special wrappers (Menus, Stats, Lists, Movement, etc.)
        const wrappedLine = wrapSpecialLine(html, mid, type);
        if (wrappedLine) return wrappedLine;

        // 2. Otherwise apply inline highlights
        let processed = html;
        
        // Don't highlight structural lines or simple prompts
        if (type === 'prompt' || type === 'room-exits') return html;

        // Apply highlights in layers
        const textOnly = html.replace(/<[^>]*>/g, '');
        
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
        processed = applyStaticHighlights(processed, mid);
        processed = applyDynamicHighlights(processed, mid);
        processed = applyItemHighlights(processed, mid);

        return processed;
    }, [
        isHighlighterEnabled, wrapSpecialLine, applyStaticHighlights, applyDynamicHighlights, 
        applyItemHighlights, inlineCategories, target, keywordOverrides, 
        selectedObjectIds, currentOccupants, roomNpcs, activeGroupMembers
    ]);

    return { processMessageHtml };
};
