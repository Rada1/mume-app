/**
 * @file themeLinkedColors.test.ts
 * @description Coverage for linked light/dark category color transforms.
 */

import { describe, expect, it } from 'vitest';
import { fromThemeLinkedColorInput, toColorInputHex, toThemeLinkedColor } from '../themeLinkedColors';

// --- Logic Section ---

describe('theme linked colors', () => {
    it('keeps dark mode colors unchanged', () => {
        expect(toThemeLinkedColor('#facc15', 'dark')).toBe('#facc15');
    });

    it('darkens light mode colors by the shared distance', () => {
        expect(toThemeLinkedColor('#facc15', 'light')).toBe('#9b7d03');
    });

    it('brightens light mode edits before storing them as dark mode colors', () => {
        expect(fromThemeLinkedColorInput('#9b7d03', 'light')).toBe('#facd14');
    });

    it('preserves alpha when shifting rgba colors', () => {
        expect(toThemeLinkedColor('rgba(251, 146, 60, 0.95)', 'light')).toBe('rgba(195, 90, 4, 0.95)');
    });

    it('converts shifted colors to picker-safe hex values', () => {
        expect(toColorInputHex(toThemeLinkedColor('rgba(251, 146, 60, 0.95)', 'light'))).toBe('#c35a04');
    });
});
