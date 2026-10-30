// @vitest-environment jsdom
/** @file Ensures redundant room protocols preserve the queued movement path. */
import { useRef } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMapGmcphandlers } from './useMapGmcphandlers';
import type { MapperPrediction, MapperRoom } from '../mapperTypes';
import { gmcpBus } from '../../../events/gmcpBus';

// --- Logic Section ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function setup(preloaded: Record<string, unknown[]> = {}, names: Record<string, string[]> = {}) {
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
            preloadedCoordsRef: useRef(preloaded), nameIndexRef: useRef(names), serverIdIndexRef: useRef({}),
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
    it('tracks XML following without locally queued movement commands', () => {
        const h = setup().result.current;
        act(() => h.handleMoveConfirmed(xml('n')));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        act(() => h.handleRoomInfo({num:0,name:'Room 2',source:'text'}));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.pendingMovesRef.current).toEqual([]);
    });
    it('locates an unidentified respawn using a unique room name and matching exits', () => {
        const h = setup({'118501':[429,-84,0,'CAVERN',{u:{target:'118502'}},'Halls of the Morruhk',0,[],[],'Goblin-town']},
            {'Halls of the Morruhk':['118501']}).result.current;
        act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',exits:{up:1}}));
        expect(h.currentRoomIdRef.current).toBe('m_118501');
    });
    it('uses matching text to corroborate an unidentified GMCP room without claiming movement', () => {
        const h = setup({'118501':[429,-84,0,'CAVERN',{u:{target:'118502'}},'Halls of the Morruhk',0,[],[],'Goblin-town']},
            {'Halls of the Morruhk':['118501']}).result.current;
        act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk'}));
        expect(h.currentRoomIdRef.current).toBe('m_1');
        act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',exits:{u:1},source:'text'}));
        expect(h.currentRoomIdRef.current).toBe('m_118501');
        expect(h.pendingMovesRef.current).toEqual([]);
    });
    it('does not relocate unidentified looks with ambiguous names or conflicting exits', () => {
        const preloaded = {'5':[5,5,0,'CAVERN',{u:6},'Hall',0,[],[],'test'],
            '7':[7,7,0,'CAVERN',{u:8},'Hall',0,[],[],'test']};
        const ambiguous = setup(preloaded, {Hall:['5','7']}).result.current;
        act(() => ambiguous.handleRoomInfo({num:0,name:'Hall',exits:{u:1}}));
        expect(ambiguous.currentRoomIdRef.current).toBe('m_1');
        const mismatch = setup(preloaded, {Hall:['5']}).result.current;
        act(() => mismatch.handleRoomInfo({num:0,name:'Hall',exits:{s:1}}));
        expect(mismatch.currentRoomIdRef.current).toBe('m_1');
    });
    it('tracks dark visible rooms from server directions without locally queued commands', () => {
        const h = setup().result.current;
        for (const [dir, num] of [['north', 2], ['east', 3]] as const) {
            act(() => gmcpBus.emit('Event.Moved', { dir }));
            act(() => h.handleRoomInfo({ id: 0, name: `Room ${num}`, light: 'o' }));
            expect(h.currentRoomIdRef.current).toBe(`m_${num}`);
        }
    });

    it('treats negative server IDs as unidentified rather than authoritative rooms', () => {
        const h = setup().result.current;
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => h.handleRoomInfo({ id: -1, name: 'Darkness', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
    });

    it('does not consume a queued step for a dark look between server-confirmed arrivals', () => {
        const h = setup().result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 2', light: 'o' }));
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 2', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current).toEqual([{ dir: 'e' }, { dir: 'n' }]);
        act(() => gmcpBus.emit('Event.Moved', { dir: 'east' }));
        act(() => h.handleRoomInfo({ name: 'Room 3', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_3');
        expect(h.predictions.current).toEqual([{ dir: 'n' }]);
    });

    it('uses the server direction when it differs from the queued path', () => {
        const h = setup().result.current;
        act(() => ['e', 'n'].forEach(h.pushPendingMove));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 2', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.pendingMovesRef.current).toEqual([]);
    });

    it('flushes a missing room packet before processing the next server move', () => {
        const h = setup().result.current;
        act(() => ['n', 'e', 'n'].forEach(h.pushPendingMove));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'east' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 3' }));
        expect(h.currentRoomIdRef.current).toBe('m_3');
        expect(h.predictions.current).toEqual([{ dir: 'n' }]);
    });

    it('preserves a pending server direction across scout observations and text echoes', () => {
        const h = setup().result.current;
        act(() => ['n', 'e'].forEach(h.pushPendingMove));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => h.handleRoomInfo({ id: 4, name: 'Room 4', scouting: true }));
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 2', light: 'o' }));
        act(() => h.handleMoveConfirmed(xml('n')));
        act(() => h.handleRoomInfo({ num: 0, name: 'Room 2', source: 'text' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current).toEqual([{ dir: 'e' }]);
    });

    it('does not guess coordinates for a missing packet on an unmapped exit', () => {
        const h = setup().result.current;
        act(() => ['e', 'n'].forEach(h.pushPendingMove));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'east' }));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        expect(h.currentRoomIdRef.current).toBe('m_1');
        expect(h.predictions.current).toEqual([{ dir: 'n' }]);
    });

    it('resets pending server arrival ownership on disconnect', () => {
        const h = setup().result.current;
        act(() => gmcpBus.emit('Event.Moved', { dir: 'east' }));
        act(() => gmcpBus.emit('Connection.Disconnect', undefined));
        act(() => h.pushPendingMove('n'));
        act(() => h.handleRoomInfo({ id: 0, name: 'Room 2', exits:{e:1} }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.predictions.current).toEqual([]);
    });

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
