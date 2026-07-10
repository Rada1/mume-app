/**
 * @file ShaperConnectionRenderModel.test.ts
 * @description Regression tests for Shaper concept-grid connection rendering.
 */

import { describe, expect, it } from 'vitest';
import type { ShaperDirection, ShaperExitDraft, ShaperRoomDraft } from '../../model/shaperTypes';
import { buildRenderedConnectionHints, buildRenderedExits } from '../ShaperConnectionRenderModel';

// --- Fixture Section ---
const room = (id: string, x: number, y: number, z = 0): ShaperRoomDraft => ({
    id,
    x,
    y,
    z,
    kind: 'grid',
    anchorRoomId: null,
    roomNumber: '',
    status: 'new-draft',
    name: '',
    preposition: 'in',
    description: '',
    sector: '',
    flags: [],
    owner: '',
    keywords: [],
    notes: '',
    annotations: [],
    mobs: [],
    objects: []
});

const exit = (
    fromRoomId: string,
    direction: ShaperDirection,
    toRoomId: string
): ShaperExitDraft => ({
    id: `${fromRoomId}:${direction}`,
    fromRoomId,
    direction,
    toRoomId,
    isTwoWay: false
});

// --- Test Section ---
describe('ShaperConnectionRenderModel', () => {
    it('draws all show-exit mode connections as solid lines', () => {
        const rooms = {
            a: room('a', 0, 0),
            b: room('b', 1, 0),
            c: room('c', 2, 0)
        };
        const exits = {
            'a:e': exit('a', 'e', 'b'),
            'b:w': exit('b', 'w', 'a'),
            'a:u': exit('a', 'u', 'c')
        };

        const rendered = buildRenderedExits(rooms, exits, 0, true);

        expect(rendered).toHaveLength(3);
        expect(rendered.every(conn => conn.isDotted === false)).toBe(true);
    });

    it('does not expose editable exit lines outside show-exit mode', () => {
        const rooms = {
            a: room('a', 0, 0),
            b: room('b', 1, 0)
        };
        const exits = {
            'a:e': exit('a', 'e', 'b')
        };

        const rendered = buildRenderedExits(rooms, exits, 0, false);

        expect(rendered).toEqual([]);
    });

    it('draws one passive hint for each non-cardinal or one-way connection outside show-exit mode', () => {
        const rooms = {
            a: room('a', 0, 0),
            b: room('b', 1, 0),
            c: room('c', 2, 0),
            d: room('d', 2, 1)
        };
        const exits = {
            'a:e': exit('a', 'e', 'b'),
            'b:w': exit('b', 'w', 'a'),
            'b:e': exit('b', 'e', 'c'),
            'a:u': exit('a', 'u', 'd'),
            'd:d': exit('d', 'd', 'a')
        };

        const hints = buildRenderedConnectionHints(rooms, exits, 0, false);

        expect(hints.map(hint => hint.key)).toEqual(['hint:b:e', 'hint:a:d']);
    });

    it('does not draw passive hints between different z levels', () => {
        const rooms = {
            a: room('a', 0, 0, 0),
            b: room('b', 0, 0, 1)
        };
        const exits = {
            'a:u': exit('a', 'u', 'b'),
            'b:d': exit('b', 'd', 'a')
        };

        const hints = buildRenderedConnectionHints(rooms, exits, 0, false);

        expect(hints).toEqual([]);
    });
});
