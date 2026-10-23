/** @file shopPurchaseUtils.ts — Bounds shop quantities and calculates pre-purchase price estimates. */
import type { ShopItem } from '../types';
import { formatCopperToCoins, formatMumePrice } from './gameUtils';
import { getShopProductCount } from './shopVariantParser';

// --- Logic Section ---
export const getShopPurchaseLimit = (item: ShopItem | null): number =>
    Math.min(20, item ? getShopProductCount(item.name) || 1 : 1);

export const clampShopPurchaseQuantity = (item: ShopItem | null, quantity: number): number =>
    Math.max(1, Math.min(getShopPurchaseLimit(item), Number.isFinite(quantity) ? Math.floor(quantity) : 1));

export const getShopBuyCommand = (item: ShopItem, quantity: number): string => {
    const count = clampShopPurchaseQuantity(item, quantity);
    return count > 1 ? `buy ${count} ${item.num}` : `buy ${item.num}`;
};

export const getShopPurchaseTotal = (price: string, quantity: number): string | null => {
    if (/^free\.?$/i.test(price.trim())) return 'free';
    const formatted = formatMumePrice(price);
    const amounts = [...formatted.matchAll(/(\d+)\s+(gold|silver|copper|lauren|celeb|busc)\b/g)];
    if (!amounts.length || formatted.replace(/\d+\s+(?:gold|silver|copper|lauren|celeb|busc)\b/g, '').trim()) return null;
    const unitValue: Record<string, number> = { gold: 240, lauren: 240, silver: 12, celeb: 12, copper: 1, busc: 1 };
    const total = amounts.reduce((sum, match) => sum + Number(match[1]) * unitValue[match[2]], 0) * quantity;
    if (!Number.isSafeInteger(total) || total < 0) return null;
    const coins = formatCopperToCoins(total);
    return [coins.gold ? `${coins.gold} gold` : '', coins.silver ? `${coins.silver} silver` : '',
        coins.copper ? `${coins.copper} copper` : ''].filter(Boolean).join(' ') || '0 gold';
};
