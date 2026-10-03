/**
 * @file useObjectActionTracker.ts
 * @description Applies confirmed object movement messages to room, gear, and container snapshots.
 */

import { useCallback } from 'react';
import type { DrawerLine, GmcpOccupant } from '../../types';
import { extractMumeKeyword } from '../../utils/keywordUtils';
import { isItemContainer } from '../../utils/gameUtils';
import { findObjectOccurrence, getDrawerObjectKeyword, getRoomObjectKeyword, hasObjectTrait } from '../../objects/objectTargetModel';
import { findDrawerItemOccurrence, usePendingObjectCommand } from './usePendingObjectCommand';

export interface ObjectActionTrackerDeps {
    capture: import('../../types/capture').CaptureController;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    inventoryLines?: DrawerLine[];
    eqLines?: DrawerLine[];
    roomItems?: GmcpOccupant[];
    setRoomItems?: React.Dispatch<React.SetStateAction<GmcpOccupant[]>>;
    containerContents?: Record<string, DrawerLine[]>;
    setContainerContents?: React.Dispatch<React.SetStateAction<Record<string, DrawerLine[]>>>;
    registerEntity?: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => unknown;
    extractNoun: (text: string) => string;
    ansiConvert: { toHtml: (ansi: string) => string };
    onWear?: () => void;
    onRemove?: () => void;
    onGet?: () => void;
    onDrop?: () => void;
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
    return '<worn on body>';
};

const stripResultTail = (itemText: string): string => itemText
    .replace(/\s*,\s*(?:ready|prepared|poised|held|gripped)\b.*$/i, '')
    .replace(/\s+on your\b.*$/i, '')
    .replace(/[.!]+$/g, '')
    .trim();

const addEquipmentLine = (item: DrawerLine, slotPrefix: string, setEqLines: ObjectActionTrackerDeps['setEqLines']) => {
    setEqLines(previous => {
        const objectId = item.stableId || item.entityId || item.id;
        if (previous.some(line => (line.stableId || line.entityId || line.id) === objectId)) return previous;
        return [...previous, { ...item, id: item.id, stableId: objectId, cmd: 'equipmentlist', prefix: slotPrefix, isItem: true }];
    });
};

const createItemLine = (
    itemText: string,
    slotPrefix: string,
    extractNoun: ObjectActionTrackerDeps['extractNoun'],
    ansiConvert: ObjectActionTrackerDeps['ansiConvert']
): DrawerLine => {
    const id = Math.random().toString(36).substring(7);
    return {
        id, stableId: id, text: itemText, html: ansiConvert.toHtml(itemText), rawText: `${slotPrefix} ${itemText}`,
        isItem: true, cmd: 'equipmentlist', context: extractNoun(itemText), prefix: slotPrefix
    };
};

const isMoney = (text: string): boolean =>
    /\d+\s*(?:gold coins?|silver coins?|copper coins?|lauren|celeb|busc|penn(?:y|ies))/i.test(text);

