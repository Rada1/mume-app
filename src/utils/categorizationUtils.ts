/**
 * @file categorizationUtils.ts
 * @description Utilities for item/NPC categorization and visual themes
 */

import { InlineCategoryConfig } from '../types';

// palette definitions for consistency
const COLOR_NPC = 'rgba(253, 224, 71, 0.95)';   // Bright Pastel Yellow (#fde047)
const COLOR_PLAYER = 'rgba(125, 211, 252, 0.9)'; // Match who-list/pc-highlighter (#7dd3fc)
export const COLOR_OBJ = 'rgba(251, 146, 60, 0.95)';   // Vibrant Orange (#fb923c)


export const LEGACY_ID_MAP: Record<string, string> = {
    'inlinenpc': 'npc',
    'npc': 'npc',
    'inline-npc': 'npc',
    'inlineplayer': 'player',
    'player': 'player',
    'pc': 'player',
    'inline-player': 'player',
    'innkeeper': 'npc-innkeeper',
    'shopkeeper': 'npc-shopkeeper',
    'mounts': 'npc-mount',
    'guildmaster': 'npc-guildmaster',
    'weapon': 'object-weapon',
    'armour': 'object-armour',
    'shield': 'object-shield',
    'containers': 'object-container',
    'food': 'object-food',
    'fluidcontainer': 'object-fluid',
    'water': 'object-water',
    'treasure': 'object-treasure',
    'misc': 'object-misc',
    'corpses': 'object-corpse',
    'object-room': 'object-room',
    'default': 'object'
};

export const canonicalizeCategoryId = (id: string): string => {
    if (!id) return 'object';
    return LEGACY_ID_MAP[id] || id;
};

