// @vitest-environment jsdom
/** @file objectDragUtils.test.ts — Equipment and recipient drops dispatch valid game commands. */
import { describe, expect, it } from 'vitest';
import { getObjectDragCommands, getValidObjectDropTarget } from './objectDragUtils';
import type { ObjectDragSource } from '../types';

// --- Command Routing ---
const sword: ObjectDragSource = { row: 'inventory', noun: '2.sword', label: 'a steel sword', itemId: 'sword-2' };
const cloak: ObjectDragSource = { row: 'inventory', noun: 'cloak', label: 'a woollen cloak', itemId: 'cloak' };

describe('shared gear and command selection drops', () => {
    it('wields a weapon dropped on the general worn category', () => {
        expect(getObjectDragCommands(sword, { type: 'row', row: 'worn' })).toEqual(['wield 2.sword']);
    });
    it('wears clothing dropped on the worn category', () => {
        expect(getObjectDragCommands(cloak, { type: 'row', row: 'worn' })).toEqual(['wear cloak']);
    });
    it('gives inventory items to a character using its command keyword', () => {
        expect(getObjectDragCommands(cloak, { type: 'entity', entityId: 'ally', noun: 'ellessar', label: 'Ellessar' }))
            .toEqual(['give cloak ellessar']);
    });
    it('rejects giving worn items before removing them', () => {
        expect(getObjectDragCommands({ ...cloak, row: 'worn' }, { type: 'entity', entityId: 'ally', noun: 'ellessar', label: 'Ellessar' }))
            .toBeNull();
    });
    it('removes worn items and picks up room objects into inventory', () => {
        expect(getObjectDragCommands({ ...cloak, row: 'worn' }, { type: 'row', row: 'inventory' })).toEqual(['remove cloak']);
        expect(getObjectDragCommands({ ...sword, row: 'room' }, { type: 'row', row: 'inventory' })).toEqual(['get 2.sword']);
    });
    it('puts inventory items into containers and prevents self containment', () => {
        expect(getObjectDragCommands(cloak, { type: 'container', containerId: 'bag', noun: 'bag', label: 'bag' })).toEqual(['put cloak bag']);
        expect(getObjectDragCommands(cloak, { type: 'container', containerId: 'cloak', noun: 'cloak', label: 'cloak' })).toBeNull();
    });
    it('resolves a character row ahead of its enclosing Room category', () => {
        const section = document.createElement('details');
        section.dataset.objectDropRow = 'room';
        const ally = document.createElement('button');
        ally.dataset.objectDropEntity = 'ally';
        ally.dataset.objectDropNoun = 'ellessar';
        section.append(ally);
        expect(getValidObjectDropTarget(cloak, ally)).toMatchObject({ type: 'entity', noun: 'ellessar' });
    });
});
