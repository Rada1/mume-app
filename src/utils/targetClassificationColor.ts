/** @file targetClassificationColor.ts — Resolve target menu colors from inline classifications. */

import type { EntityColorMap } from './inlineActionModel';
import { getInlineGlowColor } from './inlineActionModel';
import type { InlineCategoryConfig } from '../types';
import type { LinkedColorTheme } from './themeLinkedColors';
import type { ObjectLocation } from '../objects/objectTargetModel';

// --- Logic Section ---
const TARGET_CATEGORY_IDS: Record<string, string> = {
    self: 'cat-ally', ally: 'cat-ally', allies: 'cat-ally',
    enemy: 'cat-enemy', enemies: 'cat-enemy', neutral: 'cat-neutral',
    npc: 'cat-npc', npcs: 'cat-npc', mount: 'cat-mount', mounts: 'cat-mount',
    pc: 'cat-ally-remote', player: 'cat-ally-remote', players: 'cat-ally-remote', who: 'cat-ally-remote',
    character: 'cat-ally', characters: 'cat-ally',
    object: 'cat-room-object', objects: 'cat-room-object',
    inventory: 'cat-inventory-object', worn: 'cat-worn-object', container: 'cat-container-item',
    room: 'cat-room', exit: 'cat-exit'
};

const OBJECT_LOCATION_CATEGORY_IDS: Record<ObjectLocation, string> = {
    room: 'cat-room-object',
    inventory: 'cat-inventory-object',
    worn: 'cat-worn-object',
    container: 'cat-container-item'
};

export const getTargetClassificationColor = (
    meta: string,
    categories: InlineCategoryConfig[],
    entityColors: EntityColorMap,
    theme: LinkedColorTheme,
    objectLocation?: ObjectLocation
): string | null => {
    const categoryId = objectLocation
        ? OBJECT_LOCATION_CATEGORY_IDS[objectLocation]
        : TARGET_CATEGORY_IDS[meta.toLowerCase()];
    return categoryId ? getInlineGlowColor(categoryId, categories, entityColors, theme) : null;
};
