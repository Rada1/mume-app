import { describe, it, expect } from 'vitest';
import { Tokenizer, TokenizerContext } from '../Tokenizer';
import type { EntityToken, Token } from '../../../types';

const makeContext = (occupants: any[], overrides: Partial<TokenizerContext> = {}): TokenizerContext => ({
    target: null,
    currentOccupants: occupants,
    roomNpcs: [],
    activeGroupMembers: [],
    roomItems: [],
    discoveredItems: [],
    inlineCategories: [],
    buttons: [],
    selectedObjectIds: new Set<string>(),
    ...overrides,
});

const findEntityFor = (tokens: Token[], content: string): EntityToken | undefined =>
    tokens.find((t): t is EntityToken => t.type === 'entity' && t.content.trim() === content);

describe('Tokenizer — char inline button assignment (GMCP source-of-truth contract)', () => {
    describe('GMCP type drives the inline category', () => {
        it('emits inline-ally for type=ally', () => {
            const tokens = Tokenizer.tokenize(
                'Frodo arrives from the south.',
                makeContext([{ id: '1', name: 'Frodo', type: 'ally' }])
            );
            const ent = findEntityFor(tokens, 'Frodo');
            expect(ent?.metadata?.category).toBe('inline-ally');
            expect(ent?.metadata?.kind).toBe('player');
        });

        it('emits inline-enemy for type=enemy', () => {
            const tokens = Tokenizer.tokenize(
                'Sauron stands here.',
                makeContext([{ id: '2', name: 'Sauron', type: 'enemy' }])
            );
            const ent = findEntityFor(tokens, 'Sauron');
            expect(ent?.metadata?.category).toBe('inline-enemy');
            expect(ent?.metadata?.kind).toBe('player');
        });

        it('emits inline-neutral for type=neutral', () => {
            const tokens = Tokenizer.tokenize(
                'Gollum hisses.',
                makeContext([{ id: '3', name: 'Gollum', type: 'neutral' }])
            );
            const ent = findEntityFor(tokens, 'Gollum');
            expect(ent?.metadata?.category).toBe('inline-neutral');
            expect(ent?.metadata?.kind).toBe('player');
        });

        it('emits inline-npc for type=npc', () => {
            const tokens = Tokenizer.tokenize(
                'A grimy orc snarls.',
                makeContext([{ id: '4', name: 'orc', type: 'npc' }])
            );
            const ent = findEntityFor(tokens, 'orc');
            expect(ent?.metadata?.category).toBe('inline-npc');
            expect(ent?.metadata?.kind).toBe('npc');
        });
    });

    describe('Excluded entities', () => {
        it('does NOT emit any inline button for type=you', () => {
            const tokens = Tokenizer.tokenize(
                'Aragorn looks around.',
                makeContext([{ id: '5', name: 'Aragorn', type: 'you' }])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });

        it('does NOT emit any inline button for occupants without a type', () => {
            const tokens = Tokenizer.tokenize(
                'Boromir is here.',
                makeContext([{ id: '6', name: 'Boromir' }])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });

        it('does NOT emit any inline button for unknown type strings', () => {
            const tokens = Tokenizer.tokenize(
                'Wormtongue whispers.',
                makeContext([{ id: '7', name: 'Wormtongue', type: 'wizard' }])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });
    });

    describe('No phantom buttons from ANSI color', () => {
        it('does NOT promote magenta-colored text to a player inline button', () => {
            // \x1b[35m = ANSI magenta. Pre-refactor this would have created a
            // phantom inline-player button for "RandomGuy".
            const tokens = Tokenizer.tokenize(
                '\x1b[35mRandomGuy\x1b[0m says something.',
                makeContext([])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });

        it('does NOT promote yellow-colored text to an NPC inline button', () => {
            // \x1b[33m = ANSI yellow.
            const tokens = Tokenizer.tokenize(
                '\x1b[33mRandomMob\x1b[0m growls.',
                makeContext([])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });
    });

    describe('No phantom buttons from keyword splitting', () => {
        it('does NOT split keyword field into per-word patterns', () => {
            // Pre-refactor: keyword "rugged man scout" would create matches for
            // each word, so "man" would highlight everywhere in the log.
            const tokens = Tokenizer.tokenize(
                'A man walks past you.',
                makeContext([{ id: '8', name: 'a rugged scout', keyword: 'rugged man scout', type: 'npc' }])
            );
            // "man" alone should NOT have been promoted to an entity by keyword split.
            const standaloneMan = tokens.find(
                t => t.type === 'entity' && t.content.trim() === 'man'
            );
            expect(standaloneMan).toBeUndefined();
        });
    });

    describe('Static buttons and items still work', () => {
        it('still highlights cyan-colored text as an inline item (items have no GMCP type)', () => {
            // \x1b[36m = ANSI cyan. Items legitimately rely on color promotion
            // because GMCP doesn't tag them with a `type` field.
            const tokens = Tokenizer.tokenize(
                'You see \x1b[36ma rusty sword\x1b[0m on the ground.',
                makeContext([])
            );
            const ent = tokens.find(
                (t): t is EntityToken => t.type === 'entity' && t.metadata?.kind === 'object'
            );
            expect(ent).toBeDefined();
            expect(ent?.metadata?.category).toMatch(/^obj-/);
        });
    });
});
