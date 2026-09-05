import { describe, it, expect } from 'vitest';
import { formatCombatLineTokens } from './combatLineTokens';
import { Token } from '../../types';

describe('formatCombatLineTokens', () => {
    it('correctly formats the user prompt example with bold verb, regular anatomy/damage/you, and dimmed syntactic glue', () => {
        const input: Token[] = [
            { type: 'text', content: 'You pierce ' },
            { type: 'entity', content: 'a Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s left leg and tickle it." }
        ];

        const result = formatCombatLineTokens(input);

        // Expect:
        // 1. You (regular)
        // 2. ' ' (dimmed)
        // 3. pierce (bold verb)
        // 4. ' a ' (dimmed)
        // 5. Morgundul orc-guard (entity, regular)
        // 6. "'s left " (dimmed)
        // 7. leg (regular anatomy)
        // 8. " and " (dimmed)
        // 9. tickle (regular outcome/damage)
        // 10. " it." (dimmed)
        expect(result).toEqual([
            {
                type: 'text',
                content: 'You',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: ' ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'pierce',
                classes: ['combat-verb']
            },
            {
                type: 'text',
                content: ' a ',
                classes: ['combat-dimmed']
            },
            {
                type: 'entity',
                content: 'Morgundul orc-guard',
                entityId: 'mob-1'
            },
            {
                type: 'text',
                content: "'s left ",
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'leg',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: ' and ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'tickle',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: ' it.',
                classes: ['combat-dimmed']
            }
        ]);
    });

    it('handles opponent attack with bold verb and regular you at the end', () => {
        const input: Token[] = [
            { type: 'entity', content: 'A Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' slashes your left leg and ticks you.' }
        ];

        const result = formatCombatLineTokens(input);

        expect(result).toEqual([
            {
                type: 'text',
                content: 'A ',
                classes: ['combat-dimmed']
            },
            {
                type: 'entity',
                content: 'Morgundul orc-guard',
                entityId: 'mob-1'
            },
            {
                type: 'text',
                content: ' ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'slashes',
                classes: ['combat-verb']
            },
            {
                type: 'text',
                content: ' your left ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'leg',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: ' and ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'ticks',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: ' ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'you',
                classes: ['combat-regular']
            },
            {
                type: 'text',
                content: '.',
                classes: ['combat-dimmed']
            }
        ]);
    });

    it('treats subsequent combat verbs in the damage clause as regular outcomes', () => {
        const input: Token[] = [
            { type: 'text', content: 'You pound ' },
            { type: 'entity', content: 'an angry hill troll', entityId: 'mob-2' },
            { type: 'text', content: "'s head and crush him!" }
        ];

        const result = formatCombatLineTokens(input);

        // 'pound' should be the action verb (bold)
        // 'crush' should be the damage outcome (regular)
        const poundToken = result.find(t => t.content === 'pound');
        expect(poundToken).toEqual({
            type: 'text',
            content: 'pound',
            classes: ['combat-verb']
        });

        const crushToken = result.find(t => t.content === 'crush');
        expect(crushToken).toEqual({
            type: 'text',
            content: 'crush',
            classes: ['combat-regular']
        });
    });
});
