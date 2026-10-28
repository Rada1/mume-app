/** @file enchantTargetEligibility.test.ts — Enchant only acts on carried or worn weapons. */
import { describe, expect, it } from 'vitest';
import { isButtonValidForEntity } from './actionUtils';
import { createButton } from './buttonFactory';

// --- Shared inline eligibility ---
describe('Enchant target eligibility', () => {
    const button = createButton({id: 'spell-enchant', label: 'Enchant', command: "cast 'enchant' %n", setId: 'trait-mage'});
    const prepared = new Set([button.id]);
    it.each([
        ['cat-inventory-object', 'a steel sword', true],
        ['cat-worn-object', 'a long sword', true],
        ['cat-room-object', 'a steel sword', false],
        ['cat-inventory-object', 'a pair of shoes', false],
        ['cat-worn-object', 'a pair of boots', false],
        ['cat-npc', 'a town guard', false]
    ])('%s %s eligibility is %s', (category, name, allowed) => {
        expect(isButtonValidForEntity(button, 'target', category,
            {buttons: [button], entities: {}}, category, name, prepared)).toBe(allowed);
    });
});
