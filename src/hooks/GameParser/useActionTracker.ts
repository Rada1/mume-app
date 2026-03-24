/**
 * @file useActionTracker.ts
 * @description Tracks item movements (wear, remove, get, drop, etc.) and updates inventory/equipment state.
 */

import { useCallback } from 'react';
import { DrawerLine, CharacterInfo } from '../../types';
import { extractNoun as smartExtractNoun } from '../../utils/keywordUtils';

export interface ActionTrackerDeps {
    isSilentCapture: React.MutableRefObject<number>;
    isDrawerCapture: React.MutableRefObject<number>;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    extractNoun: (text: string) => string;
    ansiConvert: { toHtml: (ansi: string) => string };
}

export function useActionTracker(deps: ActionTrackerDeps) {
    const {
        isSilentCapture,
        isDrawerCapture,
        setInventoryLines,
        setEqLines,
        setCharacterInfo,
        extractNoun,
        ansiConvert
    } = deps;

    const trackAction = useCallback((cleanLine: string, textOnly: string, lower: string) => {
        if (isSilentCapture.current > 0 || isDrawerCapture.current) return;
        
        const wearMatch = cleanLine.match(/You (wear|put on) (.*?)\./i);
        if (wearMatch) {
            const itemNoun = extractNoun(wearMatch[2]);
            setInventoryLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev;
                const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                return prev.filter((_, i) => i !== idx);
            }); return;
        }
        
        const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
        if (removeMatch) {
            const itemNoun = extractNoun(removeMatch[2]);
            setEqLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev;
                const item = prev[idx]; setInventoryLines(inv => [...inv, { ...item, cmd: 'inventorylist' }]);
                return prev.filter((_, i) => i !== idx);
            }); return;
        }
        
        const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
        if (putMatch) {
            const itemNoun = extractNoun(putMatch[1]);
            setInventoryLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
            }); return;
        }
        
        const getMatch = cleanLine.match(/You (get|take) (.*?)\.( from (.*?)\.)?/i);
        if (getMatch) {
            const itemText = getMatch[2];
            setInventoryLines(prev => [...prev, { 
                id: Math.random().toString(36).substring(7), 
                text: itemText, 
                html: ansiConvert.toHtml(itemText), 
                isItem: true, 
                cmd: 'inventorylist', 
                context: extractNoun(itemText) 
            }]);
            return;
        }
        
        const receiveMatch = cleanLine.match(/(.*?) gives you (.*?)\./i);
        if (receiveMatch) {
            const itemText = receiveMatch[2];
            setInventoryLines(prev => [...prev, { 
                id: Math.random().toString(36).substring(7), 
                text: itemText, 
                html: ansiConvert.toHtml(itemText), 
                isItem: true, 
                cmd: 'inventorylist', 
                context: extractNoun(itemText) 
            }]);
            return;
        }
        
        const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
        if (giveMatch) {
            const itemNoun = extractNoun(giveMatch[2]);
            setInventoryLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
            }); return;
        }
        
        const wieldMatch = cleanLine.match(/You (wield|hold) (.*?)\./i);
        if (wieldMatch) {
            const itemNoun = extractNoun(wieldMatch[2]);
            setInventoryLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev;
                const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                return prev.filter((_, i) => i !== idx);
            }); return;
        }
        
        const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
        if (consumeMatch) {
            const itemNoun = smartExtractNoun(consumeMatch[2]);
            if (!consumeMatch[0].includes('from')) {
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                });
            } return;
        }
        
        if (lower.includes('gold coins') || lower.includes('lauren') || lower.includes('celeb') || lower.includes('busc')) {
            const moneyMatch = textOnly.match(/(\d+)\s*(gold coins|silver coins|copper coins|lauren|celeb|busc)/i);
            if (moneyMatch && (lower.includes('get') || lower.includes('take') || lower.includes('gives you'))) {
                const amount = parseInt(moneyMatch[1]);
                setCharacterInfo(prev => ({ ...prev, gold: (prev.gold || 0) + amount }));
            } else if (moneyMatch && (lower.includes('drop') || lower.includes('give') || lower.includes('junk'))) {
                const amount = parseInt(moneyMatch[1]);
                setCharacterInfo(prev => ({ ...prev, gold: Math.max(0, (prev.gold || 0) - amount) }));
            }
        }
    }, [isSilentCapture, isDrawerCapture, setInventoryLines, setEqLines, setCharacterInfo, extractNoun, ansiConvert]);

    return { trackAction };
}
