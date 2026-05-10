import { useCallback } from 'react';
import { MessageType, GroupMember, InlineCategoryConfig } from '../types';
import { isObjectSelected } from '../utils/selectionUtils';
import { renderInlineSpan, esc } from '../utils/inlineSpanRenderer';
import { safeHighlight, ARRIVE_REGEX, LEAVE_REGEX } from '../utils/highlighterUtils';
import { getMemberColor } from '../utils/groupUtils';
import { getCategoryIdForKindLocation, getKindForCategory } from '../utils/inlineActionModel';

export const useSpecialLineWrappers = (
    selectedObjectIds: Set<string> = new Set(),
    groupMembers: GroupMember[] = [],
    inlineCategories: InlineCategoryConfig[] = [],
    regexCache?: Map<string, RegExp>
) => {
    
    /**
     * Checks if a line matches a special message type and returns a wrapped version if so.
     * Returns null if no special wrapping is applicable.
     */
    const wrapSpecialLine = useCallback((originalHtml: string, mid: string, type?: MessageType): string | null => {
        
        // --- 3. Quest List Highlighting ---
        if (type === 'quest-list') {
            const textOnly = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            if (textOnly.length > 0) {
                const lowerText = textOnly.toLowerCase();
                const isHeader = lowerText.includes('you have') || 
                                 lowerText.includes('you are') || 
                                 lowerText.includes('unfinished') || 
                                 lowerText.startsWith('(*') ||
                                 lowerText.includes('---');
                
                if (!isHeader) {
                    const context = textOnly.startsWith('*') ? textOnly.substring(1).trim().split(/\s*[-:]\s*/)[0].trim() : textOnly;
                    const buttonId = `quest-${context.toLowerCase().replace(/\s+/g, '-')}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'quest');
                    
                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: 'button',
                        kind: 'control',
                        location: 'none',
                        context: context,
                        action: 'command',
                        category: 'quest',
                        selected: isSelected,
                        extraClasses: ['auto-quest'],
                        dataAttrs: { 'from-drawer': 'true' },
                        innerHtml: originalHtml
                    });
                }
            }
        }

        // --- 4. Comm Sender Highlighting ---
        if (type === 'comm-sender') {
            const name = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
            const buttonId = `auto-${name}`;
            const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'player');
            
            return renderInlineSpan({
                id: buttonId,
                mid,
                cmd: name,
                kind: 'ally',
                location: 'room',
                context: name,
                category: 'cat-ally',
                action: 'menu',
                selected: isSelected,
                draggable: true,
                extraClasses: ['auto-occupant', 'pc-highlighter'],
                innerHtml: originalHtml
            });
        }

        // --- 6. WHO/WHERE List Highlighting ---
        if (type === 'who-list' || type === 'where-list') {
            const textOnly = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
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
                const htmlNameCandidate = nameCandidate.replace(/[^\x00-\x7F]/g, c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`);
                let highlighted = false;
                return safeHighlight(originalHtml, htmlNameCandidate, false, (m) => {
                    if (highlighted) return m;
                    highlighted = true;
                    const buttonId = `auto-${nameCandidate}`;
                    const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'player');
                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: nameCandidate,
                        kind: 'ally',
                        location: 'room',
                        context: nameCandidate,
                        category: 'cat-ally',
                        action: 'menu',
                        selected: isSelected,
                        draggable: true,
                        extraClasses: ['auto-occupant', 'pc-highlighter'],
                        innerHtml: m
                    });
                }, regexCache);
            }
        }

        // --- 7. Movement Highlighting (Arrive/Leave) ---
        const textOnly = originalHtml.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
        const arriveMatch = textOnly.match(ARRIVE_REGEX);
        const leaveMatch = textOnly.match(LEAVE_REGEX);

        if (arriveMatch || leaveMatch) {
            const movementMatch = arriveMatch || leaveMatch!;
            const subject = movementMatch[1];
            if (subject) {
                const subjectLower = subject.toLowerCase();
                const isNpcSubject = /^(a|an|the|some)\s/i.test(subject);
                const kind = isNpcSubject ? 'npc' : 'ally';
                const category = getCategoryIdForKindLocation(kind, 'room');
                const buttonId = isNpcSubject ? `auto-npc-${subject}` : `auto-${subject}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, kind);
                
                const groupMemberIndex = groupMembers?.findIndex(gm => 
                    gm.name?.toLowerCase() === subjectLower ||
                    (isNpcSubject && subjectLower.includes(gm.name?.toLowerCase() || '---'))
                );
                const isGroupmate = groupMemberIndex !== undefined && groupMemberIndex !== -1;

                return safeHighlight(originalHtml, subject, false, (m) => {
                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: subject,
                        kind: kind,
                        location: 'room',
                        context: subject,
                        category: category,
                        action: 'menu',
                        selected: isSelected,
                        draggable: true,
                        glowColor: isGroupmate ? getMemberColor(groupMemberIndex).core : undefined,
                        textColor: isGroupmate ? 'var(--glow-color)' : undefined,
                        extraClasses: ['auto-occupant', 'movement-subject', isNpcSubject ? 'npc-highlighter' : 'pc-highlighter'],
                        innerHtml: m
                    });
                }, regexCache);
            }
        }

        // --- 8. Item Acquisition Highlighting ---
        const acquisitionMatch = textOnly.match(/You now have (?:a|an)\s+(.*?)(?:\.|$)/i);
        if (acquisitionMatch) {
            const itemName = acquisitionMatch[1]?.trim();
            if (itemName) {
                const category = getCategoryIdForKindLocation('object', 'carried');
                const buttonId = `auto-item-${itemName.toLowerCase().replace(/\s+/g, '-')}`;
                const isSelected = isObjectSelected(selectedObjectIds, buttonId, 'object');
                const kind = getKindForCategory(category) || 'object';
                
                return safeHighlight(originalHtml, itemName, false, (m) => {
                    return renderInlineSpan({
                        id: buttonId,
                        mid,
                        cmd: 'object',
                        kind: kind,
                        location: 'carried',
                        context: itemName,
                        category: category,
                        action: 'menu',
                        selected: isSelected,
                        draggable: false,
                        extraClasses: ['auto-item'],
                        innerHtml: m
                    });
                }, regexCache);
            }
        }

        return null;
    }, [selectedObjectIds, groupMembers, regexCache]);

    return { wrapSpecialLine };
};
