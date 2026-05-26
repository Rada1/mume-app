/**
 * @file textRoomMatcher.test.ts
 * @description Tests text-derived mapper room matching without GMCP vnums.
 */

import { describe, expect, it } from 'vitest';
import { findBestTextRoomMatch } from '../textRoomMatcher';
import { MapperRoom } from '../mapperTypes';

// --- Logic Section ---
const room = (id: string, x: number, y: number, zone = 'The Shire'): MapperRoom => ({
    id,
    gmcpId: 0,
    name: 'Current Room',
    desc: '',
    x,
    y,
    z: 0,
    zone,
    terrain: 'Field',
    exits: {},
    notes: '',
    createdAt: 1
});

const preloadedRoom = (
    x: number,
    y: number,
    name: string,
    exits = {},
    desc = '',
    terrain = 'Field',
    zone = 'The Shire'
) => [x, y, 0, terrain, exits, name, 0, [], [], zone, 0, 1, null, null, null, '', '', desc];

describe('findBestTextRoomMatch', () => {
    it('matches the preloaded exit reached by the pending movement direction', () => {
        const current = room('m_100', 0, 0);
        const preloaded = {
            100: preloadedRoom(0, 0, 'Current Room', { n: { target: '101' } }),
            101: preloadedRoom(0, -1, 'Hidden Spring in the Grass', {}, 'A clear spring bubbles as cool water')
        } as Parameters<typeof findBestTextRoomMatch>[4];

        const match = findBestTextRoomMatch({
            name: 'Hidden Spring in the Grass',
            desc: 'A clear spring bubbles as cool water',
            area: 'The Shire',
            terrain: 'Field'
        }, current, 'n', { [current.id]: current }, preloaded);

        expect(match?.id).toBe('m_101');
        expect(match?.source).toBe('TEXT_PRELOADED_EXIT');
    });

    it('rejects a weak same-direction candidate when room facts do not agree', () => {
        const current = room('m_100', 0, 0);
        const preloaded = {
            100: preloadedRoom(0, 0, 'Current Room', { n: { target: '101' } }),
            101: preloadedRoom(0, -1, 'Hidden Spring in the Grass')
        } as Parameters<typeof findBestTextRoomMatch>[4];

        const match = findBestTextRoomMatch({
            name: 'A Tree in the Grass'
        }, current, 'n', { [current.id]: current }, preloaded);

        expect(match).toBeNull();
    });

    it('can use adjacent local coordinates when exits are not known yet', () => {
        const current = room('local_1', 10, 10, 'Bree-land');
        const north = {
            ...room('local_2', 10, 9, 'Bree-land'),
            name: 'A Gate Before Bree',
            desc: 'The village gate rises here.'
        };

        const match = findBestTextRoomMatch({
            name: 'A Gate Before Bree',
            desc: 'The village gate rises here.',
            area: 'Bree-land',
            terrain: 'Field'
        }, current, 'n', { [current.id]: current, [north.id]: north }, {});

        expect(match?.id).toBe('local_2');
        expect(match?.source).toBe('TEXT_COORD');
    });
});
