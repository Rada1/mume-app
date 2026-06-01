/**
 * @file mapperExitSignature.test.ts
 * @description Tests exit-signature comparison and move resolution.
 */

import { describe, expect, it } from 'vitest';
import { compareExitSignature, exitDirSet, findRoomByExitSignature } from '../mapperExitSignature';
import { MapperRoom } from '../mapperTypes';

const room = (over: Omit<Partial<MapperRoom>, 'exits'> & { exits?: Record<string, any> }): MapperRoom => ({
    id: 'm_1', gmcpId: 1, name: 'A Room', desc: '', x: 0, y: 0, z: 0,
    zone: 'Zone', terrain: 'Field', exits: {}, notes: '', ...over
} as MapperRoom);

describe('exitDirSet', () => {
    it('canonicalizes long and short keys and drops false exits', () => {
        const set = exitDirSet({ north: {}, e: 1, down: { name: 'd' }, west: false });
        expect([...set].sort()).toEqual(['d', 'e', 'n']);
    });
});

describe('compareExitSignature', () => {
    it('rewards shared exits and penalizes player-observed exits the candidate lacks', () => {
        const a = compareExitSignature({ n: 1, e: 1, d: 1 }, { n: 1, e: 1, d: 1 });
        expect(a).toMatchObject({ match: 3, eventOnly: 0, candidateOnly: 0 });

        const b = compareExitSignature({ n: 1, e: 1, d: 1 }, { n: 1 });
        expect(b.eventOnly).toBe(2); // player sees e + d that candidate lacks
        expect(b.score).toBeLessThan(a.score);
    });
});

describe('findRoomByExitSignature', () => {
    const dark = { n: { name: 'n' }, e: { name: 'e' }, d: { name: 'd' } };

    it('picks the stacked up/down room whose exits match, not a coord collision', () => {
        const current = room({ id: 'm_1', x: 5, y: 5, z: 0, exits: { u: { target: 'm_2' } } });
        // Two preloaded rooms at the predicted coord (x5,y5,z1): the wrong one (only n)
        // and the right one (n,e,d) that also reverse-connects down to current.
        const preloaded: Record<string, any> = {
            '2': [5, 5, 1, 'Field', { n: 1, e: 1, d: { target: '1' } }, 'Stairs Top', 0, [], [], 'Zone'],
            '3': [5, 5, 1, 'Field', { n: 1 }, 'Other', 0, [], [], 'Zone'],
        };
        const spatialIndex = { 1: { '1,1': ['2', '3'] } };
        const match = findRoomByExitSignature({
            currentRoom: current, dirUsed: 'u', eventExits: dark, rooms: { m_1: current }, preloaded, spatialIndex
        });
        expect(match?.id).toBe('m_2');
    });

    it('rejects when the only candidate conflicts (player sees an exit it lacks)', () => {
        const current = room({ id: 'm_1', x: 0, y: 0, z: 0, exits: { d: { target: 'm_9' } } });
        const preloaded: Record<string, any> = {
            '9': [0, 0, -1, 'Field', { u: 1 }, 'Dead End', 0, [], [], 'Zone'], // only an up exit
        };
        const match = findRoomByExitSignature({
            currentRoom: current, dirUsed: 'd', eventExits: dark, rooms: { m_1: current }, preloaded, spatialIndex: { '-1': { '0,0': ['9'] } }
        });
        expect(match).toBeNull();
    });

    it('accepts a single-exit corridor when topologically confirmed', () => {
        const current = room({ id: 'm_1', x: 0, y: 0, z: 0, exits: { e: { target: 'm_5' } } });
        const preloaded: Record<string, any> = {
            '5': [1, 0, 0, 'Field', { w: { target: '1' } }, 'Corridor', 0, [], [], 'Zone'],
        };
        const match = findRoomByExitSignature({
            currentRoom: current, dirUsed: 'e', eventExits: { w: { name: 'w' } },
            rooms: { m_1: current }, preloaded, spatialIndex: { 0: { '0,0': ['5'] } }
        });
        expect(match?.id).toBe('m_5');
    });
});
