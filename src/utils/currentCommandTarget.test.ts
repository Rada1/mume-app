/** @file currentCommandTarget.test.ts — Current-target matching avoids similarly named objects. */
import { expect, it } from 'vitest';
import { isCurrentCommandTarget } from './currentCommandTarget';
// --- Matching Checks ---
it('matches NPC and enemy target keywords', () => {
    expect(isCurrentCommandTarget({ category:'cat-npc', context:'guard' }, 'Guard')).toBe(true);
    expect(isCurrentCommandTarget({ category:'cat-enemy', context:'2.orc' }, '2.orc')).toBe(true);
});
it('does not mark a corpse or ally as the combat target', () => {
    expect(isCurrentCommandTarget({ category:'cat-room-object', context:'guard' }, 'guard')).toBe(false);
    expect(isCurrentCommandTarget({ category:'cat-ally', context:'guard' }, 'guard')).toBe(false);
});
it('keeps numbered entities distinct', () => {
    expect(isCurrentCommandTarget({ category:'cat-enemy', context:'2.orc' }, 'orc')).toBe(false);
    expect(isCurrentCommandTarget({ category:'cat-enemy', context:'orc' }, null)).toBe(false);
});
