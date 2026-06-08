/**
 * @file stripAnsi.test.ts
 * @description Verifies ANSI/VT100 escape codes are removed from strings such as
 * MUME room names so raw color codes never surface in the UI.
 */

import { describe, expect, it } from 'vitest';
import { stripAnsi } from '../mapperUtils';

describe('stripAnsi', () => {
    it('removes a colored room name wrapper', () => {
        expect(stripAnsi('\x1b[32mRolling Grasslands\x1b[0m')).toBe('Rolling Grasslands');
    });

    it('removes multiple/compound SGR sequences', () => {
        expect(stripAnsi('\x1b[1;33mBright\x1b[0m \x1b[36mCyan\x1b[0m')).toBe('Bright Cyan');
    });

    it('leaves plain strings untouched', () => {
        expect(stripAnsi('Weed-filled Courtyard')).toBe('Weed-filled Courtyard');
    });

    it('handles null/undefined/empty', () => {
        expect(stripAnsi(null)).toBe('');
        expect(stripAnsi(undefined)).toBe('');
        expect(stripAnsi('')).toBe('');
    });
});
