/**
 * @file categorizationUtils.ts
 * @description Utilities for item/NPC categorization and visual themes
 */

import { InlineCategoryConfig } from '../types';

// palette definitions for consistency
const COLOR_NPC = 'rgba(215, 135, 0, 0.9)';   // NPC Golden Orange
const COLOR_OBJ = 'rgba(75, 110, 239, 0.9)';   // Object Mume Blue

export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    // --- LIGHT & OBJECTS (Parent: Object) ---
    { id: 'lightsource', keywords: ['hooded', 'lamp', 'torch', 'candle'], color: COLOR_OBJ },
    { id: 'lantern', keywords: ['lantern', 'light'], color: COLOR_OBJ },
    { id: 'weapon', keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'stick'], color: COLOR_OBJ },
    { id: 'armour', keywords: ['mail', 'breastplate', 'greaves', 'gauntlets', 'helmet', 'boots', 'leggings', 'sleeves', 'bracers', 'cloak', 'surcoat', 'jerkin', 'robe', 'tunic'], color: COLOR_OBJ },
    { id: 'shield', keywords: ['shield', 'buckler', 'targe'], color: COLOR_OBJ },
    { id: 'containers', keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box'], color: COLOR_OBJ },
    { id: 'food', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer'], color: COLOR_OBJ },
    { id: 'water', keywords: ['water', 'fountain', 'pond', 'stream', 'cup', 'skin', 'flagon', 'flask', 'bottle', 'jug', 'vial'], color: COLOR_OBJ },
    { id: 'corpses', keywords: ['corpse'], color: COLOR_OBJ },
    { id: 'object', keywords: [], color: COLOR_OBJ },

    // --- NPCS & SERVICES (Parent: NPC) ---
    { id: 'innkeeper', keywords: ['innkeeper'], color: COLOR_NPC },
    { id: 'shopkeeper', keywords: ['barman', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer'], color: COLOR_NPC },
    { id: 'mounts', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: COLOR_NPC },
    { id: 'guildmaster', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: COLOR_NPC },

    { id: 'default', keywords: [], color: 'rgba(148, 163, 184, 0.9)' }
];

/**
 * Determines the category for a given name based on keyword matching.
 */
export function getCategoryForName(name: string, customCategories?: InlineCategoryConfig[]): string | null {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;

    for (const cat of categories) {
        if ((cat.keywords || []).some(keyword => lowerName.includes(keyword.toLowerCase()))) {
            return `inline-${cat.id}`;
        }
    }

    if (customCategories) {
        for (const cat of DEFAULT_INLINE_CATEGORIES) {
            if (cat.keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
                return `inline-${cat.id}`;
            }
        }
    }

    return null;
}

/**
 * Gets a glow color based on the category name, enforcing inheritance.
 */
export function getGlowColorForCategory(category: string | null, customCategories?: InlineCategoryConfig[]): string | null {
    if (!category) return null;

    const baseId = category.startsWith('inline-') ? category.slice(7) : category;

    // Resolve the parent colors first from the current configuration
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;
    const npcParentColor = categories.find(c => c.id === 'default' && c.keywords.includes('npc_forced'))?.color || COLOR_NPC;
    const objParentColor = categories.find(c => c.id === 'object')?.color || COLOR_OBJ;

    // Hierarchy Definitions
    const NPC_FAMILY = ['innkeeper', 'shopkeeper', 'mounts', 'guildmaster', 'huor', 'inlinenpc', 'inline-npc'];
    const OBJ_FAMILY = ['lightsource', 'lantern', 'weapon', 'armour', 'shield', 'containers', 'food', 'water', 'corpses', 'object', 'quiver', 'obj-room', 'obj-char', 'obj-worn', 'obj-shop'];

    if (NPC_FAMILY.includes(baseId)) return npcParentColor;
    if (OBJ_FAMILY.includes(baseId)) return objParentColor;
    if (baseId === 'inline-player' || baseId === 'inlineplayer') return 'rgba(64, 255, 64, 0.9)';

    const config = categories.find(c => c.id === baseId) || categories.find(c => c.id === 'default');
    return config?.color || COLOR_OBJ;
}
