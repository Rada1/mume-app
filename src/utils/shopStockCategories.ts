/** @file shopStockCategories.ts — Best-effort categories for captured shop stock. */
import type { ShopItem } from '../types';
import { getTraitsForName } from './inlineActionModel';

// --- Stock classification ---
export const SHOP_STOCK_CATEGORIES = [
    { id: 'weapons', label: 'Weapons' }, { id: 'clothing', label: 'Clothing & armour' },
    { id: 'shields', label: 'Shields' }, { id: 'herbs', label: 'Herbs' },
    { id: 'food', label: 'Food & drink' }, { id: 'jewelry', label: 'Gems & jewelry' },
    { id: 'pipes', label: 'Pipes & pipeweed' }, { id: 'containers', label: 'Containers' },
    { id: 'tools', label: 'Tools & travel' }, { id: 'misc', label: 'Misc' },
] as const;
export type ShopStockCategory = typeof SHOP_STOCK_CATEGORIES[number]['id'];

const singularize = (name: string): string => name.toLowerCase().replace(/[a-z]+/g, word => {
    const irregular: Record<string, string> = { knives: 'knife', leaves: 'leaf', loaves: 'loaf', staves: 'staff' };
    if (irregular[word]) return irregular[word];
    if (word.length > 5 && /(?:sses|xes|ches|shes)$/.test(word)) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
});

export function classifyShopStock(name: string): ShopStockCategory {
    const normalized = singularize(name);
    const traits = new Set([...getTraitsForName(name), ...getTraitsForName(normalized)].map(trait => trait.id));
    if (/\b(?:pipe|pipeweed|tobacco)\b/.test(normalized)) return 'pipes';
    if (traits.has('trait-shield')) return 'shields';
    if (traits.has('trait-weapon') || traits.has('trait-ammunition')) return 'weapons';
    if (traits.has('trait-herb')) return 'herbs';
    if (traits.has('trait-jewelry') || /\b(?:diamond|ruby|sapphire|emerald|garnet|opal|amethyst|gemstone)\b/.test(normalized)) return 'jewelry';
    if (traits.has('trait-armour')) return 'clothing';
    if (traits.has('trait-container') || traits.has('trait-fluid-container')) return 'containers';
    if (traits.has('trait-food') || /\b(?:wine|ale|beer|cider|mead|liquor)\b/.test(normalized)) return 'food';
    if (traits.has('trait-tool') || traits.has('trait-vehicle')) return 'tools';
    return 'misc';
}

export function categorizeShopStock(items: ShopItem[]) {
    const byItem = new Map<ShopItem, ShopStockCategory>();
    const present = new Set<ShopStockCategory>();
    for (const item of items) {
        const category = classifyShopStock(item.name);
        byItem.set(item, category);
        present.add(category);
    }
    return { byItem, categories: SHOP_STOCK_CATEGORIES.filter(category => present.has(category.id)) };
}
