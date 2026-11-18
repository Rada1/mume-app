/** @file shopStockCategories.test.ts — Best-effort classification of shop listings. */
import { expect, it } from 'vitest';
import { categorizeShopStock, classifyShopStock } from './shopStockCategories';

// --- Classification and present categories ---
it.each([
    ['ten exquisite wine glasses', 'containers'], ['gold rings', 'jewelry'],
    ['gem-inlaid knives', 'weapons'], ['a sturdy shield', 'shields'],
    ['a leather cloak', 'clothing'], ['a wooden pipe', 'pipes'],
    ['a loaf of bread', 'food'], ['an unfamiliar trinket', 'misc'],
])('classifies %s as %s', (name, category) => {
    expect(classifyShopStock(name)).toBe(category);
});

it('offers only categories represented by stock and keeps unknown items in Misc', () => {
    const items = [{ num: 1, name: 'gold rings', price: '1 gold' },
        { num: 2, name: 'an unfamiliar trinket', price: '2 gold' }];
    const result = categorizeShopStock(items);
    expect(result.categories.map(category => category.id)).toEqual(['jewelry', 'misc']);
    expect(result.byItem.get(items[1])).toBe('misc');
});
