/** @file useLogTargetMatch.test.ts — Regression coverage for living NPC and corpse targets. */

import { describe, expect, it } from 'vitest';
import { matchesLogTarget } from './useLogTargetMatch';

// --- Logic Section ---

describe('log target matching', () => {
    const corpse = 'corpse of a Morgundul orc-guard';

    it('keeps the living guard target highlighted', () => {
        expect(matchesLogTarget('Morgundul orc-guard', 'guard', {
            category: 'cat-npc', context: 'guard'
        })).toBe(true);
    });

    it.each([undefined, corpse, 'guard-corpse', '2.guard-corpse'])(
        'does not match the deceased keyword with corpse context %s', context => {
            expect(matchesLogTarget(corpse, 'guard', {
                category: 'cat-room-object', context
            })).toBe(false);
        }
    );

    it.each(['guard-corpse', 'corpse'])(
        'highlights the corpse for its command keyword %s', target => {
            expect(matchesLogTarget(corpse, target, {
                category: 'cat-room-object', context: corpse
            })).toBe(true);
        }
    );

    it('keeps explicit corpse ordinals distinct', () => {
        const metadata = { category: 'cat-room-object', context: '2.guard-corpse' };
        expect(matchesLogTarget(corpse, '2.guard-corpse', metadata)).toBe(true);
        expect(matchesLogTarget(corpse, '1.guard-corpse', metadata)).toBe(false);
        expect(matchesLogTarget(corpse, 'guard-corpse', metadata)).toBe(true);
    });

    it('does not treat a character named Corpse as an object', () => {
        expect(matchesLogTarget('Corpse', 'corpse', { category: 'cat-player' })).toBe(true);
    });
});
