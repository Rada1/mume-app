/**
 * @file categorizationUtils.ts
 * @description Utilities for item/NPC categorization and visual themes
 */

import { InlineCategoryConfig } from '../types';

// palette definitions for consistency (These are fallbacks only)
export const COLOR_NPC = 'rgba(253, 224, 71, 0.95)';
export const COLOR_PLAYER = '#89CFF0';
export const COLOR_OBJ = 'rgba(251, 146, 60, 0.95)';   // Vibrant Orange (#fb923c)
export const COLOR_ALLY = '#22c55e';
export const COLOR_ENEMY = '#ef4444';
export const COLOR_NEUTRAL = '#94a3b8';
export const COLOR_ROOM = '#22c55e';


export const LEGACY_ID_MAP: Record<string, string> = {
    'inlinenpc': 'inline-npc',
    'npc': 'inline-npc',
    'inline-npc': 'inline-npc',
    // Generic "player" identifiers all collapse to inline-ally — the inline-player
    // set was retired in favor of the four typed sets (ally/enemy/neutral/npc).
    'inlineplayer': 'inline-ally',
    'player': 'inline-ally',
    'pc': 'inline-ally',
    'inline-player': 'inline-ally',
    'ally': 'inline-ally',
    'enemy': 'inline-enemy',
    'neutral': 'inline-neutral',
    'innkeeper': 'inline-innkeeper',
    'shopkeeper': 'inline-shopkeeper',
    'mounts': 'inline-mounts',
    'guildmaster': 'inline-guildmaster',
    'weapon': 'inline-weapon',
    'armour': 'inline-armour',
    'shield': 'inline-shield',
    'containers': 'inline-containers',
    'food': 'inline-food',
    'fluidcontainer': 'inline-fluidcontainer',
    'water': 'inline-water',
    'treasure': 'inline-treasure',
    'misc': 'inline-misc',
    'corpses': 'inline-corpses',
    'object-room': 'inline-obj-room',
    'obj-room': 'inline-obj-room',
    'obj-char': 'inline-obj-char',
    'obj-worn': 'inline-obj-worn',
    'default': 'inline-object'
};

export const canonicalizeCategoryId = (id: string): string => {
    if (!id) return 'object';
    return LEGACY_ID_MAP[id] || id;
};

