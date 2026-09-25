/**
 * @file shopVariantParser.test.ts
 * @description Representative MUME product and individual stock lines.
 */

import { describe, expect, it } from 'vitest';
import { getShopProductCount, parseShopVariant } from './shopVariantParser';

// --- Tests ---
describe('shop stock parsing', () => {
    it('recognizes grouped stock and parses individual condition and price', () => {
        expect(getShopProductCount('ten fine metal breastplates (satisfactory, new)')).toBe(10);
        expect(parseShopVariant('65. (satisfactory, new) for sixteen gold and fourteen silver.'))
            .toEqual({ num: 65, condition: 'satisfactory, new', price: 'sixteen gold and fourteen silver' });
        expect(parseShopVariant('64. ten fine metal breastplates:')).toBeNull();
    });
});
