import { describe, it, expect } from 'vitest';
import { formatCombatLineTokens } from './combatLineTokens';
import { Token } from '../../types';

describe('formatCombatLineTokens', () => {
    it('correctly formats hit line with bold strike verb (cyan) and dimmed rest of line', () => {
        const input: Token[] = [
            { type: 'text', content: 'You pierce ' },
            { type: 'entity', content: 'a Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s left foot and tickle it." }
        ];

        const result = formatCombatLineTokens(input);

        // Expect:
        // 1. "You " (dimmed filler)
        // 2. pierce (bold verb, player strike: cyan)
        // 3. ' a ' (dimmed article)
        // 4. Morgundul orc-guard (entity)
        // 5. "'s left foot and tickle it." (dimmed anatomy + outcome + filler)
        expect(result).toEqual([
            {
                type: 'text',
                content: 'You ',
                classes: ['combat-dimmed']
            },
            {
                type: 'text',
                content: 'pierce',
                classes: ['combat-verb', 'combat-verb-player']
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
                content: "'s left foot and tickle it.",
                classes: ['combat-dimmed']
            }
        ]);
    });

    it('handles opponent attack with bold incoming verb (red) and dimmed rest of line', () => {
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
                classes: ['combat-verb', 'combat-verb-incoming']
            },
            {
                type: 'text',
                content: ' your left leg and ticks you.',
                classes: ['combat-dimmed']
            }
        ]);
    });

    it('treats subsequent combat verbs in hit message as action verbs with 100% opacity', () => {
        const input: Token[] = [
            { type: 'text', content: 'You pound ' },
            { type: 'entity', content: 'an angry hill troll', entityId: 'mob-2' },
            { type: 'text', content: "'s head and crush him!" }
        ];

        const result = formatCombatLineTokens(input);

        // 'pound' and 'crush' are both combat action verbs (bold, 100% opacity)
        const poundToken = result.find(t => t.content === 'pound');
        expect(poundToken).toEqual({
            type: 'text',
            content: 'pound',
            classes: ['combat-verb', 'combat-verb-player']
        });

        const crushToken = result.find(t => t.content === 'crush');
        expect(crushToken).toEqual({
            type: 'text',
            content: 'crush',
            classes: ['combat-verb', 'combat-verb-player']
        });

        // 'head' is dimmed along with other narrative text
        const headMatch = result.find(t => t.content.includes('head'));
        expect(headMatch?.classes).toContain('combat-dimmed');
    });

    it('dims hit strength adverbs and outcomes in hit lines while keeping strike verbs 100% opacity', () => {
        const input: Token[] = [
            { type: 'text', content: 'You barely pierce ' },
            { type: 'entity', content: 'a Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s body and tickle it." }
        ];

        const result = formatCombatLineTokens(input);

        expect(result).toEqual([
            { type: 'text', content: 'You barely ', classes: ['combat-dimmed'] },
            { type: 'text', content: 'pierce', classes: ['combat-verb', 'combat-verb-player'] },
            { type: 'text', content: ' a ', classes: ['combat-dimmed'] },
            { type: 'entity', content: 'Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s body and tickle it.", classes: ['combat-dimmed'] }
        ]);
    });

    it('formats avoid damage lines so only avoid words are 100% opacity regular color, dimming strike verbs', () => {
        const input1: Token[] = [
            { type: 'entity', content: 'A Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' tries to stab you, but your parry is successful.' }
        ];

        const result1 = formatCombatLineTokens(input1);
        expect(result1).toEqual([
            { type: 'text', content: 'A ', classes: ['combat-dimmed'] },
            { type: 'entity', content: 'Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' tries to stab you, but your ', classes: ['combat-dimmed'] },
            { type: 'text', content: 'parry', classes: ['combat-verb'] },
            { type: 'text', content: ' is successful.', classes: ['combat-dimmed'] }
        ]);

        const input2: Token[] = [
            { type: 'entity', content: 'A Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' swiftly dodges your attempt to pierce him.' }
        ];

        const result2 = formatCombatLineTokens(input2);
        expect(result2).toEqual([
            { type: 'text', content: 'A ', classes: ['combat-dimmed'] },
            { type: 'entity', content: 'Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' swiftly ', classes: ['combat-dimmed'] },
            { type: 'text', content: 'dodges', classes: ['combat-verb'] },
            { type: 'text', content: ' your attempt to pierce him.', classes: ['combat-dimmed'] }
        ]);

        const input3: Token[] = [
            { type: 'entity', content: 'A Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' fails to stab you.' }
        ];

        const result3 = formatCombatLineTokens(input3);
        expect(result3).toEqual([
            { type: 'text', content: 'A ', classes: ['combat-dimmed'] },
            { type: 'entity', content: 'Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: ' ', classes: ['combat-dimmed'] },
            { type: 'text', content: 'fails', classes: ['combat-verb'] },
            { type: 'text', content: ' to stab you.', classes: ['combat-dimmed'] }
        ]);
    });

    it('dims shatter and damage outcomes in hit messages while keeping strike verb 100% opacity', () => {
        const input: Token[] = [
            { type: 'text', content: 'You pierce ' },
            { type: 'entity', content: 'a Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s left leg extremely hard and shatter it." }
        ];

        const result = formatCombatLineTokens(input);
        expect(result).toEqual([
            { type: 'text', content: 'You ', classes: ['combat-dimmed'] },
            { type: 'text', content: 'pierce', classes: ['combat-verb', 'combat-verb-player'] },
            { type: 'text', content: ' a ', classes: ['combat-dimmed'] },
            { type: 'entity', content: 'Morgundul orc-guard', entityId: 'mob-1' },
            { type: 'text', content: "'s left leg extremely hard and shatter it.", classes: ['combat-dimmed'] }
        ]);
    });
});
