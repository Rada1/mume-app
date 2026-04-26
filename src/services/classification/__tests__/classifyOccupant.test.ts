import { describe, it, expect } from 'vitest';
import { classifyOccupant } from '../classifyOccupant';
import {
    COLOR_ALLY,
    COLOR_ENEMY,
    COLOR_NEUTRAL,
    COLOR_NPC,
} from '../../../utils/categorizationUtils';

describe('classifyOccupant', () => {
    describe('MUME GMCP Room.Chars types', () => {
        it('classifies ally as inline-ally / player', () => {
            expect(classifyOccupant({ type: 'ally' })).toEqual({
                category: 'inline-ally',
                kind: 'player',
                color: COLOR_ALLY,
            });
        });

        it('classifies enemy as inline-enemy / player', () => {
            expect(classifyOccupant({ type: 'enemy' })).toEqual({
                category: 'inline-enemy',
                kind: 'player',
                color: COLOR_ENEMY,
            });
        });

        it('classifies neutral as inline-neutral / player', () => {
            expect(classifyOccupant({ type: 'neutral' })).toEqual({
                category: 'inline-neutral',
                kind: 'player',
                color: COLOR_NEUTRAL,
            });
        });

        it('classifies npc as inline-npc / npc', () => {
            expect(classifyOccupant({ type: 'npc' })).toEqual({
                category: 'inline-npc',
                kind: 'npc',
                color: COLOR_NPC,
            });
        });

        it('returns null for "you" — the self/spectated char never gets an inline button', () => {
            expect(classifyOccupant({ type: 'you' })).toBeNull();
        });
    });

    describe('legacy aliases produced by older parsers', () => {
        it('treats "pc" as ally', () => {
            const result = classifyOccupant({ type: 'pc' });
            expect(result?.category).toBe('inline-ally');
            expect(result?.kind).toBe('player');
        });

        it('treats "player" as ally', () => {
            expect(classifyOccupant({ type: 'player' })?.category).toBe('inline-ally');
        });

        it('treats "mob" / "mobile" as npc', () => {
            expect(classifyOccupant({ type: 'mob' })?.category).toBe('inline-npc');
            expect(classifyOccupant({ type: 'mobile' })?.category).toBe('inline-npc');
        });

        it('treats "self" the same as "you" (no button)', () => {
            expect(classifyOccupant({ type: 'self' })).toBeNull();
        });
    });

    describe('case insensitivity', () => {
        it('accepts uppercase and mixed-case types', () => {
            expect(classifyOccupant({ type: 'ALLY' })?.category).toBe('inline-ally');
            expect(classifyOccupant({ type: 'Enemy' })?.category).toBe('inline-enemy');
            expect(classifyOccupant({ type: 'NPC' })?.category).toBe('inline-npc');
        });
    });

    describe('rejects bad input', () => {
        it('returns null for missing type', () => {
            expect(classifyOccupant({})).toBeNull();
        });

        it('returns null for empty string type', () => {
            expect(classifyOccupant({ type: '' })).toBeNull();
        });

        it('returns null for unknown type strings', () => {
            expect(classifyOccupant({ type: 'wizard' })).toBeNull();
            expect(classifyOccupant({ type: 'rugged' })).toBeNull();
            expect(classifyOccupant({ type: 'man' })).toBeNull();
        });

        it('returns null for null/undefined occupant', () => {
            expect(classifyOccupant(null)).toBeNull();
            expect(classifyOccupant(undefined)).toBeNull();
        });

        it('returns null for non-string type values', () => {
            expect(classifyOccupant({ type: 1 } as any)).toBeNull();
            expect(classifyOccupant({ type: true } as any)).toBeNull();
            expect(classifyOccupant({ type: null } as any)).toBeNull();
        });
    });

    describe('contract — ignores everything except type', () => {
        it('ignores name keywords (no "rugged man" → npc fallback)', () => {
            expect(
                classifyOccupant({ type: 'ally', name: 'a rugged man' } as any)?.category
            ).toBe('inline-ally');
        });

        it('ignores raw `pc` field — classifier expects type to be normalized first', () => {
            // pc-to-type normalization happens in normalizeOccupantType at the
            // ingestion layer. The classifier itself should not infer from pc.
            expect(classifyOccupant({ pc: false } as any)).toBeNull();
            expect(classifyOccupant({ pc: true } as any)).toBeNull();
        });

        it('ignores ANSI color hints', () => {
            expect(
                classifyOccupant({ type: 'enemy', color: 'magenta' } as any)?.category
            ).toBe('inline-enemy');
        });

        it('ignores legacy pc boolean field when type is the primary signal', () => {
            // type wins over pc:false
            expect(
                classifyOccupant({ type: 'ally', pc: false } as any)?.category
            ).toBe('inline-ally');
            // type wins over pc:true
            expect(
                classifyOccupant({ type: 'enemy', pc: true } as any)?.category
            ).toBe('inline-enemy');
        });
    });
});
