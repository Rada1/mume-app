/** @file regenUtils.test.ts */
import { describe, expect, it } from 'vitest';
import { EffectTimer } from '../types';
import { calculateRegen, formatRegen } from './regenUtils';

const clearThought: EffectTimer = {
    id: 'herb-clear-thought:self', catalogId: 'herb-clear-thought', name: 'Clear Thought',
    kind: 'herblore', startedAt: 1_000, source: 'command', confidence: 'estimated',
    phases: [{ label: 'strong', durationMs: 7_200_000, effects: ['Mana regen +15'] }]
};

describe('calculateRegen', () => {
    it('adds equipment, race, attributes, and the active herb phase', () => {
        const regen = calculateRegen({
            equipped: ['A belt of fell hide', 'A black runed sceptre'],
            race: 'Dwarf', attributes: { con: 10, int: 5, wis: 5, wil: 4, dex: 5 },
            timers: [clearThought], now: 2_000
        });
        expect(regen.hp).toBe(5);
        expect(regen.mana).toBe(25);
        expect(regen.move).toBe(12.7);
    });

    it('uses the current timer phase and preserves signed formatting', () => {
        const fading = {
            ...clearThought,
            startedAt: 1_000,
            phases: [
                { label: 'strong', durationMs: 7_200_000, effects: ['Mana regen +15'] },
                { label: 'fading', durationMs: 14_400_000, effects: ['Mana regen +7'] },
            ],
        };
        expect(calculateRegen({ equipped: [], timers: [fading], now: 7_201_001 }).mana).toBe(7);
        expect(formatRegen(-1.1)).toBe('-1.1');
        expect(formatRegen(3)).toBe('+3');
    });

    it.each([
        ['standing', 0], ['sitting', 1], ['resting', 2], ['sleeping', 4],
])('adds the configured regeneration bonus while %s', (position, bonus) => {
        expect(calculateRegen({ equipped: [], position, timers: [] })).toEqual({ hp: bonus, mana: bonus, move: bonus });
    });
});
