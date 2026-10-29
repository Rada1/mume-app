import { describe, it, expect } from 'vitest';
import { getZoneColor, getZoneAmbientGlow, getZoneFrameColor, DEFAULT_ZONE_COLOR, hashStringToColor, getZoneTextColor, hexToHsl } from './zoneColors';

describe('zoneColors', () => {
    it('returns default color for null, undefined, or empty string', () => {
        expect(getZoneColor(null)).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor(undefined)).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('')).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('   ')).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('()')).toBe(DEFAULT_ZONE_COLOR);
    });

    it('groups known zones by alignment color', () => {
        expect(getZoneColor('Valinor')).toBe('#69b68f');
        expect(getZoneColor('(Valinor)')).toBe('#69b68f');
        expect(getZoneColor('The Shire')).toBe('#69b68f');
        expect(getZoneColor('the shire')).toBe('#69b68f');
        expect(getZoneColor('Shire')).toBe('#69b68f');
        expect(getZoneColor('(the Shire)')).toBe('#69b68f');
        expect(getZoneColor('Rivendell')).toBe('#69b68f');
        expect(getZoneColor('Bree')).toBe('#69b68f');
        expect(getZoneColor('Lorien Surroundings')).toBe('#75b2e8');
        expect(getZoneColor('the Lorien Surroundings')).toBe('#75b2e8');
        expect(getZoneColor('Moria')).toBe('#a51c24');
        expect(getZoneColor('Dol Guldur')).toBe('#a51c24');
        expect(getZoneColor('the Troll Warrens')).toBe('#a51c24');
        expect(getZoneColor('the Trollshaws')).toBe('#8246ad');
        expect(getZoneColor('the Road to Tharbad')).toBe('#75b2e8');
        expect(getZoneColor('the Old Forest')).toBe('#75b2e8');
        expect(getZoneColor('the Central Anduin Vale')).toBe('#968894');
        expect(getZoneAmbientGlow('Valinor')).toBe('rgba(10, 48, 27, 0.18)');
        expect(getZoneAmbientGlow('(The Shire)', 0.32)).toBe('rgba(10, 48, 27, 0.32)');
        const stronglyGoodZoneFrame = hexToHsl(getZoneFrameColor('Valinor'));
        expect(stronglyGoodZoneFrame.h).toBeGreaterThanOrEqual(130);
        expect(stronglyGoodZoneFrame.h).toBeLessThanOrEqual(150);
        expect(stronglyGoodZoneFrame.l).toBe(28);
        expect(getZoneAmbientGlow('Fangorn')).toBe('rgba(10, 35, 64, 0.18)');
        expect(getZoneAmbientGlow('the Lorien Surroundings', 0.32)).toBe('rgba(10, 35, 64, 0.32)');
        const goodZoneFrame = hexToHsl(getZoneFrameColor('Fangorn'));
        expect(goodZoneFrame.h).toBeGreaterThanOrEqual(200);
        expect(goodZoneFrame.h).toBeLessThanOrEqual(225);
        expect(goodZoneFrame.l).toBe(28);
        expect(getZoneAmbientGlow('Dunland')).toBe('rgba(58, 33, 15, 0.18)');
        const neutralZoneFrame = hexToHsl(getZoneFrameColor('Dunland'));
        expect(neutralZoneFrame.h).toBeGreaterThanOrEqual(20);
        expect(neutralZoneFrame.h).toBeLessThanOrEqual(35);
        expect(neutralZoneFrame.s).toBeGreaterThanOrEqual(50);
        expect(neutralZoneFrame.l).toBe(30);
        expect(getZoneAmbientGlow('the Trollshaws')).toBe('rgba(41, 16, 57, 0.18)');
        const semiEvilZoneFrame = hexToHsl(getZoneFrameColor('Trollshaws'));
        expect(semiEvilZoneFrame.h).toBeGreaterThanOrEqual(260);
        expect(semiEvilZoneFrame.h).toBeLessThanOrEqual(300);
        expect(semiEvilZoneFrame.l).toBe(25);
        expect(getZoneAmbientGlow('Moria')).toBe('rgba(79, 13, 18, 0.18)');
        expect(getZoneAmbientGlow('Moria', 0.32)).toBe('rgba(79, 13, 18, 0.32)');
        const evilZoneFrame = hexToHsl(getZoneFrameColor('Moria'));
        expect(evilZoneFrame.h >= 345 || evilZoneFrame.h <= 10).toBe(true);
        expect(evilZoneFrame.l).toBe(25);
    });

    it('generates a consistent deterministic color for unlisted zones', () => {
        const customColor1 = getZoneColor('Haradwaith');
        const customColor2 = getZoneColor('Haradwaith');
        expect(customColor1).toBe(customColor2);
        expect(customColor1).toMatch(/^#[0-9a-f]{6}$/i);
        expect(customColor1).not.toBe(DEFAULT_ZONE_COLOR);

        const otherColor = getZoneColor('Rhun');
        expect(otherColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('hashStringToColor returns valid hex color', () => {
        const hex = hashStringToColor('Test Zone');
        expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('converts hex to hsl components accurately', () => {
        const redHsl = hexToHsl('#ff0000');
        expect(redHsl).toEqual({ h: 0, s: 100, l: 50 });

        const whiteHsl = hexToHsl('#ffffff');
        expect(whiteHsl.l).toBe(100);

        const blackHsl = hexToHsl('#000000');
        expect(blackHsl.l).toBe(0);
    });

    it('getZoneTextColor returns high-contrast text color preserving zone hue', () => {
        // Fallbacks
        expect(getZoneTextColor(null)).toBe('#c9a84c');
        expect(getZoneTextColor('', true)).toBe('#8b6b10');

        // Dark mode: lightness boosted to ~68%, preserving the current green hue.
        const shireText = getZoneTextColor('Shire');
        const shireHsl = hexToHsl(shireText);
        expect(shireHsl.l).toBeGreaterThanOrEqual(68);
        expect(shireHsl.h).toBeGreaterThanOrEqual(145);
        expect(shireHsl.h).toBeLessThanOrEqual(165);

        const rivendellText = getZoneTextColor('Rivendell');
        const rivendellHsl = hexToHsl(rivendellText);
        expect(rivendellHsl.l).toBeGreaterThanOrEqual(68);
        expect(rivendellHsl.h).toBeGreaterThanOrEqual(145);
        expect(rivendellHsl.h).toBeLessThanOrEqual(165);

        // Light mode: lightness clamped to <= 32%
        const breeTextLight = getZoneTextColor('Bree', true);
        const breeLightHsl = hexToHsl(breeTextLight);
        expect(breeLightHsl.l).toBeLessThanOrEqual(32);
    });
});

