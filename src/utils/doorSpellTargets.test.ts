/** @file doorSpellTargets.test.ts — Door spells offer only real doors in the current room. */
import { describe, expect, it } from 'vitest';
import { resolveCommandTargetSuggestions } from './commandTargetSuggestionResolver';
import { getCommandActionTargetDisplayLabel } from './commandTreeTargetSections';
import { getRoomExitActionTargets } from '../objects/doorActionTargets';
import { isButtonValidForEntity } from './actionUtils';
import { createButton } from './buttonFactory';

// --- Door presence and target filtering ---
describe.each(['block door', 'break door'])('%s', spell => {
    const command = `cast '${spell}'`;
    it('offers directions with doors and excludes open passages, NPCs and containers', () => {
        const result = resolveCommandTargetSuggestions({ command, argumentText: ` '${spell}' `, menuKind: null,
            rawExits: {n: {name: 'gate'}, s: 42, e: {hasDoor: true}},
            roomOccupants: [{id: 1, name: 'a guard'}], roomObjects: [{id: 2, name: 'a chest'}],
            inventoryLines: [], wornLines: [] });
        expect(result.suggestions.map(entry => entry.value)).toEqual(['n', 'e']);
        expect(result.fragment).toBe('');
        expect(resolveCommandTargetSuggestions({ command, argumentText: '', menuKind: null,
            rawExits: {s: 42}, roomOccupants: [], roomObjects: [], inventoryLines: [], wornLines: [] }).suggestions).toEqual([]);
    });
    it('formats exit target labels with the direction and door name', () => {
        const exits = getRoomExitActionTargets({n: {name: 'gate'}, s: 42, e: {hasDoor: true}});
        expect(exits.map(getCommandActionTargetDisplayLabel)).toEqual(['North (gate)', 'South', 'East (door)']);
    });
    it('rejects non-exit inline targets even when traits include the spell', () => {
        const button = createButton({id: spell, command: `${command} %n|exit`, label: spell, setId: 'trait-door-actions'});
        for (const category of ['cat-room-object', 'cat-inventory-object', 'cat-npc']) {
            expect(isButtonValidForEntity(button, 'target', category, {buttons: [button], entities: {}},
                category, 'a chest', new Set([button.id]))).toBe(false);
        }
    });
});

describe('pick', () => {
    it('offers only room doors and room chests', () => {
        const result = resolveCommandTargetSuggestions({ command: 'pick', argumentText: '', menuKind: null,
            rawExits: {n: {name: 'gate'}, s: 42, e: {hasDoor: true}},
            roomOccupants: [{id: 1, name: 'a guard'}],
            roomObjects: [{id: 2, name: 'a wooden chest'}, {id: 3, name: 'a leather bag'}],
            inventoryLines: [{id: 'i1', text: 'a small chest', html: 'a small chest', isItem: true, context: 'chest'}],
            wornLines: [] });
        expect(result.suggestions.map(entry => entry.value)).toEqual(['n', 'e', 'chest']);
    });
});


