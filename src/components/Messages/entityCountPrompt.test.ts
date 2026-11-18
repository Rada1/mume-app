/** @file entityCountPrompt.test.ts — Entity-count prompt recognition. */
import { describe, expect, it } from 'vitest';
import { parseEntityCountPrompt } from './entityCountPrompt';

// --- Logic Section ---
describe('parseEntityCountPrompt', () => {
    it('recognizes complete, combined count prompts', () => {
        expect(parseEntityCountPrompt('[Player: 2][NPC:12][Object: 0]')).toEqual([
            { kind: 'Player', count: '2' }, { kind: 'NPC', count: '12' }, { kind: 'Object', count: '0' },
        ]);
    });

    it('leaves ordinary or partially matching game output visible', () => {
        for (const text of ['A troll hits you.', '[NPC: 2] arrives', ' [NPC: 2]', '[NPC: x]', '[Other: 2]']) {
            expect(parseEntityCountPrompt(text)).toBeNull();
        }
    });
});
