/**
 * @file useQuestsHandler.ts
 * @description Custom hook to handle quest parsing and state management for MUME.
 */

import { useState, useRef, useCallback } from 'react';
import { Quest, QuestData } from '../types';

export function useQuestsHandler(
    setQuests: (val: QuestData | ((prev: QuestData) => QuestData)) => void,
    activeQuests: Quest[]
) {
    const isQuestsActiveRef = useRef(false);
    const isDetailActiveRef = useRef(false);
    const isAreaPendingRef = useRef(false);
    const areaRef = useRef<string>('');
    const parsedQuestsRef = useRef<Quest[]>([]);
    const currentQuestRef = useRef<Partial<Quest> | null>(null);

    const parseQuestLine = useCallback((text: string): boolean => {
        const textOnly = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const lower = textOnly.toLowerCase();

        console.log(`[QuestsHandler] Parsing line: "${textOnly}"`, { 
            isActive: isQuestsActiveRef.current, 
            isAreaPending: isAreaPendingRef.current,
            isDetail: isDetailActiveRef.current 
        });

        // 1. Detect start of quest list
        if (textOnly.includes('You have learnt of a quest in this area:')) {
            isQuestsActiveRef.current = true;
            isAreaPendingRef.current = true; // The NEXT line should be the area
            isDetailActiveRef.current = false;
            parsedQuestsRef.current = [];
            currentQuestRef.current = null;
            return true;
        }

        if (textOnly.includes('You have not found any new quests.')) {
            console.log('[QuestsHandler] No quests found message detected.');
            isQuestsActiveRef.current = true; // Still active to allow finalize to clear
            isAreaPendingRef.current = false;
            return true;
        }

        if (isQuestsActiveRef.current) {
            // Detect area name (usually follows the "You have learnt..." line)
            if (isAreaPendingRef.current) {
                // Heuristic: Area names usually don't start with '*' or 'You'
                if (!textOnly.startsWith('*') && !textOnly.startsWith('You')) {
                    const areaMatch = textOnly.match(/^([^*]+)\*?$/);
                    if (areaMatch) {
                        areaRef.current = areaMatch[1].trim();
                        isAreaPendingRef.current = false;
                        console.log(`[QuestsHandler] Area detected: "${areaRef.current}"`);
                        return true;
                    }
                }
                // If we didn't match, we still need to clear pending or we'll swallow quests
                isAreaPendingRef.current = false;
            }

            // Detect "You are in Eriador with the following unfinished quest:"
            if (textOnly.includes('with the following unfinished quest:')) {
                const innerAreaMatch = textOnly.match(/You are in (.*?) with/);
                if (innerAreaMatch) {
                    areaRef.current = innerAreaMatch[1].trim();
                    console.log(`[QuestsHandler] Area from 'unfinished' line: "${areaRef.current}"`);
                }
                return true;
            }

            // Detect specific quest line: " * Araduin's request - Araduin will point me to quests around Bree-land"
            // Or " * Araduin's request : description"
            const questMatch = textOnly.match(/^\s*\*\s*([^-:]+)\s*[-:]\s*(.*)$/);
            if (questMatch) {
                const name = questMatch[1].trim();
                const description = questMatch[2].trim();
                const id = name.toLowerCase().replace(/['\s]+/g, '-');
                
                console.log(`[QuestsHandler] Quest found: "${name}" in "${areaRef.current}"`);

                parsedQuestsRef.current.push({
                    id,
                    name,
                    description,
                    isUnfinished: true,
                    area: areaRef.current
                });
                return true;
            }

            // Detect informational text
            if (textOnly.startsWith('(* = You haven\'t finished this quest.')) {
                return true;
            }
        }

        // 2. Detect individual quest details (quest <name>)
        // Araduin's request
        // Description follows...
        
        // If not already in a detail/list, check if this line is a quest name
        // Use trim and replace any strange whitespace
        const cleanLower = lower.trim().replace(/\s+/g, ' ');
        const matchedQuest = !isQuestsActiveRef.current && activeQuests.find(q => q.name.toLowerCase().trim().replace(/\s+/g, ' ') === cleanLower);

        if (matchedQuest) {
            isDetailActiveRef.current = true;
            currentQuestRef.current = { ...matchedQuest, fullText: '' };
            return true;
        }

        if (isDetailActiveRef.current && currentQuestRef.current) {
            // Description continues until prompt
            // We return true even for empty lines to allow multiline descriptions
            // Skip repeating the title line in the full text
            if (lower !== currentQuestRef.current.name?.toLowerCase()) {
                currentQuestRef.current.fullText = (currentQuestRef.current.fullText ? currentQuestRef.current.fullText + '\n' : '') + textOnly;
            }
            return true;
        }
        
        return false;
    }, [activeQuests]);

    const finalizeQuests = useCallback(() => {
        if (isQuestsActiveRef.current) {
            setQuests({
                activeQuests: [...parsedQuestsRef.current],
                lastUpdated: Date.now()
            });
        } else if (isDetailActiveRef.current && currentQuestRef.current) {
            const detailQuest = currentQuestRef.current;
            setQuests(prev => ({
                ...prev,
                activeQuests: prev.activeQuests.map(q => 
                    q.id === detailQuest.id ? { ...q, fullText: detailQuest.fullText } : q
                ),
                lastUpdated: Date.now()
            }));
        }
        
        isQuestsActiveRef.current = false;
        isDetailActiveRef.current = false;
        currentQuestRef.current = null;
    }, [setQuests]);

    const setQuestDetails = useCallback((name: string, description: string) => {
        setQuests(prev => ({
            ...prev,
            activeQuests: prev.activeQuests.map(q => 
                q.name.toLowerCase().includes(name.toLowerCase()) 
                    ? { ...q, fullText: description } 
                    : q
            ),
            lastUpdated: Date.now()
        }));
    }, [setQuests]);

    return {
        isQuestsActive: isQuestsActiveRef,
        isDetailActive: isDetailActiveRef,
        parseQuestLine,
        finalizeQuests,
        setQuestDetails
    };
}
