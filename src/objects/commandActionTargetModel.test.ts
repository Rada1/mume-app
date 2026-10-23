/** @file commandActionTargetModel.test.ts — Command targets retain gear ordering and batch selectors. */
import { describe, expect, it } from 'vitest';
import type { DrawerLine, GearSelection, GearSelectionItem } from '../types';
import { getCommandActionTargetEntries } from './commandActionTargetModel';
import { getGearSelectionCommands, toObjectDragItem } from '../utils/gearSelectionUtils';
import { getObjectDragCommands } from '../utils/objectDragUtils';

// --- Gear Compatibility Checks ---
const line = (id: string, text: string, context: string, prefix?: string): DrawerLine => ({
    id, text, context, prefix, html: '', isItem: true
});

describe('command selection gear compatibility', () => {
    it('uses game equipment order and preserves slot, article, condition, and identity', () => {
        const worn = [
            line('belt', 'a sable pouch (worn)', 'pouch', '<worn on belt>'),
            line('head', 'an iron helm', 'helm', '<worn on head>'),
            line('weapon', 'a steel sword', 'sword', '<wielded>')
        ];
        const entries = getCommandActionTargetEntries([], [], [], worn, []);
        expect(entries.map(entry => entry.id)).toEqual(['weapon', 'head', 'belt']);
        expect(entries[2]?.gearRow).toMatchObject({
            slotLabel: 'On belt', article: 'a', name: 'sable pouch', condition: '(worn)', noun: 'pouch', isContainer: true
        });
        expect(worn.map(item => item.id)).toEqual(['belt', 'head', 'weapon']);
    });
    it('retains duplicate selectors for a subset batch give', () => {
        const entries = getCommandActionTargetEntries([], [], [], [], [
            line('first', 'a woollen cloak', '1.cloak'),
            line('second', 'a woollen cloak', '2.cloak'),
            line('third', 'a steel sword', 'sword')
        ]);
        const items: GearSelectionItem[] = entries.flatMap(entry => entry.gearRow
            ? [{ id: entry.id, row: entry.gearRow, section: 'carried' as const }] : []);
        const selection: GearSelection = {
            scopeKey: 'carried:root', section: 'carried', items: items.slice(0, 2),
            sourceLevelItemIds: items.map(item => item.row.line.id)
        };
        expect(getGearSelectionCommands(selection, 'give', 'ellessar')).toEqual(['give 1.cloak ellessar', 'give 2.cloak ellessar']);
        expect(getObjectDragCommands({
            ...toObjectDragItem(items[0]!), selectedItems: selection.items.map(toObjectDragItem),
            sourceLevelItemIds: selection.sourceLevelItemIds
        }, { type: 'entity', entityId: 'ally', noun: 'ellessar', label: 'Ellessar' }))
            .toEqual(['give 1.cloak ellessar', 'give 2.cloak ellessar']);
    });
    it('uses the existing all-items command for a complete worn selection', () => {
        const entries = getCommandActionTargetEntries([], [], [], [line('cloak', 'a cloak', 'cloak', '<worn about body>')], []);
        const row = entries[0]!.gearRow!;
        expect(getGearSelectionCommands({
            scopeKey: 'worn:root', section: 'worn', items: [{ id: entries[0]!.id, row, section: 'worn' }], sourceLevelItemIds: [row.line.id]
        }, 'remove')).toEqual(['remove all']);
    });
});
