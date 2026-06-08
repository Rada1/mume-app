/**
 * @file smartWalkPath.test.ts
 * @description Tests Smart Walk pathfinding over partial live exits and reveal-all mode.
 */

import { describe, expect, it } from 'vitest';
import { MapperRoom } from '../../mapperTypes';
import { findSmartWalkPath, getSmartWalkDirection, getSmartWalkExits } from '../smartWalkPath';

const makeRoom = (id: string, exits: MapperRoom['exits']): MapperRoom => ({
    id,
    gmcpId: Number(id.replace(/^m_/, '')) || 0,
    name: id,
    desc: '',
    x: Number(id.replace(/^m_/, '')) || 0,
    y: 0,
    z: 0,
    zone: 'test',
    terrain: 'Field',
    exits,
    notes: '',
    createdAt: 0
});

// --- Logic Section ---
describe('smartWalkPath', () => {
    it('keeps master-map targets when live exits only contain metadata', () => {
        const preloaded = {
            '1': [0, 0, 0, 'FIELD', { e: { target: '2', hasDoor: false } }],
            '2': [1, 0, 0, 'FIELD', { w: { target: '1', hasDoor: false }, e: { target: '3', hasDoor: false } }],
            '3': [2, 0, 0, 'FIELD', { w: { target: '2', hasDoor: false } }]
        };
        const rooms = {
            m_1: makeRoom('m_1', { e: { target: '', gmcpDestId: 2, closed: false } })
        };

        expect(getSmartWalkExits('m_1', rooms, preloaded)?.e?.target).toBe('m_2');
        expect(getSmartWalkDirection('m_1', 'm_2', rooms, preloaded)).toBe('e');
        expect(findSmartWalkPath('m_1', 'm_3', rooms, preloaded, { revealAll: true })).toEqual({
            dirs: ['e', 'e'],
            ids: ['m_1', 'm_2', 'm_3']
        });
    });

    it('prefers a longer road/field detour over a shorter water crossing', () => {
        // Layout (start=1, end=4):
        //   Direct:  1 --e--> 2(WATER) --e--> 4   (2 hops, but through water)
        //   Detour:  1 --s--> 3(ROAD)  --e--> 5(ROAD) --n--> 4  (3 hops, all road)
        const preloaded = {
            '1': [0, 0, 0, 'ROAD', { e: { target: '2' }, s: { target: '3' } }],
            '2': [1, 0, 0, 'WATER', { w: { target: '1' }, e: { target: '4' } }],
            '3': [0, 1, 0, 'ROAD', { n: { target: '1' }, e: { target: '5' } }],
            '4': [2, 0, 0, 'FIELD', { w: { target: '2' }, s: { target: '5' } }],
            '5': [2, 1, 0, 'ROAD', { w: { target: '3' }, n: { target: '4' } }]
        };

        const result = findSmartWalkPath('m_1', 'm_4', {}, preloaded, { revealAll: true });
        expect(result?.dirs).toEqual(['s', 'e', 'n']);
        expect(result?.ids).toEqual(['m_1', 'm_3', 'm_5', 'm_4']);
    });

    it('still takes the short crossing when the detour is excessively long', () => {
        // One water hop vs. a very long road chain: water cost (12) should still
        // beat a detour whose accumulated road cost exceeds it.
        const preloaded: Record<string, unknown[]> = {
            '1': [0, 0, 0, 'ROAD', { e: { target: '2' }, s: { target: 'd0' } }],
            '2': [1, 0, 0, 'WATER', { w: { target: '1' }, e: { target: '3' } }],
            '3': [2, 0, 0, 'ROAD', { w: { target: '2' } }]
        };
        // Build a 20-room road detour from 1 down to 3.
        let prev = '1';
        for (let i = 0; i < 20; i++) {
            const id = `d${i}`;
            const next = i === 19 ? '3' : `d${i + 1}`;
            preloaded[id] = [0, i + 1, 0, 'ROAD', { n: { target: prev }, s: { target: next } }];
            prev = id;
        }
        (preloaded['3'] as any)[4].n = { target: 'd19' };

        const result = findSmartWalkPath('m_1', 'm_3', {}, preloaded, { revealAll: true });
        expect(result?.dirs).toEqual(['e', 'e']);
    });

    it('still blocks unexplored master-map rooms outside reveal-all mode', () => {
        const preloaded = {
            '1': [0, 0, 0, 'FIELD', { e: { target: '2', hasDoor: false } }],
            '2': [1, 0, 0, 'FIELD', { w: { target: '1', hasDoor: false }, e: { target: '3', hasDoor: false } }],
            '3': [2, 0, 0, 'FIELD', { w: { target: '2', hasDoor: false } }]
        };
        const rooms = {
            m_1: makeRoom('m_1', { e: { target: '', gmcpDestId: 2, closed: false } })
        };

        expect(findSmartWalkPath('m_1', 'm_3', rooms, preloaded, {
            revealAll: false,
            exploredVnums: new Set(['1'])
        })).toBeNull();
    });
});
