/**
 * @file logFontSizing.test.ts
 * @description Coverage for message log font sizing helpers.
 */

import { describe, expect, it } from 'vitest';
import {
    MOBILE_PORTRAIT_AUTO_FONT_BIAS_PX,
    clampLogFontSize,
    getMinimumLogFontSize,
    getMobilePortraitFontBias
} from '../logFontSizing';

// --- Tests ---

describe('logFontSizing', () => {
    it('adds a half-pixel auto font bias only for mobile portrait', () => {
        expect(getMobilePortraitFontBias(true, false)).toBe(MOBILE_PORTRAIT_AUTO_FONT_BIAS_PX);
        expect(getMobilePortraitFontBias(true, true)).toBe(0);
        expect(getMobilePortraitFontBias(false, false)).toBe(0);
    });

    it('keeps the lower mobile portrait clamp for tight 80-column layouts', () => {
        expect(getMinimumLogFontSize(true, false)).toBe(6);
        expect(getMinimumLogFontSize(true, true)).toBe(10);
        expect(getMinimumLogFontSize(false, false)).toBe(10);
    });

    it('clamps measured font sizes to supported bounds', () => {
        expect(clampLogFontSize(5, 6)).toBe(6);
        expect(clampLogFontSize(16.5, 6)).toBe(16.5);
        expect(clampLogFontSize(60, 6)).toBe(48);
    });
});
