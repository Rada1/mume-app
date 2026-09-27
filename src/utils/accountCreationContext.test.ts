// @vitest-environment jsdom
/**
 * @file accountCreationContext.test.ts
 * @description Verifies the rolling creation transcript retains prose, not menu choices.
 */

import { describe, expect, it } from 'vitest';
import { appendCreationContextLine } from './accountCreationContext';

// --- Logic Section ---
describe('appendCreationContextLine', () => {
    it('keeps distinct prose, strips ANSI color, and excludes numbered choices', () => {
        let context = appendCreationContextLine('', '\u001b[33mChoose Your Allegiance\u001b[0m');
        context = appendCreationContextLine(context, '(1) Free Peoples of the West');
        context = appendCreationContextLine(context, 'You may choose either side.');
        context = appendCreationContextLine(context, 'You may choose either side.');

        expect(context).toBe('Choose Your Allegiance\nYou may choose either side.');
    });

    it('retains only the newest context lines when the transcript exceeds its bound', () => {
        const context = Array.from({ length: 26 }, (_, index) => `Creation detail ${index + 1}`)
            .reduce(appendCreationContextLine, '');

        expect(context.split('\n')).toHaveLength(24);
        expect(context).not.toContain('Creation detail 2\n');
        expect(context.split('\n')[0]).toBe('Creation detail 3');
        expect(context.split('\n').at(-1)).toBe('Creation detail 26');
    });
});