export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    // --- PLAYERS (typed per MUME GMCP Room.Chars: ally / enemy / neutral) ---
    // No keyword fallback for chars — classification comes from GMCP `type` only.
    { id: 'inline-player', kind: 'player', keywords: [], color: COLOR_PLAYER },
    { id: 'inline-ally', kind: 'player', keywords: [], color: COLOR_ALLY },
    { id: 'inline-enemy', kind: 'player', keywords: [], color: COLOR_ENEMY },
    { id: 'inline-neutral', kind: 'player', keywords: [], color: COLOR_NEUTRAL },

    // --- OBJECTS ---
    { id: 'inline-corpses', kind: 'object', keywords: ['corpse'], color: COLOR_OBJ },
    { id: 'inline-weapon', kind: 'object', keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'stick', 'knife', 'fist', 'blowpipe', 'wand', 'hammer', 'morning star', 'polearm', 'pike', 'lance', 'cleaver', 'ElfHewer', 'Durin', 'Trollsbane', 'Glamdring', 'Orcrist', 'Beater', 'Biter', 'Sting', 'Mithvegil', 'Bonecrusher', 'Angmacil', 'Alrehir'], color: COLOR_OBJ },
    { id: 'inline-armour', kind: 'object', keywords: ['mail', 'breastplate', 'greaves', 'gauntlets', 'helmet', 'boots', 'leggings', 'sleeves', 'bracers', 'cloak', 'surcoat', 'jerkin', 'robe', 'tunic', 'trousers', 'belt', 'pants', 'breeches', 'shoes', 'sandals', 'scabbard', 'Dragonhelm', 'morion', 'crown', 'circlet', 'coif', 'basinet', 'cap', 'hat', 'hood', 'scarf', 'collar', 'hauberk', 'shirt', 'vest', 'jacket', 'dress', 'blouse', 'cape', 'mantle', 'vambraces', 'gloves', 'skirt', 'slippers', 'girdle', 'sash', 'wrapping', 'Daedeltiri'], color: COLOR_OBJ },
    { id: 'inline-shield', kind: 'object', keywords: ['shield', 'buckler', 'targe'], color: COLOR_OBJ },
    { id: 'inline-containers', kind: 'object', keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar'], color: COLOR_OBJ },
    { id: 'inline-food', kind: 'object', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], color: COLOR_OBJ },
    { id: 'inline-fluidcontainer', kind: 'object', keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd'], color: COLOR_OBJ },
    { id: 'inline-water', kind: 'object', keywords: ['water', 'fountain', 'pond', 'stream', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], color: COLOR_OBJ },
    { id: 'inline-treasure', kind: 'object', keywords: ['gem', 'diamond', 'ruby', 'sapphire', 'topaz', 'emerald', 'garnet', 'opal', 'agate', 'onyx', 'citrine', 'spinel', 'carnelian', 'gold', 'silver', 'nugget', 'pearl', 'heirloom', 'treasure', 'medal', 'coin'], color: COLOR_OBJ },
    { id: 'inline-misc', kind: 'object', keywords: ['map', 'scroll', 'parchment', 'key', 'relic', 'ring', 'amulet', 'necklace', 'charm', 'stone', 'orb', 'pendant', 'wristband', 'bracelet', 'circlet', 'crown', 'cloakpin', 'brooch', 'book', 'journal', 'libram', 'chronicle', 'paper', 'note', 'instrument', 'flute', 'harp', 'lute', 'drums', 'pipes', 'horn', 'rope', 'lockpicks', 'kit', 'sheath', 'harness', 'baldric', 'boat', 'skiff', 'canoe', 'raft', 'stick', 'fetish', 'die', 'top', 'pen', 'quill', 'lamp', 'lantern', 'light', 'street-lamp'], color: COLOR_OBJ },
    { id: 'inline-obj-room', kind: 'object', keywords: [], color: COLOR_OBJ },

    // --- ROOMS & EXITS ---
    { id: 'room', kind: 'room', keywords: [], color: COLOR_ROOM },
    { id: 'exit', kind: 'exit', keywords: ['north', 'south', 'east', 'west', 'up', 'down'], color: 'rgba(255, 255, 255, 0.9)' },

    // --- NPCS ---
    { id: 'inline-innkeeper', kind: 'npc', keywords: ['innkeeper', 'barman', 'tender', 'lodging'], color: COLOR_NPC },
    { id: 'inline-shopkeeper', kind: 'npc', keywords: ['shopkeeper', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer', 'smith', 'trader', 'grocer', 'librarian', 'provisioner', 'alchemist', 'herbalist', 'tailor', 'blacksmith', 'vendor', 'cobbler', 'peddler'], color: COLOR_NPC },
    { id: 'inline-mounts', kind: 'npc', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: COLOR_NPC },
    { id: 'inline-guildmaster', kind: 'npc', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: COLOR_NPC },
    { id: 'inline-npc', kind: 'npc', keywords: ['orc', 'troll', 'goblin', 'warg', 'bandit', 'wraith', 'spirit', 'undead', 'zombie', 'skeleton', 'shaman', 'assassin', 'mercenary'], color: COLOR_NPC },

    // --- FALLBACK ---
    { id: 'inline-object', kind: 'object', keywords: [], color: COLOR_OBJ }

];

/**
 * Returns all traits (category IDs) for a given name based on keyword matching.
 */
export function getTraitsForName(name: string, customCategories?: InlineCategoryConfig[]): string[] {
    return getTraitConfigsForName(name, customCategories).map(c => c.id);
}

/**
 * Returns all trait configurations for a given name based on keyword matching.
 */
export function getTraitConfigsForName(name: string, customCategories?: InlineCategoryConfig[]): InlineCategoryConfig[] {
    if (!name) return [];
    const lowerName = name.toLowerCase();
    const configs: InlineCategoryConfig[] = [];

    const checkCategories = (cats: InlineCategoryConfig[]) => {
        for (const cat of cats) {
            if ((cat.keywords || []).some(keyword => {
                const lowKey = keyword.toLowerCase();
                // Word boundary check to avoid false positives (e.g., "rugged" matching "rug")
                const regex = new RegExp(`(^|[^a-z])${lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
                return regex.test(lowerName);
            })) {
                configs.push(cat);
            }
        }
    };

    // 1. Check custom categories first
    if (customCategories && Array.isArray(customCategories)) {
        checkCategories(customCategories);
    }

    // 2. Check default categories
    checkCategories(DEFAULT_INLINE_CATEGORIES);

    return configs;
}

/**
 * Determines the primary category for a given name based on keyword matching.
 */
export function getCategoryForName(name: string, customCategories?: InlineCategoryConfig[]): string | null {
    const traits = getTraitsForName(name, customCategories);
    return traits.length > 0 ? traits[0] : null;
}

/**
 * Gets the category type (npc, player, object, etc) for a given category ID.
 */
export function getCategoryType(category: string | null, customCategories?: InlineCategoryConfig[]): string | null {
    if (!category) return null;
    const canonicalId = canonicalizeCategoryId(category);
    const categories = (customCategories && Array.isArray(customCategories)) ? customCategories : DEFAULT_INLINE_CATEGORIES;
    
    const config = categories.find(c => c.id === canonicalId);
    if (config?.kind) return config.kind;
    if (config?.categoryType) return config.categoryType;

    // Split segments: kind-sub -> kind
    const segments = canonicalId.split('-');
    if (segments.length >= 1) {
        const kind = segments[0];
        if (['npc', 'player', 'object', 'exit', 'room'].includes(kind)) return kind;
    }

    return null;
}

/**
 * Gets a glow color based on the category name, enforcing inheritance.
 */
export function getGlowColorForCategory(
    category: string | null, 
    customCategories?: InlineCategoryConfig[],
    kindColors?: { npc?: string, player?: string, object?: string, room?: string }
): string | null {
    if (!category) return null;
    const canonicalId = canonicalizeCategoryId(category);
    const categories = (customCategories && Array.isArray(customCategories)) ? customCategories : DEFAULT_INLINE_CATEGORIES;
    
    const kind = getCategoryType(canonicalId, customCategories);

    // 1. Try to get color from kindColors overrides (from settings) - PRIORITY
    if (kind === 'player' && kindColors?.player) return kindColors.player;
    if (kind === 'npc' && kindColors?.npc) return kindColors.npc;
    if (kind === 'object' && kindColors?.object) return kindColors.object;
    if (kind === 'room' && kindColors?.room) return kindColors.room;

    // 2. Check custom categories (Traits)
    const config = categories.find(c => c.id === canonicalId);
    if (config?.color) return config.color;

    // 3. Fallback to the color defined in config (even if it's default)
    if (config?.color) return config.color;

    // 4. Inheritance via parent links
    if (config?.parent) {
        return getGlowColorForCategory(config.parent, customCategories, kindColors);
    }

    // 5. Hardcoded Kind defaults (absolute final fallbacks)
    if (kind === 'player') return COLOR_PLAYER;
    if (kind === 'npc') return COLOR_NPC;
    if (kind === 'object') return COLOR_OBJ;
    if (kind === 'room') return COLOR_ROOM;

    return null;
}

export const resolveKindAndLocation = (kind?: string | null, location?: string | null, cmd?: string | null): { kind: string, location: string } => {
    if (kind && location) {
        return { kind, location };
    }
    
    // Fallbacks based on old `data-cmd`
    if (cmd === 'inline-obj-room' || cmd === 'obj-room' || cmd === 'roomitems' || cmd === 'inline-corpses') return { kind: 'object', location: 'room' };
    if (cmd === 'inline-obj-char' || cmd === 'obj-char' || cmd === 'inventorylist') return { kind: 'object', location: 'carried' };
    if (cmd === 'inline-obj-worn' || cmd === 'obj-worn' || cmd === 'equipmentlist') return { kind: 'object', location: 'worn' };
    if (cmd === 'inline-obj-shop') return { kind: 'object', location: 'shop' };
    if (cmd === 'inlinenpc' || cmd === 'roomnpcs' || cmd === 'inline-npc') return { kind: 'npc', location: 'room' };
    if (cmd === 'inlineplayer' || cmd === 'inline-player') return { kind: 'player', location: 'room' };
    if (cmd === 'roomname' || cmd === 'room-name' || cmd === 'exits') return { kind: 'room', location: 'room' };

    // Default catch-all
    return { kind: 'object', location: 'room' };
};
