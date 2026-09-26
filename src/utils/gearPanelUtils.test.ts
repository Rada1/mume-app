/** @file gearPanelUtils.test.ts — Equipment line and duplicate container behavior. */
import { describe, expect, it } from 'vitest';
import type { DrawerLine } from '../types';
import { getContainerCommand, toGearRow, visibleContainerLine } from './gearPanelUtils';

// --- Logic Section ---
describe('gear panel rows', () => {
    it('keeps the worn slot, item name, and condition separate', () => {
        const line: DrawerLine = { id: 'belt', text: 'a sable pouch (worn)', html: '', isItem: true, prefix: '<worn on belt>', context: 'pouch' };
        expect(toGearRow(line)).toMatchObject({ slot: '<worn on belt>', article: 'a', name: 'sable pouch', condition: '(worn)', noun: 'pouch', isContainer: true });
    });

    it('addresses the correct copy of a repeated container', () => {
        const first: DrawerLine = { id: 'one', text: 'a leather pouch', html: '', isItem: true };
        const second: DrawerLine = { id: 'two', text: 'a leather pouch', html: '', isItem: true };
        expect(getContainerCommand(second, [first, second])).toBe('look in 2.pouch');
    });

    it('does not render container headings as items', () => {
        expect(visibleContainerLine({ id: 'heading', text: 'In your pouch:', html: '', isHeader: true })).toBe(false);
    });
});
