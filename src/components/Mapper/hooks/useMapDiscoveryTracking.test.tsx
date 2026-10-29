// @vitest-environment jsdom
/** @file Exercises arrivals into rooms absent from discovery mode's live room cache. */
import { useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MapperPreloadedRoom } from '../../../types';
import type { MapperRoom } from '../mapperTypes';
import { gmcpBus } from '../../../events/gmcpBus';
import { useMapGmcphandlers } from './useMapGmcphandlers';

// --- Discovery fixtures ---
afterEach(cleanup);

function setup() {
    return renderHook(() => {
        const preloadedCoordsRef = useRef<Record<string, MapperPreloadedRoom>>({
            '1': [0, 0, 0, 'tunnel', { n: '2' }, 'Start', 900, [], [], 'Goblin-town'],
            '2': [0, -1, 0, 'tunnel', { s: '1', e: '3' }, 'A Tunnel', 901, [], [], 'Goblin-town'],
            '3': [1, -1, 0, 'tunnel', { w: '2' }, 'Tunnel Fork', 902, [], [], 'Goblin-town'],
        });
        const roomsRef = useRef<Record<string, MapperRoom>>({});
        const currentRoomIdRef = useRef<string | null>('m_1');
        const pendingMovesRef = useRef<{ dir: string; time: number }[]>([]);
        const exploredRef = useRef(new Set(['1']));
        const [exploredVnums, setExploredVnums] = useState(exploredRef.current);
        const handlers = useMapGmcphandlers({
            roomsRef, preloadedCoordsRef, currentRoomIdRef, pendingMovesRef, exploredRef, setExploredVnums,
            setRooms: value => {
                roomsRef.current = typeof value === 'function' ? value(roomsRef.current) : value;
            },
            setCurrentRoomId: value => {
                currentRoomIdRef.current = typeof value === 'function' ? value(currentRoomIdRef.current) : value;
            },
            serverIdIndexRef: useRef({ '900': '1', '901': '2', '902': '3' }),
            nameIndexRef: useRef({}), discoverySourceRef: useRef(null),
            lastDetectedTerrainRef: useRef(null), firstExploredAtRef: useRef({}),
            characterName: 'tester', activeView: 'self',
        });
        return { ...handlers, currentRoomIdRef, roomsRef, exploredRef, exploredVnums, pendingMovesRef };
    });
}

// --- Authoritative identity regression coverage ---
describe('discovery room arrivals', () => {
    it('locates an unvisited known ID after a room packet without a retained movement event', () => {
        const h = setup().result.current;
        act(() => h.pushPendingMove('n'));
        act(() => gmcpBus.emit('Event.Moved', { dir: 'north' }));
        act(() => h.handleRoomInfo({ id: 901, name: 'A Tunnel', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_2');
        expect(h.roomsRef.current.m_3).toBeUndefined();
        act(() => h.pushPendingMove('e'));
        act(() => h.handleRoomInfo({ id: 902, name: 'Tunnel Fork', light: 'o' }));
        expect(h.currentRoomIdRef.current).toBe('m_3');
        expect(h.roomsRef.current.m_3.gmcpId).toBe(902);
        expect(h.exploredRef.current.has('3')).toBe(true);
        expect(h.pendingMovesRef.current).toEqual([]);
    });

    it('materializes the current bundled room when a prior ID update already selected it', () => {
        const h = setup().result.current;
        // Group.mapid / persisted location can select a room before its Room.Info.
        h.currentRoomIdRef.current = 'm_3';
        act(() => h.handleRoomInfo({ id: 902, name: 'Tunnel Fork', light: 'o' }));
        expect(h.roomsRef.current.m_3?.gmcpId).toBe(902);
        expect(h.exploredRef.current.has('3')).toBe(true);
    });
});
