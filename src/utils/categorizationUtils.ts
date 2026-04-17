/**
 * @file categorizationUtils.ts
 * @description Utilities for item/NPC categorization and visual themes
 */

import { InlineCategoryConfig } from '../types';

// palette definitions for consistency
const COLOR_NPC = 'rgba(254, 240, 138, 0.9)';   // Pastel Yellow (#fef08a)
const COLOR_PLAYER = 'rgba(125, 211, 252, 0.9)'; // Match who-list/pc-highlighter (#7dd3fc)
export const COLOR_OBJ = 'rgba(235, 135, 65, 0.9)';   // Official Object Brown (matches log highlights)


export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    // --- TOP PRIORITY: Prevent important objects from being tagged as NPCs ---
    { id: 'corpses', keywords: ['corpse'], color: COLOR_OBJ },

    // --- LIGHT & OBJECTS (Parent: Object) ---
    { id: 'lightsource', keywords: ['hooded', 'torch', 'candle'], color: COLOR_OBJ },
    { id: 'lantern', keywords: [], color: COLOR_OBJ },
    { id: 'weapon', keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'stick', 'knife', 'fist', 'blowpipe', 'wand', 'ElfHewer', 'Durin', 'Trollsbane', 'Glamdring', 'Orcrist', 'Beater', 'Biter', 'Sting', 'Mithvegil', 'Bonecrusher', 'Angmacil', 'Alrehir'], color: COLOR_OBJ },
    { id: 'armour', keywords: ['mail', 'breastplate', 'greaves', 'gauntlets', 'helmet', 'boots', 'leggings', 'sleeves', 'bracers', 'cloak', 'surcoat', 'jerkin', 'robe', 'tunic', 'trousers', 'belt', 'pants', 'breeches', 'shoes', 'sandals', 'scabbard', 'Dragonhelm', 'morion', 'crown', 'circlet', 'coif', 'basinet', 'cap', 'hat', 'hood', 'scarf', 'collar', 'hauberk', 'shirt', 'vest', 'jacket', 'dress', 'blouse', 'cape', 'mantle', 'vambraces', 'gloves', 'skirt', 'slippers', 'girdle', 'sash', 'wrapping', 'Daedeltiri'], color: COLOR_OBJ },
    { id: 'shield', keywords: ['shield', 'buckler', 'targe'], color: COLOR_OBJ },
    { id: 'containers', keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar', 'quiver', 'wallet', 'case'], color: COLOR_OBJ },
    { id: 'food', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], color: COLOR_OBJ },
    { id: 'fluidcontainer', keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd'], color: COLOR_OBJ },
    { id: 'water', keywords: ['water', 'fountain', 'pond', 'stream', 'cup', 'skin', 'flagon', 'flask', 'bottle', 'jug', 'vial', 'mug', 'barrel', 'pail', 'goblet', 'pint', 'tincture', 'phial', 'pool', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], color: COLOR_OBJ },
    { id: 'treasure', keywords: ['gem', 'diamond', 'ruby', 'sapphire', 'topaz', 'emerald', 'garnet', 'opal', 'agate', 'onyx', 'citrine', 'spinel', 'carnelian', 'gold', 'silver', 'nugget', 'pearl', 'heirloom', 'treasure', 'medal', 'coin'], color: COLOR_OBJ },
    { id: 'misc', keywords: ['map', 'scroll', 'parchment', 'key', 'relic', 'ring', 'amulet', 'necklace', 'charm', 'stone', 'orb', 'pendant', 'wristband', 'bracelet', 'circlet', 'crown', 'cloakpin', 'brooch', 'book', 'journal', 'libram', 'chronicle', 'paper', 'note', 'instrument', 'flute', 'harp', 'lute', 'drums', 'pipes', 'horn', 'rope', 'lockpicks', 'kit', 'sheath', 'harness', 'baldric', 'boat', 'skiff', 'canoe', 'raft', 'stick', 'fetish', 'die', 'top', 'pen', 'quill', 'lamp', 'lantern', 'light', 'street-lamp'], color: COLOR_OBJ },
    { id: 'object-room', keywords: [], color: COLOR_OBJ },

    // --- NPCS & SERVICES (Parent: NPC) - Lower priority to avoid misidentifying objects ---
    { id: 'innkeeper', keywords: ['innkeeper', 'barman', 'tender', 'lodging'], color: COLOR_NPC },
    { id: 'shopkeeper', keywords: ['shopkeeper', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer', 'smith', 'trader', 'grocer', 'librarian', 'provisioner', 'alchemist', 'herbalist', 'tailor', 'blacksmith', 'vendor', 'cobbler', 'peddler'], color: COLOR_NPC },
    { id: 'mounts', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: COLOR_NPC },
    { id: 'guildmaster', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: COLOR_NPC },
    { id: 'npc', keywords: ['orc', 'troll', 'wolf', 'spider', 'goblin', 'warg', 'bandit', 'scout', 'warrior', 'guard', 'citizen', 'deer', 'bear', 'rabbit', 'snake', 'wraith', 'spirit', 'undead', 'zombie', 'skeleton', 'bird', 'eagle', 'hawk', 'owl', 'crow', 'raven', 'rat', 'bat', 'shaman', 'priest', 'cleric', 'mage', 'sorcerer', 'thief', 'assassin', 'mercenary', 'elite', 'veteran', 'captain', 'leader', 'king', 'queen', 'lord', 'lady', 'dúnadan', 'dunadan', 'soldier', 'officer', 'man', 'woman', 'girl', 'boy', 'scholar', 'insolent', 'rugged'], color: COLOR_NPC },

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

    // Word-boundary check to prevent miscategorization (e.g. "Scabbard" -> "bar" -> NPC)
    const words = lowerName.split(/[\s,.-]+/);

    for (const cat of categories) {
        if ((cat.keywords || []).some(keyword => {
            const lowKey = keyword.toLowerCase();
            // Simple bound check for multi-word or single-word strings
            const regex = new RegExp(`(^|[^a-z])${lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
            return regex.test(lowerName);
        })) {
            return `inline-${cat.id}`;
        }
    }

    if (customCategories) {
        for (const cat of DEFAULT_INLINE_CATEGORIES) {
            if (cat.keywords.some(keyword => {
                const lowKey = keyword.toLowerCase();
                const regex = new RegExp(`(^|[^a-z])${lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
                return regex.test(lowerName);
            })) {
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
    const npcParentColor = categories.find(c => c.id === 'npc')?.color || COLOR_NPC;
    const objParentColor = categories.find(c => c.id === 'object-room' || c.id === 'default')?.color || COLOR_OBJ;

    // Hierarchy Definitions
    const NPC_FAMILY = ['innkeeper', 'shopkeeper', 'mounts', 'guildmaster', 'huor', 'npc', 'inlinenpc', 'inline-npc'];
    const OBJ_FAMILY = ['lightsource', 'lantern', 'weapon', 'armour', 'shield', 'containers', 'food', 'water', 'corpses', 'object', 'object-room', 'quiver', 'obj-room', 'obj-char', 'obj-worn', 'obj-shop', 'misc', 'treasure'];

    if (NPC_FAMILY.includes(baseId) || baseId === 'npc') return npcParentColor;
    if (OBJ_FAMILY.includes(baseId)) return objParentColor;
    if (baseId === 'inline-player' || baseId === 'inlineplayer' || baseId === 'player') return COLOR_PLAYER;

    const config = categories.find(c => c.id === baseId) || categories.find(c => c.id === 'default');
    return config?.color || COLOR_OBJ;
}
