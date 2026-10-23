/** @file shopPurchaseUtils.test.ts — Quantity limits, valid buy commands, and normalized total costs. */
import { expect, it } from 'vitest';
import { clampShopPurchaseQuantity, getShopBuyCommand, getShopPurchaseLimit, getShopPurchaseTotal } from './shopPurchaseUtils';

// --- Purchase Calculation Checks ---
it('limits purchases to stock and the server maximum of twenty', () => {
    expect(getShopPurchaseLimit({ num: 23, name: 'ten exquisite glasses', price: '3 gold' })).toBe(10);
    expect(getShopPurchaseLimit({ num: 23, name: '30 glasses', price: '3 gold' })).toBe(20);
    expect(getShopPurchaseLimit({ num: 24, name: 'an exquisite glass', price: '3 gold' })).toBe(1);
    expect(clampShopPurchaseQuantity(null, -2)).toBe(1);
});

it('formats actual numeric quantity syntax and clamps invalid quantities', () => {
    const item = { num: 23, name: 'ten exquisite glasses', price: '3 gold' };
    expect(getShopBuyCommand(item, 1)).toBe('buy 23');
    expect(getShopBuyCommand(item, 3)).toBe('buy 3 23');
    expect(getShopBuyCommand(item, 100)).toBe('buy 10 23');
});

it.each([
    ['five gold and three silver', 3, '15 gold 9 silver'],
    ['three gold and five silver', 10, '32 gold 10 silver'],
    ['ten silver and twenty-five copper', 3, '1 gold 16 silver 3 copper'],
    ['three lauren and eleven celeb', 2, '7 gold 2 silver'],
    ['free', 5, 'free'], ['price on request', 2, null]
])('calculates %s times %s as %s', (price, quantity, expected) => {
    expect(getShopPurchaseTotal(price, quantity)).toBe(expected);
});
