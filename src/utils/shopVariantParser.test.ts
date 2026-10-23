/**
 * @file shopVariantParser.test.ts
 * @description Representative MUME product and individual stock lines.
 */

import { describe, expect, it } from 'vitest';
import { getShopProductCount, parseShopVariant } from './shopVariantParser';

// --- Tests ---
describe('shop stock parsing', () => {
    it('accepts individual stock without a condition and excludes object IDs from prices', () => {
        expect(parseShopVariant('24. for three gold and five silver <o5705>.'))
            .toEqual({ num: 24, condition: '', price: 'three gold and five silver' });
        expect(parseShopVariant('25. for three gold and five silver.'))
            .toEqual({ num: 25, condition: '', price: 'three gold and five silver' });
    });
    it('recognizes grouped stock and parses individual condition and price', () => {
        expect(getShopProductCount('ten fine metal breastplates (satisfactory, new)')).toBe(10);
        expect(parseShopVariant('65. (satisfactory, new) for sixteen gold and fourteen silver.'))
            .toEqual({ num: 65, condition: 'satisfactory, new', price: 'sixteen gold and fourteen silver' });
        expect(parseShopVariant('64. ten fine metal breastplates:')).toBeNull();
    });
});