export const useObjectActionTracker = (deps: ObjectActionTrackerDeps) => {
    const { getArguments, clear } = usePendingObjectCommand();

    const findContainerId = useCallback((selector: string | undefined): string | null => {
        if (!selector) return null;
        const roomContainers = (deps.roomItems || []).filter(item => hasObjectTrait(item, 'trait-container') || isItemContainer(
            item.name || item.short || item.shortdesc || ''
        )).map(item => ({ id: String(item.id ?? item.objectId ?? ''), keyword: getRoomObjectKeyword(item, item.name || item.short || '') }));
        const gearContainers = [...(deps.inventoryLines || []), ...(deps.eqLines || [])]
            .filter(line => line.isItem && !line.isHeader && (line.isContainer || hasObjectTrait(line, 'trait-container') || isItemContainer(line.text)))
            .map(line => ({ id: line.id, keyword: getDrawerObjectKeyword(line) }));
        const candidates = [...roomContainers, ...gearContainers];
        const index = findObjectOccurrence(candidates, selector, candidate => candidate.keyword);
        return index >= 0 ? candidates[index].id || null : null;
    }, [deps.roomItems, deps.inventoryLines, deps.eqLines]);

    const trackAction = useCallback((cleanLine: string, textOnly: string): boolean => {
        if (deps.capture.hasSession()) return false;

        const moveToEquipment = (itemText: string, slotPrefix: string, verbs: string[]) => {
            const normalizedItem = stripResultTail(itemText);
            const selector = getArguments(verbs)[0] || null;
            const lines = deps.inventoryLines || [];
            const index = findDrawerItemOccurrence(lines, normalizedItem, selector);
            const item = index >= 0 ? lines[index] : createItemLine(normalizedItem, slotPrefix, deps.extractNoun, deps.ansiConvert);
            addEquipmentLine(item, slotPrefix, deps.setEqLines);
            if (index >= 0) {
                const objectId = item.stableId || item.entityId || item.id;
                deps.setInventoryLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
            }
        };

        const wearMatch = textOnly.match(/^You (?:wear|put on|fasten|sling|slip|tie|buckle|don|drape|loop|attach|wrap) (.*?)\.$/i)
            || textOnly.match(/^You put (.*?) on your .+ finger\.$/i)
            || textOnly.match(/^You put (.*?) over your shoulder\.$/i);
        if (wearMatch) {
            const itemText = cleanLine.match(/<object\b[^>]*>(.*?)<\/object>/i)?.[1] || wearMatch[1];
            moveToEquipment(itemText, inferWearSlot(itemText), ['wear']);
            clear(); deps.onWear?.(); return true;
        }

        const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
        if (removeMatch) {
            const selector = getArguments(['remove'])[0] || null;
            const lines = deps.eqLines || [];
            const index = findDrawerItemOccurrence(lines, removeMatch[2], selector);
            if (index >= 0) {
                const item = lines[index];
                const objectId = item.stableId || item.entityId || item.id;
                deps.setInventoryLines(previous => [...previous, { ...item, cmd: 'inventorylist' }]);
                deps.setEqLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
            }
            clear(); deps.onRemove?.(); return true;
        }

        const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
        if (putMatch) {
            const args = getArguments(['put']);
            const lines = deps.inventoryLines || [];
            const index = findDrawerItemOccurrence(lines, putMatch[1], args[0] || null);
            if (index >= 0) {
                const item = lines[index];
                const objectId = item.stableId || item.entityId || item.id;
                deps.setInventoryLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
                const containerSelector = args[1]?.toLowerCase() === 'in' ? args[2] : args[1];
                const containerId = findContainerId(containerSelector);
                if (containerId && deps.setContainerContents) deps.setContainerContents(previous => ({
                    ...previous,
                    [containerId]: [...(previous[containerId] || []), { ...item, cmd: 'containerlist' }]
                }));
            }
            clear(); return true;
        }

        if (/^You pick up .+['’]s reins and start riding (?:him|her|it)\.$/i.test(textOnly)) return true;

        const getMatch = cleanLine.match(/^You (?:get|take|pick) (.*?)(?: from (.*?))?\.$/i);
        if (getMatch) {
            const itemText = getMatch[1].replace(/<[^>]+>/g, '').trim();
            if (isMoney(itemText)) return false;
            const args = getArguments(['get', 'take', 'pick up']);
            const containerSelector = args[1]?.toLowerCase() === 'from' ? args[2] : args[1];
            const isRoomSource = !containerSelector || /^(?:room|ground|floor)$/i.test(containerSelector)
                || Boolean(getMatch[2] && /^(?:room|ground|floor)$/i.test(getMatch[2].trim()));
            let objectId: string | undefined;
            if (isRoomSource && deps.roomItems && deps.setRoomItems) {
                const index = args[0]
                    ? findObjectOccurrence(deps.roomItems, args[0], item => getRoomObjectKeyword(item, item.name || item.short || ''))
                    : deps.roomItems.findIndex(item => getRoomObjectKeyword(item, item.name || item.short || '') === extractMumeKeyword(itemText).toLowerCase());
                if (index >= 0) {
                    const item = deps.roomItems[index];
                    objectId = item.objectId || (item.id !== undefined ? String(item.id) : undefined);
                    const sourceId = objectId;
                    deps.setRoomItems(previous => previous.filter((candidate, candidateIndex) => sourceId
                        ? (candidate.objectId || String(candidate.id ?? '')) !== sourceId
                        : candidateIndex !== index
                    ));
                }
            } else if (deps.setContainerContents) {
                const containerId = findContainerId(containerSelector);
                const contents = containerId ? deps.containerContents?.[containerId] || [] : [];
                const index = findDrawerItemOccurrence(contents, itemText, args[0] || null);
                if (containerId && index >= 0) {
                    const item = contents[index];
                    objectId = item.stableId || item.entityId || item.id;
                    deps.setContainerContents(previous => ({
                        ...previous,
                        [containerId]: (previous[containerId] || []).filter(line => (line.stableId || line.entityId || line.id) !== objectId)
                    }));
                }
            }
            const id = Math.random().toString(36).substring(7);
            deps.setInventoryLines(previous => [...previous, {
                id, stableId: objectId || id, text: itemText, html: deps.ansiConvert.toHtml(itemText),
                isItem: true, cmd: 'inventorylist', context: deps.extractNoun(itemText)
            }]);
            clear(); deps.onGet?.(); return true;
        }

        const receiveMatch = cleanLine.match(/(.*?) gives you (.*?)\./i);
        if (receiveMatch) {
            if (isMoney(receiveMatch[2])) return false;
            const id = Math.random().toString(36).substring(7);
            deps.setInventoryLines(previous => [...previous, {
                id, stableId: id, text: receiveMatch[2], html: deps.ansiConvert.toHtml(receiveMatch[2]),
                isItem: true, cmd: 'inventorylist', context: deps.extractNoun(receiveMatch[2])
            }]);
            return true;
        }

        const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
        if (giveMatch) {
            if (isMoney(giveMatch[2])) return false;
            const selector = getArguments([giveMatch[1].toLowerCase()])[0] || null;
            const lines = deps.inventoryLines || [];
            const index = findDrawerItemOccurrence(lines, giveMatch[2], selector);
            const item = index >= 0 ? lines[index] : null;
            if (item) {
                const objectId = item.stableId || item.entityId || item.id;
                deps.setInventoryLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
            }
            if (giveMatch[1].toLowerCase() === 'drop') {
                if (deps.setRoomItems) {
                    const name = stripResultTail(item?.text || giveMatch[2]);
                    const objectId = item?.stableId || item?.entityId || item?.id || `dropped:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
                    deps.setRoomItems(previous => [...previous, { id: objectId, objectId, name, short: name,
                        keyword: item ? getDrawerObjectKeyword(item) : extractMumeKeyword(name) }]);
                    deps.registerEntity?.(objectId, name, 'room', 'cat-room-object');
                }
                deps.onDrop?.();
            }
            clear(); return true;
        }

        const wieldMatch = textOnly.match(/^You (?!(?:have to|need to|must|should)\b)(?:\w+\s+)*(?:wield|hold) (.*?)(?:, .*)?\.$/i);
        if (wieldMatch) {
            const itemText = cleanLine.match(/<object\b[^>]*>(.*?)<\/object>/i)?.[1] || wieldMatch[1];
            moveToEquipment(itemText, '<wielded>', ['wield', 'hold']);
            clear(); deps.onWear?.(); return true;
        }

        const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
        if (consumeMatch) {
            const verb = consumeMatch[1].toLowerCase();
            const selector = getArguments([verb])[0] || null;
            if (verb === 'eat') {
                const inventoryFood = (deps.inventoryLines || []).filter(line =>
                    line.isItem && !line.isHeader && hasObjectTrait(line, 'trait-food')
                ).map(line => ({ location: 'inventory' as const, keyword: getDrawerObjectKeyword(line), line }));
                const roomFood = (deps.roomItems || []).flatMap((item, roomIndex) => hasObjectTrait(item, 'trait-food')
                    ? [{ location: 'room' as const, keyword: getRoomObjectKeyword(item, item.name || item.short || ''), item, roomIndex }]
                    : []);
                const candidates = [...inventoryFood, ...roomFood];
                const responseKeyword = extractMumeKeyword(consumeMatch[2]).toLowerCase();
                const index = selector
                    ? findObjectOccurrence(candidates, selector, candidate => candidate.keyword)
                    : candidates.findIndex(candidate => candidate.keyword === responseKeyword);
                if (index >= 0) {
                    const candidate = candidates[index];
                    if (candidate.location === 'inventory') {
                        const objectId = candidate.line.stableId || candidate.line.entityId || candidate.line.id;
                        deps.setInventoryLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
                    } else if (deps.setRoomItems) {
                        const objectId = candidate.item.objectId || String(candidate.item.id ?? '');
                        deps.setRoomItems(previous => previous.filter((item, currentIndex) => objectId
                            ? (item.objectId || String(item.id ?? '')) !== objectId
                            : currentIndex !== candidate.roomIndex
                        ));
                    }
                }
            } else if (!consumeMatch[0].includes('from')) {
                const lines = deps.inventoryLines || [];
                const index = findDrawerItemOccurrence(lines, consumeMatch[2], selector);
                if (index >= 0) {
                    const objectId = lines[index].stableId || lines[index].entityId || lines[index].id;
                    deps.setInventoryLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
                }
            }
            clear(); return true;
        }

        return false;
    }, [deps, getArguments, clear, findContainerId]);

    return { trackAction };
};
