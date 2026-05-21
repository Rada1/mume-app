/**
 * @file inlineCategoryAxes.ts
 * @description Category-derived facts for inline action rendering and filtering.
 */

import { EntityLocation } from '../types';
import { getCategoryConfig, toCategoryId } from './inlineActionModel';

// --- Type Definitions ---

export type InlineCategoryFamily = 'character' | 'object' | 'room' | 'exit' | 'target' | 'unknown';

export interface InlineCategoryAxes {
    categoryId: string;
    family: InlineCategoryFamily;
    location: EntityLocation;
    isCharacter: boolean;
    isObject: boolean;
    isInlineAction: boolean;
    isTargetable: boolean;
}

// --- Logic Section ---

const LEGACY_CATEGORY_IDS: Record<string, string> = {
    inlineplayer: 'cat-ally',
    'inline-player': 'cat-ally-remote',
    pc: 'cat-ally',
    roomitems: 'cat-room-object',
    inventorylist: 'cat-inventory-object',
    equipmentlist: 'cat-worn-object',
    roomnpcs: 'cat-npc',
    npc: 'cat-npc',
    player: 'cat-ally',
    ally: 'cat-ally',
    enemy: 'cat-enemy',
    neutral: 'cat-neutral',
    object: 'cat-object',
    target: 'cat-target',
    room: 'cat-room',
    'inline-container-item': 'cat-container-item',
    exits: 'cat-exit',
};

const CATEGORY_AXES: Record<string, Omit<InlineCategoryAxes, 'categoryId'>> = {
    'cat-target': { family: 'target', location: 'none', isCharacter: false, isObject: false, isInlineAction: true, isTargetable: false },
    'cat-ally': { family: 'character', location: 'room', isCharacter: true, isObject: false, isInlineAction: true, isTargetable: true },
    'cat-ally-remote': { family: 'character', location: 'none', isCharacter: true, isObject: false, isInlineAction: true, isTargetable: true },
    'cat-enemy': { family: 'character', location: 'room', isCharacter: true, isObject: false, isInlineAction: true, isTargetable: true },
    'cat-neutral': { family: 'character', location: 'room', isCharacter: true, isObject: false, isInlineAction: true, isTargetable: true },
    'cat-npc': { family: 'character', location: 'room', isCharacter: true, isObject: false, isInlineAction: true, isTargetable: true },
    'cat-room-object': { family: 'object', location: 'room', isCharacter: false, isObject: true, isInlineAction: true, isTargetable: true },
    'cat-inventory-object': { family: 'object', location: 'carried', isCharacter: false, isObject: true, isInlineAction: true, isTargetable: false },
    'cat-worn-object': { family: 'object', location: 'worn', isCharacter: false, isObject: true, isInlineAction: true, isTargetable: false },
    'cat-container-item': { family: 'object', location: 'carried', isCharacter: false, isObject: true, isInlineAction: true, isTargetable: false },
    'cat-object': { family: 'object', location: 'room', isCharacter: false, isObject: true, isInlineAction: true, isTargetable: false },
    'cat-room': { family: 'room', location: 'room', isCharacter: false, isObject: false, isInlineAction: true, isTargetable: false },
    'cat-exit': { family: 'exit', location: 'room', isCharacter: false, isObject: false, isInlineAction: true, isTargetable: false },
    'cat-help-term': { family: 'unknown', location: 'none', isCharacter: false, isObject: false, isInlineAction: true, isTargetable: false },
};

export const normalizeInlineCategoryId = (id: string | null | undefined): string => {
    if (!id) return 'cat-object';
    const lowered = id.toLowerCase();
    return toCategoryId(id) || LEGACY_CATEGORY_IDS[lowered] || id;
};

export const getInlineCategoryAxes = (
    id: string | null | undefined,
    fallbackLocation?: EntityLocation
): InlineCategoryAxes => {
    const categoryId = normalizeInlineCategoryId(id);
    const axes = CATEGORY_AXES[categoryId];
    if (axes) {
        return {
            categoryId,
            ...axes,
            location: fallbackLocation && axes.location === 'room' && categoryId === 'cat-object'
                ? fallbackLocation
                : axes.location,
        };
    }

    return {
        categoryId,
        family: 'unknown',
        location: fallbackLocation || 'room',
        isCharacter: false,
        isObject: false,
        isInlineAction: false,
        isTargetable: false,
    };
};

export const getInlineCategoryLabel = (id: string | null | undefined): string => {
    const categoryId = normalizeInlineCategoryId(id);
    const category = getCategoryConfig(categoryId);
    if (category) return category.label;
    return categoryId.replace(/^(inline|cat)-/, '').replace(/-/g, ' ').toUpperCase();
};
