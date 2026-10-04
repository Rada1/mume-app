/** @file useGearSelection.ts — Selection state locked to one gear section level. */

import { useCallback, useState } from 'react';
import type { GearPanelSection, GearSelection, GearSelectionItem } from '../types';
import { getGearScopeKey } from '../utils/gearSelectionUtils';

// --- Logic Section ---
export function useGearSelection() {
    const [selection, setSelection] = useState<GearSelection | null>(null);
    const items = selection?.items ?? [];
    const clear = useCallback(() => setSelection(null), []);

    const isSelected = useCallback((id: string) => items.some(item => item.id === id), [items]);
    const isScopeLocked = useCallback((section: GearPanelSection, parentId?: string) =>
        Boolean(selection && selection.scopeKey !== getGearScopeKey(section, parentId)), [selection]);

    const toggleItem = useCallback((item: GearSelectionItem, levelItems: GearSelectionItem[]) => {
        const scopeKey = getGearScopeKey(item.section, item.parentId);
        setSelection(current => {
            if (current && current.scopeKey !== scopeKey) return current;
            const currentItems = current?.items ?? [];
            const nextItems = currentItems.some(selected => selected.id === item.id)
                ? currentItems.filter(selected => selected.id !== item.id)
                : [...currentItems, item];
            return nextItems.length ? {
                scopeKey, section: item.section, parentNoun: item.parentNoun,
                items: nextItems, sourceLevelItemIds: levelItems.map(levelItem => levelItem.row.line.id)
            } : null;
        });
    }, []);

    const toggleLevel = useCallback((section: GearPanelSection, parentId: string | undefined,
        parentNoun: string | undefined, levelItems: GearSelectionItem[]) => {
        const scopeKey = getGearScopeKey(section, parentId);
        setSelection(current => {
            if (current && current.scopeKey !== scopeKey) return current;
            const allSelected = levelItems.length > 0 && levelItems.every(item => current?.items.some(selected => selected.id === item.id));
            if (allSelected) return null;
            return levelItems.length ? {
                scopeKey, section, parentNoun, items: levelItems,
                sourceLevelItemIds: levelItems.map(item => item.row.line.id)
            } : current;
        });
    }, []);

    const getScopeCount = useCallback((levelItems: GearSelectionItem[]) =>
        levelItems.filter(item => items.some(selected => selected.id === item.id)).length, [items]);

    return { selection, items, clear, isSelected, isScopeLocked, toggleItem, toggleLevel, getScopeCount };
}
