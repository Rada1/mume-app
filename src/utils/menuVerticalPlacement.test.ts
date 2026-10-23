/** @file menuVerticalPlacement.test.ts — Verify submenu direction and available height. */
import { describe, expect, it } from 'vitest';
import { menuVerticalPlacement } from './menuVerticalPlacement';
// --- Geometry Checks ---
describe('adaptive menu placement', () => {
    it('opens upward near the command strip', () => {
        expect(menuVerticalPlacement(740, 780, 800)).toEqual({ top: undefined, bottom: 60, maxHeight: 732 });
    });
    it('opens a nested menu downward near the top', () => {
        expect(menuVerticalPlacement(170, 203, 800, true)).toEqual({ top: 170, bottom: undefined, maxHeight: 622 });
    });
    it('opens a nested menu upward from the parent row near the bottom', () => {
        expect(menuVerticalPlacement(650, 683, 800, true)).toEqual({ top: undefined, bottom: 117, maxHeight: 675 });
    });
    it('opens a chip menu below its trigger when more room is below', () => {
        expect(menuVerticalPlacement(80, 110, 800)).toEqual({ top: 110, bottom: undefined, maxHeight: 682 });
    });
});
