/** @file commandActionTargetModel.test.ts — Command targets retain gear ordering and batch selectors. */
import { describe, expect, it } from 'vitest';
import type { DrawerLine, GearSelection, GearSelectionItem } from '../types';
import { getCommandActionTargetEntries } from './commandActionTargetModel';
import { getGearSelectionCommands, toObjectDragItem } from '../utils/gearSelectionUtils';
import { getObjectDragCommands } from '../utils/objectDragUtils';
import { createButton } from '../utils/buttonFactory';
import { resolveButtonClickCommand } from '../hooks/interactions/resolveButtonClickCommand';

// --- Gear Compatibility Checks ---
const line = (id: string, text: string, context: string, prefix?: string): DrawerLine => ({
    id, text, context, prefix, html: '', isItem: true
});

describe('command selection gear compatibility', () => {
    it('keeps each duplicate arrow distinct through target selection and command execution', () => {
        const arrows: DrawerLine[] = Array.from({length:5}, (_, index) => ({
            id:`arrow-${index}`, text:'an ash arrow', html:'an ash arrow', isItem:true
        }));
        const entries = getCommandActionTargetEntries([], [], [], [], arrows);
        expect(entries.map(entry => entry.context)).toEqual(['1.arrow', '2.arrow', '3.arrow', '4.arrow', '5.arrow']);
        const button = createButton({id:'enchant', label:'Enchant', command:"cast 'enchant' %n", setId:'trait-mage'});
        const commands = entries.map(entry => resolveButtonClickCommand({
            button, context:entry.context, popoverCategory:entry.category, target:null, keywordOverrides:{},
            isTrackpadModifierActive:false, joystickTargetModifierActive:false
        }).finalCmd);
        expect(commands).toEqual([1,2,3,4,5].map(index => `cast 'enchant' ${index}.arrow`));
    });
    it('numbers gear before filtering and shares ordinal scope across inventory and worn items', () => {
        const inventory = [line('first', 'an ash arrow', 'arrow'), line('second', 'a war arrow', 'arrow')];
        const worn = [line('third', 'an ash arrow', 'arrow', '<held>')];
        const entries = getCommandActionTargetEntries([], [], [], worn, inventory);
        expect(entries.map(entry => [entry.id, entry.context])).toEqual([
            ['third', '3.arrow'], ['first', '1.arrow'], ['second', '2.arrow']
        ]);
    });
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
