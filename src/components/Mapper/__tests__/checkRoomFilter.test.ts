/**
 * @file checkRoomFilter.test.ts
 * @description Verifies the Find filter matches free-text queries against room
 * flags, notes, and contents (not the room name or prose description), so
 * autowalk targets the room that actually holds the resource.
 */

import { describe, expect, it } from 'vitest';
import { checkRoomFilter } from '../mapperUtils';

// Preloaded room array layout: [x, y, z, terrain, exits, name, ..., mobFlags(7), loadFlags(8), ..., notes(15), contents(16), desc(17)]
const makePreloaded = (opts: {
    name?: string;
    notes?: string;
    contents?: string;
    desc?: string;
    mobFlags?: string[];
    loadFlags?: string[];
}) => {
    const arr: any[] = new Array(18).fill(undefined);
    arr[5] = opts.name ?? '';
    arr[7] = opts.mobFlags ?? [];
    arr[8] = opts.loadFlags ?? [];
    arr[15] = opts.notes ?? '';
    arr[16] = opts.contents ?? '';
    arr[17] = opts.desc ?? '';
    return arr;
};

describe('checkRoomFilter free-text query', () => {
    it('matches a room carrying the term as a load flag', () => {
        const room = makePreloaded({ name: 'A Plain Barn', loadFlags: ['FOOD'] });
        expect(checkRoomFilter('m_1', null, room, '', 'food')).toBe(true);
    });

    it('matches a room with the term in its notes', () => {
        const room = makePreloaded({ name: 'A Corner', notes: 'great food vendor here' });
        expect(checkRoomFilter('m_2', null, room, '', 'food')).toBe(true);
    });

    it('matches a room with the term in its contents', () => {
        const room = makePreloaded({ name: 'A Larder', contents: 'A loaf of food sits on a shelf.' });
        expect(checkRoomFilter('m_3', null, room, '', 'food')).toBe(true);
    });

    it('does NOT match when the term only appears in the prose description', () => {
        const room = makePreloaded({
            name: 'A Courtyard',
            desc: 'grazing lands once provided food for the animals',
        });
        expect(checkRoomFilter('m_6', null, room, '', 'food')).toBe(false);
    });

    it('does NOT match when the term only appears in the room name', () => {
        const room = makePreloaded({ name: 'The Food Market' });
        expect(checkRoomFilter('m_7', null, room, '', 'food')).toBe(false);
    });

    it('normalises underscores so multi-word queries hit compound flags', () => {
        const room = makePreloaded({ loadFlags: ['PACK_HORSE'] });
        expect(checkRoomFilter('m_4', null, room, '', 'pack horse')).toBe(true);
    });

    it('matches the FOOD_SHOP mob flag for a "food" query', () => {
        const room = makePreloaded({ mobFlags: ['FOOD_SHOP'] });
        expect(checkRoomFilter('m_5', null, room, '', 'food')).toBe(true);
    });
});
