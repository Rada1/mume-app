/** @file emptyGearTargets.test.ts — Empty listing responses never become selectable gear, even in old snapshots. */
import {expect, it} from 'vitest';
import type {DrawerLine} from '../types';
import {getGearTargetSuggestions, getInventoryAndWornTargetSuggestions} from './gearTargetSuggestions';
import {getCommandActionTargetEntries} from './commandActionTargetModel';
import {toGearRow} from '../utils/gearPanelUtils';

// --- Empty Snapshot Compatibility Section ---
it.each(['Nothing.', 'nothing', '  NOTHING.  ', '<item>Nothing.</item>', '\x1b[32mNothing.\x1b[0m'])
('excludes the empty response %j from every gear target projection', text => {
    const line: DrawerLine = {id: 'empty', text, html: text, context: 'nothing', isItem: true};
    expect(getGearTargetSuggestions([line], 'inventory')).toEqual([]);
    expect(getGearTargetSuggestions([line], 'worn')).toEqual([]);
    expect(getInventoryAndWornTargetSuggestions([line], [line])).toEqual([]);
    expect(getCommandActionTargetEntries([], [], [], [line], [line])).toEqual([]);
    expect(toGearRow(line)).toBeNull();
});

it('keeps actual items whose names contain nothing', () => {
    const line: DrawerLine = {id: 'ring', text: 'a ring of nothing', html: '', context: 'ring', isItem: true};
    expect(getGearTargetSuggestions([line], 'inventory')).toMatchObject([{value: 'ring'}]);
    expect(toGearRow(line)?.name).toBe('ring of nothing');
});
