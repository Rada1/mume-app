/**
 * Utility for categorizing item and entity names into specialized command sets.
 */

export interface InlineCategoryConfig {
    id: string; // The base name of the category (e.g. 'lantern')
    keywords: string[];
    color?: string;
}

export const DEFAULT_INLINE_CATEGORIES: InlineCategoryConfig[] = [
    { id: 'lantern', keywords: ['lantern', 'torch', 'lamp', 'candle', 'light'], color: 'rgba(59, 130, 246, 0.9)' },
    { id: 'food', keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer'], color: 'rgba(52, 211, 153, 0.9)' },
    { id: 'water', keywords: ['water', 'fountain', 'cup', 'skin', 'flagon', 'flask', 'bottle', 'jug', 'vial'], color: 'rgba(52, 211, 153, 0.9)' },
    { id: 'innkeeper', keywords: ['innkeeper'], color: 'rgba(236, 72, 153, 0.9)' },
    { id: 'shopkeeper', keywords: ['barman', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer'], color: 'rgba(139, 92, 246, 0.9)' },
    { id: 'mounts', keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], color: 'rgba(139, 69, 19, 0.9)' },
    { id: 'corpses', keywords: ['corpse'], color: 'rgba(156, 163, 175, 0.9)' },
    { id: 'guildmaster', keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], color: 'rgba(168, 85, 247, 0.9)' },
    { id: 'bench', keywords: ['bench', 'stool', 'chair', 'bed'], color: 'rgba(100, 255, 100, 0.5)' },
    { id: 'default', keywords: [], color: 'rgba(255, 255, 0, 0.9)' }
];

/**
 * Determines the category for a given name based on keyword matching.
 * Returns the full setId (e.g. 'inline-lantern')
 */
export function getCategoryForName(name: string, customCategories?: InlineCategoryConfig[]): string | null {
    if (!name) return null;
    const lowerName = name.toLowerCase();
    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;

    // First try the provided categories (which might be user-customized)
    for (const cat of categories) {
        if (cat.keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
            return `inline-${cat.id}`;
        }
    }

    // Fallback: If we didn't find a match in the provided list (e.g. user has an old list),
    // check the DEFAULT_INLINE_CATEGORIES specifically for the 'guildmaster' and 'shopkeeper'
    // to ensure 'huor' and other hardcoded defaults work for everyone.
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
 * Gets a glow color based on the category name.
 */
export function getGlowColorForCategory(category: string | null, customCategories?: InlineCategoryConfig[]): string | null {
    if (!category) return null;

    // Extract base id if it has the 'inline-' prefix
    const baseId = category.startsWith('inline-') ? category.slice(7) : category;

    const categories = customCategories || DEFAULT_INLINE_CATEGORIES;
    const config = categories.find(c => c.id === baseId) || categories.find(c => c.id === 'default');
    return config?.color || 'rgba(255, 255, 0, 0.9)';
}
