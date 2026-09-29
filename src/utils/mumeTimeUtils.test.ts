// @vitest-environment jsdom
/**
 * @file mumeTimeUtils.test.ts
 * @description Tests for MUME solar clock coloring.
 */

// --- Logic Section ---
import { describe, expect, it } from 'vitest';
import { getMumeTimeOfDayClass } from './mumeTimeUtils';

describe('getMumeTimeOfDayClass', () => {
    it('marks the hour before dawn as the red transition period', () => {
        expect(getMumeTimeOfDayClass('Halimath', 4, 30)).toBe('dawn-transition');
    });

    it('uses daylight color from dawn until dusk', () => {
        expect(getMumeTimeOfDayClass('Halimath', 5, 0)).toBe('daylight');
        expect(getMumeTimeOfDayClass('Halimath', 12, 0)).toBe('daylight');
    });

    it('uses night color after dusk and outside the dawn transition', () => {
        expect(getMumeTimeOfDayClass('Halimath', 21, 0)).toBe('night');
        expect(getMumeTimeOfDayClass('Halimath', 2, 0)).toBe('night');
    });
});
