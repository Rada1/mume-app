/** @file inlineActionModel.test.ts — Removed container actions stay out of default and saved traits. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_TRAIT_CONFIGS, getTraitsForName, inlineConfigToTrait, toggleTraitKeywords } from './inlineActionModel';

// --- Logic Section ---
describe('container trait actions', () => {
    it('does not include the removed G/All action in the default trait', () => {
        const container = DEFAULT_TRAIT_CONFIGS.find(trait => trait.id === 'trait-container');
        expect(container?.buttonIds).not.toContain('btn-container-get-all');
    });

    it('drops G/All from saved overrides while preserving the other assigned actions', () => {
        const container = inlineConfigToTrait({
            id: 'trait-container',
            kind: 'object',
            keywords: ['backpack'],
            buttonIds: ['btn-container-get-all', 'btn-get']
        });

        expect(container.buttonIds).toEqual(['btn-get']);
    });

    it('lets an explicit trait override turn off the built-in backpack keyword', () => {
        expect(getTraitsForName('leather backpack').map(trait => trait.id)).toContain('trait-container');
        expect(getTraitsForName('leather backpack', [{
            id: 'trait-container',
            kind: 'object',
            keywords: [],
            buttonIds: ['btn-get']
        }]).map(trait => trait.id)).not.toContain('trait-container');
    });

    it('uses saved trait keywords instead of re-adding built-in keyword matches', () => {
        // Warm default-name caching before applying the saved configuration.
        expect(getTraitsForName('leather backpack').some(trait => trait.id === 'trait-container')).toBe(true);
        expect(getTraitsForName('leather backpack', [{
            id: 'trait-container',
            kind: 'object',
            keywords: ['satchel'],
            buttonIds: ['btn-get']
        }]).map(trait => trait.id)).not.toContain('trait-container');
        expect(getTraitsForName('satchel', [{
            id: 'trait-container',
            kind: 'object',
            keywords: ['satchel'],
            buttonIds: ['btn-get']
        }]).map(trait => trait.id)).toContain('trait-container');
    });

    it('toggles a built-in keyword off and back on for a target name', () => {
        const container = DEFAULT_TRAIT_CONFIGS.find(trait => trait.id === 'trait-container')!;
        const offKeywords = toggleTraitKeywords(container.keywords, 'leather backpack', true);
        expect(getTraitsForName('leather backpack', [{
            id: 'trait-container', kind: 'object', keywords: offKeywords, buttonIds: container.buttonIds
        }]).map(trait => trait.id)).not.toContain('trait-container');

        const onKeywords = toggleTraitKeywords(offKeywords, 'leather backpack', false);
        expect(getTraitsForName('leather backpack', [{
            id: 'trait-container', kind: 'object', keywords: onKeywords, buttonIds: container.buttonIds
        }]).map(trait => trait.id)).toContain('trait-container');
    });
});
