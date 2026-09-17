/** @file effectTimerCatalog.test.ts */
import { describe, expect, it } from 'vitest';
import { EFFECT_TIMER_CATALOG } from './effectTimerCatalog';

describe('Bless timer messages', () => {
    const bless = EFFECT_TIMER_CATALOG.find(entry => entry.id === 'spell-bless');

    it('recognizes the standard Bless application and expiry text', () => {
        expect(bless?.startPatterns?.some(pattern => pattern.test('You begin to feel the light of Aman shine upon you.'))).toBe(true);
        expect(bless?.endPatterns?.some(pattern => pattern.test('The light of Aman fades away from you.'))).toBe(true);
    });
});

describe('Shroud timer messages', () => {
    const shroud = EFFECT_TIMER_CATALOG.find(entry => entry.id === 'spell-shroud');

    it('recognizes the standard Shroud application text', () => {
        expect(shroud?.startPatterns?.some(pattern => pattern.test('You are surrounded by a misty shroud.'))).toBe(true);
        expect(shroud?.endPatterns?.some(pattern => pattern.test('You feel more exposed.'))).toBe(true);
    });
});
