/**
 * @file shopVariantParser.ts
 * @description Parse numbered stock lines returned by the MUME list <product> command.
 */

import type { ShopVariant } from '../types';

// --- Logic Section ---
const pricePattern = /(?:for|costs?)\s+(.+?)\s*\.?$/i;

export const parseShopVariant = (line: string): ShopVariant | null => {
    const match = line.match(/^\s*(\d+)\.\s+(.*?)\s*$/);
    if (!match) return null;
    const body = match[2];
    const price = body.match(pricePattern);
    if (!price) return null;
    const condition = body.slice(0, price.index).trim().replace(/^\(|\)$/g, '');
    if (!condition || /^(?:ten|nine|eight|seven|six|five|four|three|two|one)\s/i.test(condition)) return null;
    return { num: Number(match[1]), condition, price: price[1].replace(/\.$/, '').trim() };
};

const quantityWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20
};

export const getShopProductCount = (name: string): number | null => {
    const first = name.trim().split(/\s+/)[0]?.toLowerCase();
    if (!first) return null;
    const count = /^\d+$/.test(first) ? Number(first) : quantityWords[first];
    return count > 1 ? count : null;
};
