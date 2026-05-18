/**
 * @file playerLineTokens.ts
 * @description Builds inline-player tokens for who/where list rows.
 */

import { Token } from '../../types';
import { EntityLocation } from '../../types/entities';

type RegisterEntity = (id: string, name: string, location: EntityLocation, category?: string) => void;

const HEADER_WORDS = new Set([
    'allies',
    'minions',
    'name',
    'player',
    'players',
    'visible',
    'who'
]);

// --- Logic Section ---
const isPlayerListHeader = (text: string) => {
    const lower = text.trim().toLowerCase();
    return (
        lower.length === 0 ||
        lower.startsWith('players') ||
        lower.startsWith('visible players') ||
        lower.startsWith('player distance') ||
        lower.startsWith('who    location') ||
        lower.includes('players in the world')
    );
};

const extractPlayerName = (text: string) => {
    if (isPlayerListHeader(text)) return null;

    const markerPrefix = String.raw`(?:\[[^\]]*\]|<[^>]+>|\([^)]+\))\s*`;
    const symbolPrefix = String.raw`[!*=+?~-]+\s*`;
    const wordFlagPrefix = String.raw`[A-Z]{1,4}\s+`;
    const nameChar = String.raw`[\p{L}\p{M}'-]`;
    const nameBoundary = String.raw`(?=$|[^\p{L}\p{M}'-])`;
    const match = text.match(new RegExp(String.raw`^\s*(?:(?:${markerPrefix}|${symbolPrefix}|${wordFlagPrefix}))*(${nameChar}{2,21})${nameBoundary}`, 'u'));
    const name = match?.[1];
    if (!name || HEADER_WORDS.has(name.toLowerCase())) return null;
    if (!/\p{L}/u.test(name)) return null;

    return name;
};

export const buildPlayerLineTokens = (
    text: string,
    registerEntity?: RegisterEntity
): Token[] | null => {
    const playerName = extractPlayerName(text);
    if (!playerName) return null;

    const nameIdx = text.indexOf(playerName);
    if (nameIdx < 0) return null;

    const before = text.substring(0, nameIdx);
    const after = text.substring(nameIdx + playerName.length);
    const entityId = `player:${playerName.toLowerCase()}`;

    registerEntity?.(entityId, playerName, 'none', 'cat-ally-remote');

    return [
        ...(before ? [{ type: 'text' as const, content: before }] : []),
        {
            type: 'entity' as const,
            content: playerName,
            entityId,
            metadata: {
                kind: 'player',
                category: 'cat-ally-remote',
                context: playerName,
                location: 'none',
                action: 'menu'
            }
        },
        ...(after ? [{ type: 'text' as const, content: after }] : [])
    ];
};
