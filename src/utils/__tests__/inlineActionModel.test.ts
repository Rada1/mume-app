/**
 * @file inlineActionModel.test.ts
 * @description Color resolution coverage for inline action categories.
 */

import { describe, expect, it } from 'vitest';
import { getInlineGlowColor, getResolvedTraitSections, getTraitsForCategory, getTraitsForName } from '../inlineActionModel';
import { CategoryOverride } from '../../types';

// --- Logic Section ---

describe('getInlineGlowColor', () => {
    it('uses the room player color for in-room ally category', () => {
        expect(getInlineGlowColor('cat-ally', [], { player: '#4173e6' })).toBe('#4173e6');
    });

    it('keeps the remote ally category color separate from room player color', () => {
        expect(getInlineGlowColor('cat-ally-remote', [], { player: '#4173e6' })).toBe('#55a5e2');
    });

    it('lets category overrides beat the room player color', () => {
        const overrides: CategoryOverride[] = [{ id: 'cat-ally', kind: 'player', color: '#123456' }];

        expect(getInlineGlowColor('cat-ally', overrides, { player: '#4173e6' })).toBe('#123456');
    });

    it('does not resolve target as an inline action category', () => {
        expect(getInlineGlowColor('cat-target', [], {}, 'dark')).toBeNull();
        expect(getInlineGlowColor('target', [], {}, 'light')).toBeNull();
    });
});

describe('getTraitsForCategory', () => {
    it('correctly maps cat-container-item to trait-get-container-item', () => {
        const traits = getTraitsForCategory('cat-container-item');
        expect(traits).toEqual(expect.arrayContaining([
            expect.objectContaining({
            id: 'trait-get-container-item',
            label: 'Get Container Item',
            buttonIds: ['btn-container-get-item']
            })
        ]));
    });
});

describe('getTraitsForName', () => {
    it('auto-applies innkeeper trait for known MUME innkeeper NPC keywords', () => {
        const names = [
            'receptionist',
            'a tavern keeper',
            'Barliman',
            'a steward',
            'Vit the innkeeper',
            'Vubur the innkeeper'
        ];

        names.forEach(name => {
            expect(getTraitsForName(name).map(trait => trait.id)).toContain('trait-innkeeper');
        });
    });
});

describe('getResolvedTraitSections', () => {
    it('keeps default corpse keyword scoped to object categories', () => {
        const allyTraits = getResolvedTraitSections('cat-ally', 'a corpse');
        const objectTraits = getResolvedTraitSections('cat-room-object', 'a corpse');

        expect(allyTraits.map(section => section.trait.id)).not.toContain('trait-corpse');
        expect(objectTraits.map(section => section.trait.id)).toContain('trait-corpse');
    });

    it('honors explicit user-added trait keywords across categories', () => {
        const traits = getResolvedTraitSections('cat-ally', 'ciltor', [
            { id: 'trait-corpse', kind: 'object', keywords: ['ciltor'] }
        ]);

        expect(traits.map(section => section.trait.id)).toContain('trait-corpse');
    });
});
