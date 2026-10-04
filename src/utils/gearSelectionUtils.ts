/** @file gearSelectionUtils.ts — Scope-aware gear batch selection and commands. */

import type { GearPanelSection, GearRow, GearSelection, GearSelectionAction, GearSelectionItem, ObjectDragItem } from '../types';
import { getObjectTraits } from '../objects/objectTargetModel';

// --- Logic Section ---
export const getGearScopeKey = (section: GearPanelSection, parentId?: string): string =>
    `${section}:${parentId || 'root'}`;

export const getGearSelectionLabel = (selection: GearSelection): string => {
    if (selection.parentNoun) return `${selection.parentNoun} contents`;
    return selection.section === 'carried' ? 'inventory' : selection.section === 'room' ? 'nearby' : 'worn';
};

export const toObjectDragItem = (item: GearSelectionItem): ObjectDragItem => ({
    row: item.parentNoun ? 'inventory' : item.section === 'carried' ? 'inventory' : item.section,
    noun: item.row.noun,
    label: item.row.name,
    itemId: item.row.line.id,
    parentContainerNoun: item.parentNoun,
    parentContainerId: item.parentId,
});

const isCompleteLevel = (selection: GearSelection): boolean => {
    const ids = new Set(selection.items.map(item => item.row.line.id));
    return selection.sourceLevelItemIds.length > 0 && ids.size === selection.sourceLevelItemIds.length
        && selection.sourceLevelItemIds.every(id => ids.has(id));
};

export const getGearSelectionCommands = (
    selection: GearSelection,
    action: GearSelectionAction,
    destinationNoun?: string
): string[] => {
    const items = selection.items;
    if (!items.length) return [];

    if (isCompleteLevel(selection)) {
        if (action === 'get' && selection.parentNoun
            && items.every(item => item.parentNoun === selection.parentNoun)) {
            return [`get all ${selection.parentNoun}`];
        }
        if (action === 'get' && selection.section === 'room' && !selection.parentNoun) return ['get all'];
        if (selection.section === 'carried' && !selection.parentNoun) {
            if (action === 'put' && destinationNoun) return [`put all ${destinationNoun}`];
            if (action === 'wear') return ['wear all'];
            if (action === 'drop') return ['drop all'];
        }
        if (action === 'remove' && selection.section === 'worn' && !selection.parentNoun) return ['remove all'];
    }

    return items.map(item => {
        const noun = item.row.noun;
        switch (action) {
            case 'get': return `get ${noun}${item.parentNoun ? ` ${item.parentNoun}` : ''}`;
            case 'put': return destinationNoun ? `put ${noun} ${destinationNoun}` : '';
            case 'wear': return `${getObjectTraits(item.row.line).includes('trait-weapon') ? 'wield' : 'wear'} ${noun}`;
            case 'remove': return `remove ${noun}`;
            case 'drop': return `drop ${noun}`;
        }
    }).filter(Boolean);
};