export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    // --- PLAYERS ---
    { id: 'player', kind: 'player', keywords: [] },

    // --- OBJECTS ---
    { id: 'object-corpse', kind: 'object', keywords: ['corpse'], color: COLOR_OBJ },
    { id: 'object-weapon', kind: 'object', keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'stick', 'knife', 'fist', 'blowpipe', 'wand', 'hammer', 'morning star', 'polearm', 'pike', 'lance', 'cleaver', 'ElfHewer', 'Durin', 'Trollsbane', 'Glamdring', 'Orcrist', 'Beater', 'Biter', 'Sting', 'Mithvegil', 'Bonecrusher', 'Angmacil', 'Alrehir'], color: COLOR_OBJ },
    { id: 'object-armour', kind: 'object', keywords: ['mail', 'breastplate', 'greaves', 'gauntlets', 'helmet', 'boots', 'leggings', 'sleeves', 'bracers', 'cloak', 'surcoat', 'jerkin', 'robe', 'tunic', 'trousers', 'belt', 'pants', 'breeches', 'shoes', 'sandals', 'scabbard', 'Dragonhelm', 'morion', 'crown', 'circlet', 'coif', 'basinet', 'cap', 'hat', 'hood', 'scarf', 'collar', 'hauberk', 'shirt', 'vest', 'jacket', 'dress', 'blouse', 'cape', 'mantle', 'vambraces', 'gloves', 'skirt', 'slippers', 'girdle', 'sash', 'wrapping', 'Daedeltiri'], color: COLOR_OBJ },
    { id: 'object-shield', kind: 'object', keywords: ['shield', 'buckler', 'targe'], color: COLOR_OBJ },
    { id: 'object-container', kind: 'object', keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar'], color: COLOR_OBJ },
    { id: 'object-food', kind: 'object', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], color: COLOR_OBJ },
    { id: 'object-fluid', kind: 'object', keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd'], color: COLOR_OBJ },
    { id: 'object-water', kind: 'object', keywords: ['water', 'fountain', 'pond', 'stream', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], color: COLOR_OBJ },
    { id: 'object-treasure', kind: 'object', keywords: ['gem', 'diamond', 'ruby', 'sapphire', 'topaz', 'emerald', 'garnet', 'opal', 'agate', 'onyx', 'citrine', 'spinel', 'carnelian', 'gold', 'silver', 'nugget', 'pearl', 'heirloom', 'treasure', 'medal', 'coin'], color: COLOR_OBJ },
    { id: 'object-misc', kind: 'object', keywords: ['map', 'scroll', 'parchment', 'key', 'relic', 'ring', 'amulet', 'necklace', 'charm', 'stone', 'orb', 'pendant', 'wristband', 'bracelet', 'circlet', 'crown', 'cloakpin', 'brooch', 'book', 'journal', 'libram', 'chronicle', 'paper', 'note', 'instrument', 'flute', 'harp', 'lute', 'drums', 'pipes', 'horn', 'rope', 'lockpicks', 'kit', 'sheath', 'harness', 'baldric', 'boat', 'skiff', 'canoe', 'raft', 'stick', 'fetish', 'die', 'top', 'pen', 'quill', 'lamp', 'lantern', 'light', 'street-lamp'], color: COLOR_OBJ },
    { id: 'object-room', kind: 'object', keywords: [], color: COLOR_OBJ },

    // --- NPCS ---
    { id: 'npc-innkeeper', kind: 'npc', keywords: ['innkeeper', 'barman', 'tender', 'lodging'], color: COLOR_NPC },
    { id: 'npc-shopkeeper', kind: 'npc', keywords: ['shopkeeper', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer', 'smith', 'trader', 'grocer', 'librarian', 'provisioner', 'alchemist', 'herbalist', 'tailor', 'blacksmith', 'vendor', 'cobbler', 'peddler'], color: COLOR_NPC },
    { id: 'npc-mount', kind: 'npc', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: COLOR_NPC },
    { id: 'npc-guildmaster', kind: 'npc', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: COLOR_NPC },
    { id: 'npc', kind: 'npc', keywords: ['orc', 'troll', 'wolf', 'spider', 'goblin', 'warg', 'bandit', 'scout', 'warrior', 'guard', 'citizen', 'deer', 'bear', 'rabbit', 'snake', 'wraith', 'spirit', 'undead', 'zombie', 'skeleton', 'bird', 'eagle', 'hawk', 'owl', 'crow', 'raven', 'rat', 'bat', 'shaman', 'priest', 'cleric', 'mage', 'sorcerer', 'thief', 'assassin', 'mercenary', 'elite', 'veteran', 'captain', 'leader', 'king', 'queen', 'lord', 'lady', 'dúnadan', 'dunadan', 'soldier', 'officer', 'man', 'woman', 'girl', 'boy', 'scholar', 'insolent', 'rugged'], color: COLOR_NPC },

    // --- EXITS ---
    { id: 'exit', kind: 'exit', keywords: ['north', 'south', 'east', 'west', 'up', 'down'], color: 'rgba(255, 255, 255, 0.9)' },
    
    // --- FALLBACK ---
    { id: 'object', kind: 'object', keywords: [], color: COLOR_OBJ }
];

/**
 * Determines the category for a given name based on keyword matching.
 */
export function getCategoryForName(name: string, customCategories?: InlineCategoryConfig[]): string | null {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;

    for (const cat of categories) {
        if ((cat.keywords || []).some(keyword => {
            const lowKey = keyword.toLowerCase();
            const regex = new RegExp(`(^|[^a-z])${lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
            return regex.test(lowerName);
        })) {
            return cat.id;
        }
    }

    // Fallback to defaults if custom didn't match and was provided
    if (customCategories) {
        for (const cat of DEFAULT_INLINE_CATEGORIES) {
            if (cat.keywords.some(keyword => {
                const lowKey = keyword.toLowerCase();
                const regex = new RegExp(`(^|[^a-z])${lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
                return regex.test(lowerName);
            })) {
                return cat.id;
            }
        }
    }

    return null;
}

/**
 * Gets the category type (npc, player, object, etc) for a given category ID.
 */
export function getCategoryType(category: string | null, customCategories?: InlineCategoryConfig[]): string | null {
    if (!category) return null;
    const canonicalId = canonicalizeCategoryId(category);
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;
    
    const config = categories.find(c => c.id === canonicalId);
    if (config?.kind) return config.kind;
    if (config?.categoryType) return config.categoryType;

    // Split segments: kind-sub -> kind
    const segments = canonicalId.split('-');
    if (segments.length >= 1) {
        const kind = segments[0];
        if (['npc', 'player', 'object', 'exit'].includes(kind)) return kind;
    }

    return null;
}

/**
 * Gets a glow color based on the category name, enforcing inheritance.
 */
export function getGlowColorForCategory(category: string | null, customCategories?: InlineCategoryConfig[]): string | null {
    if (!category) return null;
    const canonicalId = canonicalizeCategoryId(category);
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;
    
    const config = categories.find(c => c.id === canonicalId);
    if (config?.color) return config.color;

    // Inheritance via parent links (T5 feature)
    if (config?.parent) {
        return getGlowColorForCategory(config.parent, customCategories);
    }

    // Kind defaults
    const kind = getCategoryType(canonicalId, customCategories);
    if (kind === 'player') return COLOR_PLAYER;
    if (kind === 'npc') return COLOR_NPC;
    if (kind === 'object') return COLOR_OBJ;

    return null;
}

export const resolveKindAndLocation = (kind?: string | null, location?: string | null, cmd?: string | null): { kind: string, location: string } => {
    if (kind && location) {
        return { kind, location };
    }
    
    // Fallbacks based on old `data-cmd`
    if (cmd === 'inline-obj-room' || cmd === 'roomitems' || cmd === 'inline-corpses') return { kind: 'object', location: 'room' };
    if (cmd === 'inline-obj-char' || cmd === 'inventorylist') return { kind: 'object', location: 'carried' };
    if (cmd === 'inline-obj-worn' || cmd === 'equipmentlist') return { kind: 'object', location: 'worn' };
    if (cmd === 'inline-obj-shop') return { kind: 'object', location: 'shop' };
    if (cmd === 'inlinenpc' || cmd === 'roomnpcs' || cmd === 'inline-npc') return { kind: 'npc', location: 'room' };
    if (cmd === 'inlineplayer' || cmd === 'inline-player') return { kind: 'player', location: 'room' };

    // Default catch-all
    return { kind: 'object', location: 'room' };
};
