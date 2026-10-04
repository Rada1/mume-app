/** @file objectRemoveTracker.ts — Applies confirmed remove actions to gear snapshots. */

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { DrawerLine } from '../../types';
import { findDrawerItemOccurrence } from './usePendingObjectCommand';

// --- Logic Section ---
export const stripResultTail = (itemText: string): string => itemText
    .replace(/\s*,\s*(?:ready|prepared|poised|held|gripped)\b.*$/i, '')
    .replace(/\s+on your\b.*$/i, '')
    .replace(/[.!]+$/g, '')
    .trim();

export const trackRemoveAction = (
    responseText: string,
    selector: string | null,
    inventoryLinesRef: MutableRefObject<DrawerLine[]>,
    eqLinesRef: MutableRefObject<DrawerLine[]>,
    setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>,
    setEqLines: Dispatch<SetStateAction<DrawerLine[]>>
): void => {
    const itemText = stripResultTail(responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    const lines = eqLinesRef.current;
    const exactIndex = lines.findIndex(line => line.isItem && !line.isHeader
        && stripResultTail(line.text).toLowerCase() === itemText.toLowerCase());
    const responseIndex = exactIndex >= 0 ? exactIndex : findDrawerItemOccurrence(lines, itemText, null);
    const index = responseIndex >= 0 ? responseIndex : findDrawerItemOccurrence(lines, itemText, selector);
    if (index < 0) return;

    const item = lines[index];
    const objectId = item.stableId || item.entityId || item.id;
    const inventoryItem = { ...item, cmd: 'inventorylist' };
    if (!inventoryLinesRef.current.some(line => (line.stableId || line.entityId || line.id) === objectId)) {
        inventoryLinesRef.current = [...inventoryLinesRef.current, inventoryItem];
        setInventoryLines(previous => previous.some(line =>
            (line.stableId || line.entityId || line.id) === objectId
        ) ? previous : [...previous, inventoryItem]);
    }
    eqLinesRef.current = lines.filter(line => (line.stableId || line.entityId || line.id) !== objectId);
    setEqLines(previous => previous.filter(line => (line.stableId || line.entityId || line.id) !== objectId));
};
