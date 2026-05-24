/**
 * @file useActionTracker.ts
 * @description Tracks item movements (wear, remove, get, drop, etc.) and updates inventory/equipment state.
 */

import { useCallback } from 'react';
import { DrawerLine, CharacterInfo } from '../../types';
import { extractNoun as smartExtractNoun } from '../../utils/keywordUtils';

export interface ActionTrackerDeps {
    capture: import('../../types/capture').CaptureController;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    extractNoun: (text: string) => string;
    ansiConvert: { toHtml: (ansi: string) => string };
    onWear?: () => void;
    onRemove?: () => void;
}

const inferWearSlot = (itemText: string): string => {
    const lower = itemText.toLowerCase();
    if (/\b(shield|buckler)\b/.test(lower)) return '<worn as shield>';
    if (/\b(helmet|helm|hat|cap|crown|hood|circlet|coif)\b/.test(lower)) return '<worn on head>';
    if (/\b(glove|gloves|gauntlet|gauntlets)\b/.test(lower)) return '<worn on hands>';
    if (/\b(boot|boots|shoe|shoes|sandal|sandals)\b/.test(lower)) return '<worn on feet>';
    if (/\b(trouser|trousers|pants|leggings|greaves|hose)\b/.test(lower)) return '<worn on legs>';
    if (/\b(sleeve|sleeves|bracer|bracers|vambrace|vambraces)\b/.test(lower)) return '<worn on arms>';
    if (/\b(belt|sash|girdle|scabbard|knife|flask|lantern|pan|stone)\b/.test(lower)) return '<worn on belt>';
    if (/\b(quiver|pack|backpack|satchel|cloak|cape)\b/.test(lower)) return '<worn across back>';
    if (/\b(ring|band)\b/.test(lower)) return '<worn on finger>';
    if (/\b(necklace|amulet|pendant|collar|torc)\b/.test(lower)) return '<worn around neck>';
    if (/\b(breastplate|armour|armor|mail|chainmail|hauberk|robe|shirt|tunic|vest|jerkin|fur)\b/.test(lower)) return '<worn on body>';
    return '<worn on body>';
};

const stripResultTail = (itemText: string): string => itemText
    .replace(/\s*,\s*(?:ready|prepared|poised|held|gripped)\b.*$/i, '')
    .replace(/\s+on your\b.*$/i, '')
    .replace(/[.!]+$/g, '')
    .trim();

const addEquipmentLine = (
    item: DrawerLine,
    slotPrefix: string,
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>
) => {
    setEqLines(prev => {
        const itemContext = item.context || smartExtractNoun(item.text);
        const alreadyExists = prev.some(line =>
            line.isItem &&
            (line.context === itemContext || line.text.toLowerCase() === item.text.toLowerCase())
        );
        if (alreadyExists) return prev;

        return [...prev, {
            ...item,
            id: Math.random().toString(36).substring(7),
            cmd: 'equipmentlist',
            prefix: slotPrefix,
            isItem: true,
            context: itemContext
        }];
    });
};

const createItemLine = (
    itemText: string,
    slotPrefix: string,
    extractNoun: (text: string) => string,
    ansiConvert: { toHtml: (ansi: string) => string }
): DrawerLine => ({
    id: Math.random().toString(36).substring(7),
    text: itemText,
    html: ansiConvert.toHtml(itemText),
    rawText: `${slotPrefix} ${itemText}`,
    isItem: true,
    cmd: 'equipmentlist',
    context: extractNoun(itemText),
    prefix: slotPrefix
});

export function useActionTracker(deps: ActionTrackerDeps) {
    const {
        capture,
        setInventoryLines,
        setEqLines,
        setCharacterInfo,
        extractNoun,
        ansiConvert,
        onWear,
        onRemove
    } = deps;

    const trackAction = useCallback((cleanLine: string, textOnly: string, lower: string) => {
        // Only track if not currently in a capture session (to avoid double-adding)
        if (capture.hasSession()) return;
        
        const moveToEquipment = (itemText: string, slotPrefix: string) => {
            const normalizedItem = stripResultTail(itemText);
            const itemNoun = extractNoun(normalizedItem);

            setInventoryLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) {
                    addEquipmentLine(
                        createItemLine(normalizedItem, slotPrefix, extractNoun, ansiConvert),
                        slotPrefix,
                        setEqLines
                    );
                    return prev;
                }

                const item = prev[idx];
                addEquipmentLine(item, slotPrefix, setEqLines);
                return prev.filter((_, i) => i !== idx);
            });
        };

        const wearMatch = textOnly.match(/^You (?:wear|put on|fasten|sling|slip|tie|buckle|don|drape|loop|attach|wrap) (.*?)\.$/i);
        if (wearMatch) {
            const itemText = stripResultTail(wearMatch[1]);
            moveToEquipment(itemText, inferWearSlot(itemText));
            onWear?.();
            return;
        }

        const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
        if (removeMatch) {
            const itemNoun = extractNoun(removeMatch[2]);
            setEqLines(prev => {
                const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                if (idx === -1) return prev;
                const item = prev[idx]; setInventoryLines(inv => [...inv, { ...item, cmd: 'inventorylist' }]);
                return prev.filter((_, i) => i !== idx);
            });
            onRemove?.();
            return;
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
        
        const wieldMatch = textOnly.match(/^You (?:\w+\s+)*(?:wield|hold) (.*?)(?:, .*)?\.$/i);
        if (wieldMatch) {
            moveToEquipment(wieldMatch[1], '<wielded>');
            onWear?.();
            return;
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
    }, [capture, setInventoryLines, setEqLines, setCharacterInfo, extractNoun, ansiConvert, onWear, onRemove]);

    return { trackAction };
}
