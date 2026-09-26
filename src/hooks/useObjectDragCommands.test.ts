// @vitest-environment jsdom
/** @file useObjectDragCommands.test.ts — MUME commands from gear drag destinations. */
import { describe, expect, it } from 'vitest';
import type { ObjectDragSource, ObjectDropTarget } from '../types';
import { getObjectDragCommand, getObjectDropTarget, isValidObjectDragTarget } from './useObjectDragCommands';

// --- Logic Section ---
describe('gear drag commands', () => {
    const inventory: ObjectDragSource = { row: 'inventory', noun: 'cloak', label: 'sacred cloak', itemId: 'cloak-1' };
    const worn: ObjectDragSource = { row: 'worn', noun: 'cloak', label: 'sacred cloak' };
    const contained: ObjectDragSource = { row: 'inventory', noun: 'gem', label: 'red gem', parentContainerNoun: 'pouch' };
    const inventoryTarget: ObjectDropTarget = { type: 'row', row: 'inventory' };
    const wornTarget: ObjectDropTarget = { type: 'row', row: 'worn' };
    const pouch: ObjectDropTarget = { type: 'container', containerId: 'pouch-1', noun: 'pouch', label: 'sable pouch' };

    it('wears and removes between the two sections', () => {
        expect(getObjectDragCommand(inventory, wornTarget)).toBe('wear cloak');
        expect(getObjectDragCommand(worn, inventoryTarget)).toBe('remove cloak');
    });

    it('puts inventory items into containers and gets contained items out', () => {
        expect(isValidObjectDragTarget(inventory, pouch)).toBe(true);
        expect(getObjectDragCommand(inventory, pouch)).toBe('put cloak pouch');
        expect(isValidObjectDragTarget(contained, inventoryTarget)).toBe(true);
        expect(getObjectDragCommand(contained, inventoryTarget)).toBe('get gem pouch');
    });

    it('rejects transfers that need multiple commands or put an item into itself', () => {
        expect(isValidObjectDragTarget(worn, pouch)).toBe(false);
        expect(isValidObjectDragTarget(contained, wornTarget)).toBe(false);
        expect(isValidObjectDragTarget(inventory, { ...pouch, containerId: 'cloak-1' })).toBe(false);
    });

    it('recognizes a container under a dragged item before its section', () => {
        const section = document.createElement('div');
        section.dataset.objectDropRow = 'inventory';
        const container = document.createElement('div');
        container.dataset.objectDropContainer = 'pouch-1';
        container.dataset.objectDropNoun = 'pouch';
        container.dataset.objectDropLabel = 'sable pouch';
        const item = document.createElement('button');
        section.append(container);
        container.append(item);
        expect(getObjectDropTarget(item)).toMatchObject(pouch);
        expect(getObjectDropTarget(section)).toEqual(inventoryTarget);
    });
});
