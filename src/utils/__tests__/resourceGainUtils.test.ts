import { describe, expect, it } from 'vitest';
import { parseResourceGainLine } from '../resourceGainUtils';

describe('parseResourceGainLine', () => {
    it('parses experience gain lines', () => {
        expect(parseResourceGainLine('You receive 42 experience.')).toEqual({ kind: 'xp', amount: 42 });
        expect(parseResourceGainLine('You receive 1,250 experience points.')).toEqual({ kind: 'xp', amount: 1250 });
    });

    it('parses travel point gain lines', () => {
        expect(parseResourceGainLine('You gain 3 travel points.')).toEqual({ kind: 'tp', amount: 3 });
        expect(parseResourceGainLine('You receive 1 tp.')).toEqual({ kind: 'tp', amount: 1 });
        expect(parseResourceGainLine('You receive 2 tps.')).toEqual({ kind: 'tp', amount: 2 });
    });

    it('ignores non-delta resource lines', () => {
        expect(parseResourceGainLine('You receive your share of experience.')).toBeNull();
        expect(parseResourceGainLine('You need more experience.')).toBeNull();
    });
});
