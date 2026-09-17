// @vitest-environment jsdom
/**
 * @file playerLineTokens.test.ts
 * @description Unit tests for playerLineTokens who/where line tokenization.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildPlayerLineTokens } from './playerLineTokens';

describe('playerLineTokens', () => {
    it('returns null for where table header', () => {
        const header = 'Player           Distance    Direction  Room';
        expect(buildPlayerLineTokens(header)).toBeNull();
    });

    it('returns null for where table separator', () => {
        const separator = '--------------------------------------------';
        expect(buildPlayerLineTokens(separator)).toBeNull();
    });

    it('returns null for empty where notices', () => {
        expect(buildPlayerLineTokens('No-one is nearby.')).toBeNull();
        expect(buildPlayerLineTokens('No-one nearby.')).toBeNull();
        expect(buildPlayerLineTokens('Nobody is around.')).toBeNull();
    });

    it('builds inline ally button token for a where table player row', () => {
        const registerEntity = vi.fn();
        const line = 'Ellessar         Very near              The Long Stair';

        const tokens = buildPlayerLineTokens(line, registerEntity);
        expect(tokens).not.toBeNull();
        expect(tokens).toHaveLength(2);

        expect(tokens![0]).toEqual({
            type: 'entity',
            content: 'Ellessar',
            entityId: 'player:ellessar',
            metadata: {
                kind: 'player',
                category: 'cat-ally-remote',
                context: 'Ellessar',
                location: 'none',
                action: 'menu'
            }
        });

        expect(tokens![1]).toEqual({
            type: 'text',
            content: '         Very near              The Long Stair'
        });

        expect(registerEntity).toHaveBeenCalledWith(
            'player:ellessar',
            'Ellessar',
            'none',
            'cat-ally-remote'
        );
    });

    it('builds tokens for a where row with direction and distance', () => {
        const registerEntity = vi.fn();
        const line = 'Legolas          Far         North      The Great East Road';

        const tokens = buildPlayerLineTokens(line, registerEntity);
        expect(tokens).not.toBeNull();
        expect(tokens![0]).toEqual({
            type: 'entity',
            content: 'Legolas',
            entityId: 'player:legolas',
            metadata: {
                kind: 'player',
                category: 'cat-ally-remote',
                context: 'Legolas',
                location: 'none',
                action: 'menu'
            }
        });
        expect(tokens![1].content).toBe('          Far         North      The Great East Road');
        expect(registerEntity).toHaveBeenCalledWith(
            'player:legolas',
            'Legolas',
            'none',
            'cat-ally-remote'
        );
    });

    it('builds tokens for who list rows', () => {
        const registerEntity = vi.fn();
        const line = '[32 Elf War] Legolas Greenleaf the Hero';

        const tokens = buildPlayerLineTokens(line, registerEntity);
        expect(tokens).not.toBeNull();
        expect(registerEntity).toHaveBeenCalledWith(
            'player:legolas',
            'Legolas',
            'none',
            'cat-ally-remote'
        );
        const entityToken = tokens!.find(t => t.type === 'entity');
        expect(entityToken).toBeDefined();
        expect(entityToken!.content).toBe('Legolas');
    });

    it('returns null for who header lines', () => {
        expect(buildPlayerLineTokens('Players in the world:')).toBeNull();
        expect(buildPlayerLineTokens('Visible players:')).toBeNull();
        expect(buildPlayerLineTokens('Players online:')).toBeNull();
    });
});
