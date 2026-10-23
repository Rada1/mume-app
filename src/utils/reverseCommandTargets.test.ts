/** @file reverseCommandTargets.test.ts — Command targets follow configured trait actions rather than verb lists. */
import { describe, expect, it } from 'vitest';
import { getCommandActionTargetEntries } from '../objects/commandActionTargetModel';
import { createLearnedInlineAbilityButtons } from './inlineAbilityActions';
import { resolveReverseCommandTargets } from './reverseCommandTargets';
import { getResolvedTraitSections } from './inlineActionModel';

// --- Reverse Action Regression Checks ---
describe('reverse target actions', () => {
    const entries = getCommandActionTargetEntries([], [{ id: 1, name: 'a town guard', type: 'npc' }],
        [{ id: 2, name: 'a stone', type: 'object' }], [], [], [], {
            n: { name: 'gate', flags: ['closed'] }, s: 42
        });
    const buttons = createLearnedInlineAbilityButtons({ bash: 80 }, null);
    const deps = { buttons, entities: {} };
    it('finds both an NPC and a door that offer Bash while excluding a loose object and open passage', () => {
        const result = resolveReverseCommandTargets('bash', entries, deps);
        expect(result?.suggestions.map(entry => entry.value)).toEqual(['guard', 'exit n']);
        expect(result?.isActionDerived).toBe(true);
        expect(resolveReverseCommandTargets('bash ga', entries, deps)?.fragment).toBe('ga');
    });
    it('uses the same trait-button associations as the target panel', () => {
        const result = resolveReverseCommandTargets('bash', entries, deps);
        for (const suggestion of result?.suggestions || []) {
            const target = entries.find(entry => entry.id === suggestion.key)!;
            const ids = getResolvedTraitSections(target.category, target.label).flatMap(section => section.buttonIds);
            expect(buttons.some(button => ids.includes(button.id) && button.command === 'bash %n')).toBe(true);
        }
    });
    it('does not infer an action from the command name alone', () => {
        expect(resolveReverseCommandTargets('bash', entries, { buttons: [], entities: {} })).toBeNull();
        expect(resolveReverseCommandTargets('give sword', entries, deps)).toBeNull();
        expect(resolveReverseCommandTargets('cast teleport', entries, deps)).toBeNull();
    });
    it('follows category trait changes without a separate command target list', () => {
        const result = resolveReverseCommandTargets('bash', entries, { ...deps, inlineCategories: [
            { id: 'cat-npc', kind: 'npc', keywords: [], defaultTraitIds: ['trait-examine'] },
            { id: 'cat-room-object', kind: 'object', keywords: [], defaultTraitIds: ['trait-offense'] }
        ] });
        expect(result?.suggestions.map(entry => entry.value)).toEqual(['stone', 'exit n']);
    });
});
