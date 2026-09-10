import { describe, it, expect } from 'vitest';
import { getZoneColor, DEFAULT_ZONE_COLOR, hashStringToColor, getZoneTextColor, hexToHsl } from './zoneColors';

describe('zoneColors', () => {
    it('returns default color for null, undefined, or empty string', () => {
        expect(getZoneColor(null)).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor(undefined)).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('')).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('   ')).toBe(DEFAULT_ZONE_COLOR);
        expect(getZoneColor('()')).toBe(DEFAULT_ZONE_COLOR);
    });

    it('resolves curated mature zone colors for known zones', () => {
        expect(getZoneColor('Valinor')).toBe('#d97706');
        expect(getZoneColor('(Valinor)')).toBe('#d97706');
        expect(getZoneColor('The Shire')).toBe('#16a34a');
        expect(getZoneColor('the shire')).toBe('#16a34a');
        expect(getZoneColor('Shire')).toBe('#16a34a');
        expect(getZoneColor('(the Shire)')).toBe('#16a34a');
        expect(getZoneColor('Rivendell')).toBe('#0284c7');
        expect(getZoneColor('Bree')).toBe('#d97706');
        expect(getZoneColor('Moria')).toBe('#c2410c');
        expect(getZoneColor('Dol Guldur')).toBe('#7e22ce');
        expect(getZoneColor('the Troll Warrens')).toBe('#dc2626');
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

        // Dark mode: lightness boosted to ~68%
        const shireText = getZoneTextColor('Shire');
        const shireHsl = hexToHsl(shireText);
        expect(shireHsl.l).toBeGreaterThanOrEqual(68);
        expect(shireHsl.h).toBeGreaterThanOrEqual(135);
        expect(shireHsl.h).toBeLessThanOrEqual(150);

        const rivendellText = getZoneTextColor('Rivendell');
        const rivendellHsl = hexToHsl(rivendellText);
        expect(rivendellHsl.l).toBeGreaterThanOrEqual(68);
        expect(rivendellHsl.h).toBeGreaterThanOrEqual(195);
        expect(rivendellHsl.h).toBeLessThanOrEqual(210);

        // Light mode: lightness clamped to <= 32%
        const breeTextLight = getZoneTextColor('Bree', true);
        const breeLightHsl = hexToHsl(breeTextLight);
        expect(breeLightHsl.l).toBeLessThanOrEqual(32);
    });
});

