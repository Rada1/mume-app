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

        // 1. Detect start of quest list
        if (textOnly.includes('You have learnt of a quest in this area:') || 
            textOnly.includes('with the following unfinished quest')) {
            
            console.log(`[QuestsHandler] START Quest List detected: "${textOnly}"`);
            isQuestsActiveRef.current = true;
            isAreaPendingRef.current = textOnly.includes('learnt of a quest');
            isDetailActiveRef.current = false;
            parsedQuestsRef.current = [];
            currentQuestRef.current = null;
            
            if (textOnly.includes('with the following unfinished quest')) {
                const innerAreaMatch = textOnly.match(/You are in (.*?) with/);
                if (innerAreaMatch) {
                    areaRef.current = innerAreaMatch[1].trim();
                    console.log(`[QuestsHandler] Area from 'unfinished' line: "${areaRef.current}"`);
                } else {
                    areaRef.current = '';
                }
            } else {
                areaRef.current = '';
            }
            return true;
        }

        if (textOnly.includes('You have not found any new quests.') || textOnly.includes('You have no unfinished quests.')) {
            console.log('[QuestsHandler] No quests found message detected:', textOnly);
            isQuestsActiveRef.current = true; // Still active to allow finalize to clear
            isAreaPendingRef.current = false;
            parsedQuestsRef.current = [];
            return true;
        }

        if (isQuestsActiveRef.current) {
            // Detect area name (usually follows the "You have learnt..." line)
            if (isAreaPendingRef.current && textOnly.length > 0) {
                // Heuristic: Area names usually don't start with '*' or 'You'
                if (!textOnly.startsWith('*') && !textOnly.startsWith('You') && textOnly.length < 50) {
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

            // Detect specific quest line: " * Araduin's request - Araduin will point me to quests around Bree-land"
            // Or " * Araduin's request : description"
            // Or " * Araduin's request"
            const questMatch = textOnly.match(/^\s*\*\s*(.*)$/);
            if (questMatch) {
                const rawContent = questMatch[1].trim();
                const sepIdx = rawContent.search(/\s*[-:]\s*/);
                let name = rawContent;
                let description = '';
                
                if (sepIdx > -1) {
                    name = rawContent.substring(0, sepIdx).trim();
                    description = rawContent.substring(sepIdx).replace(/^[-:\s]+/, '').trim();
                }

                const id = name.toLowerCase().replace(/['\s]+/g, '-');
                
                console.log(`[QuestsHandler] Quest found: "${name}" | Desc: "${description}" | Area: "${areaRef.current}"`);

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
        const cleanLower = lower.trim().replace(/\s+/g, ' ');
        const matchCandidate = cleanLower.replace(/^\*\s*/, ''); // Strip leading * for detail match
        const matchedQuest = !isQuestsActiveRef.current && activeQuests.find(q => {
            const qName = q.name.toLowerCase().trim().replace(/\s+/g, ' ');
            return qName === cleanLower || qName === matchCandidate;
        });

        if (matchedQuest) {
            console.log(`[QuestsHandler] START Quest Detail detected for: "${matchedQuest.name}"`);
            isDetailActiveRef.current = true;
            currentQuestRef.current = { ...matchedQuest, fullText: '' };
            return true;
        }

        if (isDetailActiveRef.current && currentQuestRef.current) {
            // Description continues until prompt
            // Skip repeating the title line in the full text
            if (cleanLower !== currentQuestRef.current.name?.toLowerCase().trim().replace(/\s+/g, ' ')) {
                currentQuestRef.current.fullText = (currentQuestRef.current.fullText ? currentQuestRef.current.fullText + '\n' : '') + textOnly;
            }
            return true;
        }
        
        return false;
    }, [activeQuests]);

    const finalizeQuests = useCallback(() => {
        const isList = isQuestsActiveRef.current;
        const isDetail = isDetailActiveRef.current;
        const currentArea = areaRef.current;
        const parsedQuests = [...parsedQuestsRef.current];
        const detailQuest = currentQuestRef.current ? { ...currentQuestRef.current } : null;

        console.log(`[QuestsHandler] Finalizing quests. isList: ${isList}, isDetail: ${isDetail}, count: ${parsedQuests.length}, area: "${currentArea}"`);
        
        if (isList) {
            setQuests(prev => {
                const currentQuests = prev.activeQuests || [];
                let nextQuests: Quest[];

                if (currentArea) {
                    // Filter out old quests for this SPECIFIC area and replace with new ones
                    const otherAreaQuests = currentQuests.filter(q => q.area !== currentArea);
                    nextQuests = [...otherAreaQuests, ...parsedQuests];
                    console.log(`[QuestsHandler] Updating area "${currentArea}". New total: ${nextQuests.length}`);
                } else {
                    // Global list or no area detected - replace all
                    nextQuests = [...parsedQuests];
                    console.log(`[QuestsHandler] Global update. New total: ${nextQuests.length}`);
                }

                return {
                    activeQuests: nextQuests,
                    lastUpdated: Date.now()
                };
            });
        } else if (isDetail && detailQuest) {
            console.log(`[QuestsHandler] Updating detail for: "${detailQuest.name}"`);
            setQuests(prev => ({
                ...prev,
                activeQuests: (prev.activeQuests || []).map(q => 
                    q.id === detailQuest.id ? { ...q, fullText: detailQuest.fullText } : q
                ),
                lastUpdated: Date.now()
            }));
        }
        
        // Reset ALL capture state
        isQuestsActiveRef.current = false;
        isDetailActiveRef.current = false;
        isAreaPendingRef.current = false;
        parsedQuestsRef.current = [];
        currentQuestRef.current = null;
        areaRef.current = '';
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
