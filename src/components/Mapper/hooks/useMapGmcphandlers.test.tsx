// @vitest-environment jsdom
/** @file Ensures redundant room protocols preserve the queued movement path. */
import { useRef } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMapGmcphandlers } from './useMapGmcphandlers';
import type { MapperPrediction, MapperRoom } from '../mapperTypes';

// --- Logic Section ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(preloaded: Record<string, unknown[]> = {}) {
    return renderHook(() => {
        const roomsRef = useRef<Record<string, MapperRoom>>({
            m_1: room('1', 0, 0, { n: '2' }),
            m_2: room('2', 0, -1, { e: '3' }),
            m_3: room('3', 1, -1, { n: '4' }),
            m_4: room('4', 1, -2, {}),
        });
        const currentRoomIdRef = useRef<string | null>('m_1');
        const pendingMovesRef = useRef<{ dir: string; time: number }[]>([]);
        const predictions = useRef<MapperPrediction[]>([]);
        const handlers = useMapGmcphandlers({
            roomsRef, currentRoomIdRef, pendingMovesRef,
            setRooms: () => {},
            setCurrentRoomId: id => { currentRoomIdRef.current = typeof id === 'function' ? id(currentRoomIdRef.current) : id; },
            preloadedCoordsRef: useRef(preloaded), nameIndexRef: useRef({}), serverIdIndexRef: useRef({}),
            discoverySourceRef: useRef(null), exploredRef: useRef(new Set<string>()), setExploredVnums: () => {},
            lastDetectedTerrainRef: useRef(null), firstExploredAtRef: useRef({}),
            activeView: 'self', characterName: 'tester',
            onRoomInfoProcessed: () => { predictions.current = pendingMovesRef.current.map(({ dir }) => ({ dir })); },
        });
        return { ...handlers, pendingMovesRef, predictions, currentRoomIdRef };
    });
}

function room(id: string, x: number, y: number, exits: Record<string, string>): MapperRoom {
    return {
        id: `m_${id}`, gmcpId: Number(id), name: `Room ${id}`, desc: '', x, y, z: 0,
        zone: 'test', terrain: 'field', notes: '', createdAt: 0,
        exits: Object.fromEntries(Object.entries(exits).map(([dir, target]) => [dir, {
            target: `m_${target}`, gmcpDestId: Number(target), closed: false,
        }])),
    };
}

const xml = (dir: string) => new CustomEvent('move', { detail: { source: 'xml', dir } });

describe('movement response ownership', () => {
    it('does not scan the bundled map after a dark arrival resolves through a known exit', () => {
        const scan = vi.fn(Reflect.ownKeys);
        const preloaded = new Proxy<Record<string, unknown[]>>({
            '1': [0, 0, 0, 'field', { n: '2' }, 'Room 1', 1, [], [], 'test'],
            '2': [0, -1, 0, 'field', { e: '3' }, 'Room 2', 2, [], [], 'test'],
        }, { ownKeys: scan });
        const h = setup(preloaded).result.current;
        act(() => ['n', 'e'].forEach(h.pushPendingMove));
        act(() => h.handleRoomInfo({ num: 0, name: 'Darkness' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current).toEqual([{ dir: 'e' }]);
        expect(scan).not.toHaveBeenCalled();
    });
    it('keeps the remaining route through GMCP, XML and text for every arrival', () => {
        let now = 1000;
        vi.spyOn(Date, 'now').mockImplementation(() => now);
        const hook = setup();
        const h = hook.result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        for (const [index, dir] of ['n', 'e', 'n'].entries()) {
            const num = index + 2;
            act(() => h.handleRoomInfo({ num, name: `Room ${num}` }));
            // Duplicate confirmations can arrive after arbitrary text queue delays.
            now += 1000;
            act(() => {
                h.handleMoveConfirmed(xml(dir));
                h.handleMoveConfirmed(new CustomEvent('move', { detail: { isDark: true } }));
                h.handleRoomInfo({ num: 0, name: `Room ${num}`, source: 'text' });
            });
            expect(h.currentRoomIdRef.current).toBe(`m_${num}`);
            expect(h.predictions.current.map(move => move.dir)).toEqual(['n', 'e', 'n'].slice(index + 1));
        }
    });

    it('keeps the path through unidentified dark GMCP rooms and their text echoes', () => {
        const h = setup().result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        act(() => h.handleRoomInfo({ num: 0, name: 'Darkness' }));
        act(() => {
            h.handleMoveConfirmed(xml('n'));
            h.handleMoveConfirmed(new CustomEvent('move', { detail: { isDark: true } }));
            h.handleRoomInfo({ num: 0, name: 'Darkness', source: 'text' });
        });
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current.map(move => move.dir)).toEqual(['e', 'n']);
        act(() => h.handleRoomInfo({ num: 0, name: 'Darkness' }));
        expect(h.currentRoomIdRef.current).toBe('m_3');
        expect(h.predictions.current).toEqual([{ dir: 'n' }]);
    });

    it('dequeues XML-only arrivals once while accepting their room descriptions', () => {
        const h = setup().result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        act(() => h.handleMoveConfirmed(xml('n')));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        act(() => h.handleRoomInfo({ num: 0, name: 'Room 2', desc: 'Updated details', source: 'text' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current.map(move => move.dir)).toEqual(['e', 'n']);
        act(() => h.handleMoveConfirmed(xml('e')));
        act(() => h.handleRoomInfo({ num: 0, name: 'Room 3', source: 'text' }));
        expect(h.currentRoomIdRef.current).toBe('m_3');
        expect(h.predictions.current).toEqual([{ dir: 'n' }]);
    });

    it('handles XML preceding the first GMCP room packet without consuming twice', () => {
        const h = setup().result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        act(() => h.handleMoveConfirmed(xml('n')));
        act(() => h.handleRoomInfo({ num: 2, name: 'Room 2' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current.map(move => move.dir)).toEqual(['e', 'n']);
    });

    it('does not let scout or spectate packets claim player movement ownership', () => {
        const h = setup().result.current;
        act(() => h.handleRoomInfo({ num: 1, name: 'Room 1', spectating: true }));
        act(() => h.handleRoomInfo({ num: 1, name: 'Room 1', scouting: true }));
        act(() => ['n', 'e'].forEach(h.pushPendingMove));
        act(() => h.handleMoveConfirmed(xml('n')));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current).toEqual([{ dir: 'e' }]);
    });
});
