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
            expect(ent?.metadata?.kind).toBe('ally');
        });

        it('emits inline-enemy for type=enemy', () => {
            const tokens = Tokenizer.tokenize(
                'Sauron stands here.',
                makeContext([{ id: '2', name: 'Sauron', type: 'enemy' }])
            );
            const ent = findEntityFor(tokens, 'Sauron');
            expect(ent?.metadata?.category).toBe('inline-enemy');
            expect(ent?.metadata?.kind).toBe('enemy');
            expect(ent?.metadata?.context).toBe('*Sauron*');
        });

        it('emits inline-neutral for type=neutral', () => {
            const tokens = Tokenizer.tokenize(
                'Gollum hisses.',
                makeContext([{ id: '3', name: 'Gollum', type: 'neutral' }])
            );
            const ent = findEntityFor(tokens, 'Gollum');
            expect(ent?.metadata?.category).toBe('inline-neutral');
            expect(ent?.metadata?.kind).toBe('neutral');
            expect(ent?.metadata?.context).toBe('-Gollum-');
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

    describe('GMCP command target resolution', () => {
        it('keeps GMCP enemy markers instead of injecting new ones', () => {
            const tokens = Tokenizer.tokenize(
                '*orc* snarls.',
                makeContext([{ id: '9', name: '*orc*', keyword: '*orc*', type: 'enemy' }])
            );
            const ent = findEntityFor(tokens, '*orc*');
            expect(ent?.entityId).toBe('9');
            expect(ent?.metadata?.context).toBe('*orc*');
        });

        it('targets enemy and neutral command keywords by capitalized name inside markers', () => {
            const tokens = Tokenizer.tokenize(
                '*an Orc* stands with -Brolg the dreadful Orc-.',
                makeContext([
                    { id: '20', name: '*an Orc*', type: 'enemy' },
                    { id: '21', name: '-Brolg the dreadful Orc-', type: 'neutral' }
                ])
            );
            const entities = tokens.filter((t): t is EntityToken => t.type === 'entity');
            expect(entities.map(e => e.metadata?.context)).toEqual(['*Orc*', '-Brolg-']);
        });

        it('assigns duplicate occupants by GMCP id and ordinal keyword', () => {
            const tokens = Tokenizer.tokenize(
                'pack horse waits beside pack horse.',
                makeContext([
                    { id: '10', name: 'pack horse', keyword: 'pack-horse', type: 'npc' },
                    { id: '11', name: 'pack horse', keyword: 'pack-horse', type: 'npc' }
                ])
            );
            const entities = tokens.filter((t): t is EntityToken => t.type === 'entity');
            expect(entities.map(e => e.entityId)).toEqual(['10', '11']);
            expect(entities.map(e => e.metadata?.context)).toEqual(['1.pack-horse', '2.pack-horse']);
        });

        it('assigns XML-tagged duplicate occupants by occurrence too', () => {
            const tokens = Tokenizer.tokenize(
                'A <character>pack horse</character> waits beside a <character>pack horse</character>.',
                makeContext([
                    { id: '10', name: 'pack horse', keyword: 'pack-horse', type: 'npc' },
                    { id: '11', name: 'pack horse', keyword: 'pack-horse', type: 'npc' }
                ])
            );
            const entities = tokens.filter((t): t is EntityToken => t.type === 'entity');
            expect(entities.map(e => e.entityId)).toEqual(['10', '11']);
            expect(entities.map(e => e.metadata?.context)).toEqual(['1.pack-horse', '2.pack-horse']);
        });

        it('can preserve duplicate occupant assignment across room-description lines', () => {
            const tokenizer = Tokenizer.getInstance();
            const context = makeContext([
                { id: '10', name: 'pack horse', keyword: 'pack-horse', type: 'npc' },
                { id: '11', name: 'pack horse', keyword: 'pack-horse', type: 'npc' }
            ]);

            tokenizer.resetOccupantMatches();
            tokenizer.reset('room');
            const first = tokenizer.tokenize('A <character>pack horse</character> is standing here.', context, undefined, true);
            tokenizer.reset('room');
            const second = tokenizer.tokenize('A <character>pack horse</character> is standing here.', context, undefined, true);

            const firstEntity = first.find((t): t is EntityToken => t.type === 'entity');
            const secondEntity = second.find((t): t is EntityToken => t.type === 'entity');
            expect(firstEntity?.metadata?.context).toBe('1.pack-horse');
            expect(secondEntity?.metadata?.context).toBe('2.pack-horse');
        });
    });

    describe('XML object tags', () => {
        it('does NOT promote cyan-colored text to an inline item without an object tag', () => {
            // \x1b[36m = ANSI cyan. Combat hit text can share visual colors,
            // so color alone must not create object buttons.
            const tokens = Tokenizer.tokenize(
                'You see \x1b[36ma rusty sword\x1b[0m on the ground.',
                makeContext([])
            );
            const ent = tokens.find(
                (t): t is EntityToken => t.type === 'entity' && t.metadata?.kind === 'object'
            );
            expect(ent).toBeUndefined();
        });

        it('emits inline object buttons for explicit object tags', () => {
            const tokens = Tokenizer.tokenize(
                'You see <object>a rusty sword</object> on the ground.',
                makeContext([])
            );
            const ent = findEntityFor(tokens, 'a rusty sword');
            expect(ent).toBeDefined();
            expect(ent?.metadata?.category).toBe('inline-obj-room');
        });

        it('does NOT emit object buttons for hit tags', () => {
            const tokens = Tokenizer.tokenize(
                'You <hit>cleave hard</hit> at the orc.',
                makeContext([])
            );
            expect(tokens.find(t => t.type === 'entity')).toBeUndefined();
        });
    });
});
