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
