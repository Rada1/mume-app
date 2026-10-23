/** @file formatMumePrice.test.ts — Compact shop prices preserve denominations and unknown values. */
import { expect, it } from 'vitest';
import { formatMumePrice } from './gameUtils';

// --- Display Formatting ---
it.each([
    ['five gold and three silver', '5 gold 3 silver'],
    ['seventeen silver and ninety-three copper', '17 silver 93 copper'],
    ['twenty-five gold, thirteen silver and four copper.', '25 gold 13 silver 4 copper'],
    ['one hundred and five gold and eleven silver', '105 gold 11 silver'],
    ['one hundred thousand gold', '100000 gold'],
    ['three thousand two hundred and five gold', '3205 gold'],
    ['1,250 gold and 12 silver', '1250 gold 12 silver'],
    ['three lauren and eleven celeb', '3 lauren 11 celeb'],
    ['a gold coin and three silver pennies', '1 gold 3 silver'],
    ['5 gold 3 silver', '5 gold 3 silver'],
    ['free', 'free'], ['several gold', 'several gold'],
    ['five gold and an unknown surcharge', 'five gold and an unknown surcharge'],
    ['', '']
])('formats %s as %s', (input, output) => expect(formatMumePrice(input)).toBe(output));
