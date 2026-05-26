/**
 * @file useObjectDragCommands.test.ts
 * @description Command mapping tests for object drag/drop gestures.
 */

import { describe, expect, it } from 'vitest';
import { getObjectDragCommand } from '../useObjectDragCommands';
import { ObjectDragSource, ObjectDropTarget } from '../../types';

const source = (row: ObjectDragSource['row'], noun = '2.sword'): ObjectDragSource => ({
    row,
    noun,
    label: noun
});

const rowTarget = (row: ObjectDragSource['row']): ObjectDropTarget => ({ type: 'row', row });
const slotTarget = (row: ObjectDragSource['row'], slot: string): ObjectDropTarget => ({ type: 'row', row, slot });

describe('getObjectDragCommand', () => {
    it('maps inventory object drops to worn, room, and character targets', () => {
        expect(getObjectDragCommand(source('inventory'), rowTarget('worn'))).toBe('wear 2.sword');
        expect(getObjectDragCommand(source('inventory'), slotTarget('worn', 'wielded'))).toBe('wield 2.sword');
        expect(getObjectDragCommand(source('inventory'), rowTarget('room'))).toBe('drop 2.sword');
        expect(getObjectDragCommand(source('inventory'), {
            type: 'entity',
            entityId: 'roomchars:2',
            noun: '2.orc',
            label: '2.orc'
        })).toBe('give 2.sword 2.orc');
    });

    it('maps supported non-inventory object drops back to inventory', () => {
        expect(getObjectDragCommand(source('worn', 'shield'), rowTarget('inventory'))).toBe('remove shield');
        expect(getObjectDragCommand(source('room', 'lantern'), rowTarget('inventory'))).toBe('get lantern');
    });

    it('returns null for intentionally unsupported row moves', () => {
        expect(getObjectDragCommand(source('worn', 'shield'), rowTarget('room'))).toBeNull();
        expect(getObjectDragCommand(source('room', 'lantern'), rowTarget('worn'))).toBeNull();
    });
});
