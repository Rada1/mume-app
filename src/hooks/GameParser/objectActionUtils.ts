/** @file objectActionUtils.ts — Shared row and equipment helpers for object actions. */
import type { Dispatch, SetStateAction } from 'react';
import type { DrawerLine } from '../../types';

type ExtractNoun = (text: string) => string;
type AnsiConverter = { toHtml: (ansi: string) => string };

// --- Equipment Helpers ---
export const inferWearSlot = (itemText: string): string => {
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
    return '<worn on body>';
};

export const addEquipmentLine = (
    item: DrawerLine,
    slotPrefix: string,
    setEqLines: Dispatch<SetStateAction<DrawerLine[]>>
): void => {
    setEqLines(previous => {
        const objectId = item.stableId || item.entityId || item.id;
        if (previous.some(line => (line.stableId || line.entityId || line.id) === objectId)) return previous;
        return [...previous, { ...item, id: item.id, stableId: objectId, cmd: 'equipmentlist', prefix: slotPrefix, isItem: true }];
    });
};

export const createItemLine = (
    itemText: string,
    slotPrefix: string,
    extractNoun: ExtractNoun,
    ansiConvert: AnsiConverter
): DrawerLine => {
    const id = Math.random().toString(36).substring(7);
    return {
        id, stableId: id, text: itemText, html: ansiConvert.toHtml(itemText), rawText: `${slotPrefix} ${itemText}`,
        isItem: true, cmd: 'equipmentlist', context: extractNoun(itemText), prefix: slotPrefix
    };
};

export const isMoney = (text: string): boolean =>
    /\d+\s*(?:gold coins?|silver coins?|copper coins?|lauren|celeb|busc|penn(?:y|ies))/i.test(text);
