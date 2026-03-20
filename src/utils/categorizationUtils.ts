/**
 * @file categorizationUtils.ts
 * @description Utilities for item/NPC categorization and visual themes
 */

import { InlineCategoryConfig } from '../types';

// palette definitions for consistency
const COLOR_NPC = 'rgba(240, 171, 252, 1)';   // Brighter Neon Purple (#f0abfc)
const COLOR_PLAYER = 'rgba(125, 211, 252, 1)'; // Brighter Sky Blue (#7dd3fc)
const COLOR_OBJ = 'rgba(180, 100, 50, 0.9)';   // Object Brown

export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    // --- LIGHT & OBJECTS (Parent: Object) ---
    { id: 'lightsource', keywords: ['hooded', 'lamp', 'torch', 'candle'], color: COLOR_OBJ },
    { id: 'lantern', keywords: ['lantern', 'light'], color: COLOR_OBJ },
    { id: 'weapon', keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'stick', 'knife', 'fist', 'blowpipe'], color: COLOR_OBJ },
    { id: 'armour', keywords: ['mail', 'breastplate', 'greaves', 'gauntlets', 'helmet', 'boots', 'leggings', 'sleeves', 'bracers', 'cloak', 'surcoat', 'jerkin', 'robe', 'tunic', 'trousers', 'belt', 'pants', 'breeches', 'shoes', 'sandals', 'cloak', 'scabbard'], color: COLOR_OBJ },
    { id: 'shield', keywords: ['shield', 'buckler', 'targe'], color: COLOR_OBJ },
    { id: 'containers', keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box'], color: COLOR_OBJ },
    { id: 'food', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer'], color: COLOR_OBJ },
    { id: 'water', keywords: ['water', 'fountain', 'pond', 'stream', 'cup', 'skin', 'flagon', 'flask', 'bottle', 'jug', 'vial'], color: COLOR_OBJ },
    { id: 'corpses', keywords: ['corpse'], color: COLOR_OBJ },
    { id: 'misc', keywords: ['map', 'scroll', 'parchment', 'key', 'relic'], color: COLOR_OBJ },
    { id: 'object-room', keywords: [], color: COLOR_OBJ },

    // --- NPCS & SERVICES (Parent: NPC) ---
    { id: 'innkeeper', keywords: ['innkeeper'], color: COLOR_NPC },
    { id: 'shopkeeper', keywords: ['barman', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer'], color: COLOR_NPC },
    { id: 'mounts', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: COLOR_NPC },
    { id: 'guildmaster', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: COLOR_NPC },

    { id: 'exit', keywords: ['north', 'south', 'east', 'west', 'up', 'down'], color: 'rgba(255, 255, 255, 0.9)' },
    { id: 'default', keywords: [], color: COLOR_OBJ }
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
    const objParentColor = categories.find(c => c.id === 'object-room')?.color || COLOR_OBJ;

    // Hierarchy Definitions
    const NPC_FAMILY = ['innkeeper', 'shopkeeper', 'mounts', 'guildmaster', 'huor', 'inlinenpc', 'inline-npc'];
    const OBJ_FAMILY = ['lightsource', 'lantern', 'weapon', 'armour', 'shield', 'containers', 'food', 'water', 'corpses', 'object', 'object-room', 'quiver', 'obj-room', 'obj-char', 'obj-worn', 'obj-shop', 'misc'];

    if (NPC_FAMILY.includes(baseId)) return npcParentColor;
    if (OBJ_FAMILY.includes(baseId)) return objParentColor;
    if (baseId === 'inline-player' || baseId === 'inlineplayer') return COLOR_PLAYER;

    const config = categories.find(c => c.id === baseId) || categories.find(c => c.id === 'default');
    return config?.color || COLOR_OBJ;
}
