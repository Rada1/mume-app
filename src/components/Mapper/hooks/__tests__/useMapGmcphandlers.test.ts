/**
 * @vitest-environment jsdom
 * @file useMapGmcphandlers.test.ts
 * @description Tests MMapper-style pending movement queue reconciliation.
 */

import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useMapGmcphandlers } from '../useMapGmcphandlers';
import { MapperPrediction, MapperRoom } from '../../mapperTypes';

const makeRef = <T,>(current: T): React.MutableRefObject<T> => ({ current });

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
const renderHandlers = (
    pendingMoves: { dir: string; time: number }[],
    predictions: MapperPrediction[]
) => {
    const roomsRef = makeRef<Record<string, MapperRoom>>({
        m_1: makeRoom('m_1', {
            e: { target: 'm_2', closed: false },
            n: { target: 'm_3', closed: false }
        }),
        m_2: makeRoom('m_2', {}),
        m_3: makeRoom('m_3', {})
    });
    const pendingMovesRef = makeRef(pendingMoves);
    const clientPredictionsRef = makeRef(predictions);
    const setCurrentRoomId = vi.fn((id: string | null) => {
        currentRoomIdRef.current = id;
    });
    const currentRoomIdRef = makeRef<string | null>('m_1');

    const reconcilePrediction = () => {
        const target = pendingMovesRef.current.length;
        clientPredictionsRef.current = clientPredictionsRef.current.slice(
            clientPredictionsRef.current.length - target
        );
    };

    const hook = renderHook(() => useMapGmcphandlers({
        roomsRef,
        setRooms: vi.fn(),
        currentRoomIdRef,
        setCurrentRoomId,
        pendingMovesRef,
        preloadedCoordsRef: makeRef({}),
        spatialIndexRef: makeRef({}),
        nameIndexRef: makeRef({}),
        serverIdIndexRef: makeRef({}),
        discoverySourceRef: makeRef<string | null>(null),
        exploredRef: makeRef(new Set<string>()),
        setExploredVnums: vi.fn(),
        lastDetectedTerrainRef: makeRef<string | null>(null),
        firstExploredAtRef: makeRef({}),
        triggerRender: vi.fn(),
        onRoomInfoProcessed: reconcilePrediction,
        clientPredictionsRef,
        characterName: 'Tester',
        activeView: 'self'
    }));

    return { hook, pendingMovesRef, clientPredictionsRef, setCurrentRoomId };
};

describe('useMapGmcphandlers movement confirmation', () => {
    it('does not consume the queue for GMCP move direction events alone', () => {
        const { hook, pendingMovesRef, clientPredictionsRef, setCurrentRoomId } = renderHandlers(
            [{ dir: 'e', time: 0 }, { dir: 'n', time: 0 }],
            [{ dir: 'e' }, { dir: 'n' }]
        );

        act(() => {
            hook.result.current.handleMoveConfirmed({ detail: { dir: 'east', source: 'gmcp' } });
        });

        expect(setCurrentRoomId).not.toHaveBeenCalled();
        expect(pendingMovesRef.current.map(move => move.dir)).toEqual(['e', 'n']);
        expect(clientPredictionsRef.current.map(move => move.dir)).toEqual(['e', 'n']);
    });

    it('consumes the queue head for directed XML moves', () => {
        const { hook, pendingMovesRef, clientPredictionsRef, setCurrentRoomId } = renderHandlers(
            [{ dir: 'e', time: 0 }, { dir: 'n', time: 0 }],
            [{ dir: 'e' }, { dir: 'n' }]
        );

        act(() => {
            hook.result.current.handleMoveConfirmed({ detail: { dir: 'east', source: 'xml' } });
        });

        expect(setCurrentRoomId).toHaveBeenCalledWith('m_2');
        expect(pendingMovesRef.current.map(move => move.dir)).toEqual(['n']);
        expect(clientPredictionsRef.current.map(move => move.dir)).toEqual(['n']);
    });

    it('clears stale prediction tails when a directed move mismatches the queue head', () => {
        const { hook, pendingMovesRef, clientPredictionsRef, setCurrentRoomId } = renderHandlers(
            [{ dir: 'n', time: 0 }, { dir: 'e', time: 0 }],
            [{ dir: 'n' }, { dir: 'e' }]
        );

        act(() => {
            hook.result.current.handleMoveConfirmed({ detail: { dir: 'east', source: 'xml' } });
        });

        expect(setCurrentRoomId).toHaveBeenCalledWith('m_2');
        expect(pendingMovesRef.current).toEqual([]);
        expect(clientPredictionsRef.current).toEqual([]);
    });
});
