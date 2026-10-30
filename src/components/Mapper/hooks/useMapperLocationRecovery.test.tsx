/** @file Location recovery across death, reconnects, ambiguous rooms and protocol refinements. */
// @vitest-environment jsdom
import { useRef } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MapperPrediction, MapperRoom } from '../mapperTypes';
import { useMapGmcphandlers } from './useMapGmcphandlers';
import { gmcpBus } from '../../../events/gmcpBus';
import type { MapperPreloadedRoom } from '../../../types';

// --- Reconnect and respawn fixtures ---
afterEach(cleanup);
const desc = 'Morruhk enter Middle-earth at this point. Here, either new Morruhk or dead Morruhks are called.';
function setup() {
    const setRooms = vi.fn();
    const hook = renderHook(({name}) => {
        const roomsRef = useRef<Record<string, MapperRoom>>({m_8437:{id:'m_8437',gmcpId:13034223,name:'Trail at a Cave',
            desc:'A steep trail beside the mountain.',x:0,y:0,z:0,terrain:'mountains',zone:'Mountains',notes:'Keep me',createdAt:0,exits:{}}});
        const currentRoomIdRef = useRef<string | null>('m_8437');
        const preloadedCoordsRef = useRef<Record<string, MapperPreloadedRoom>>({
            '118501':[429,-84,0,'CAVERN',{u:'118502'},'Halls of the Morruhk',0,[],[],'Goblin-town',0,1,'','','','','',desc],
            '118502':[429,-84,1,'CAVERN',{d:'118501'},'Above the Halls',0,[],[],'Goblin-town']
        });
        const pendingMovesRef = useRef<{dir:string;time:number}[]>([]);
        const preMoveRef = useRef<{dir:string;targetId:string;time:number} | null>(null);
        const clientPredictionsRef = useRef<MapperPrediction[]>([]);
        const handlers = useMapGmcphandlers({roomsRef,currentRoomIdRef,preloadedCoordsRef,pendingMovesRef,preMoveRef,clientPredictionsRef,
            setRooms,setCurrentRoomId:value => { currentRoomIdRef.current = typeof value === 'function' ? value(currentRoomIdRef.current) : value; },
            serverIdIndexRef:useRef({}),nameIndexRef:useRef({}),discoverySourceRef:useRef(null),exploredRef:useRef(new Set<string>()),
            setExploredVnums:vi.fn(),firstExploredAtRef:useRef({}),lastDetectedTerrainRef:useRef(null),activeView:'self',characterName:name});
        return {...handlers,roomsRef,currentRoomIdRef,pendingMovesRef,preMoveRef,clientPredictionsRef};
    }, {initialProps:{name:'Yulduga'}});
    return {hook,setRooms};
}

it('clears speculative travel on death and reacquires the unidentified respawn room', () => {
    const {hook} = setup(), h = hook.result.current;
    act(() => {h.pushPendingMove('n');h.pushPendingMove('e');});
    h.preMoveRef.current = {dir:'n',targetId:'m_wrong',time:0};
    h.clientPredictionsRef.current = [{dir:'n'}];
    act(() => gmcpBus.emit('Game.PlayerDeath',undefined));
    expect(h.locationState.current.confidence).toBe('searching');
    expect(h.pendingMovesRef.current).toEqual([]);
    expect(h.preMoveRef.current).toBeNull();
    expect(h.clientPredictionsRef.current).toEqual([]);
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,terrain:'cavern',exits:{u:1}}));
    expect(h.currentRoomIdRef.current).toBe('m_118501');
    expect(h.locationState.current.confidence).toBe('confirmed');
    expect(h.roomsRef.current.m_8437).toMatchObject({name:'Trail at a Cave',notes:'Keep me',exits:{}});
    expect(h.roomsRef.current.m_118501.exits.u.target).toBe('m_118502');
});

it.each(['Session.Start','Session.Reset','Connection.Disconnect'] as const)('reacquires the location after %s', event => {
    const {hook} = setup(), h = hook.result.current;
    act(() => {h.pushPendingMove('n');gmcpBus.emit(event,event === 'Session.Start' ? {characterName:'Yulduga'} : undefined);});
    expect(h.locationState.current.confidence).toBe('searching');
    expect(h.pendingMovesRef.current).toEqual([]);
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1}}));
    expect(h.currentRoomIdRef.current).toBe('m_118501');
});

it('combines text with partial GMCP evidence without consuming the next queued move', () => {
    const {hook} = setup(), h = hook.result.current;
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk'}));
    expect(h.locationState.current.confidence).toBe('searching');
    act(() => h.pushPendingMove('u'));
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1},source:'text'}));
    expect(h.currentRoomIdRef.current).toBe('m_118501');
    expect(h.pendingMovesRef.current.map(move => move.dir)).toEqual(['u']);
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1},source:'text'}));
    expect(h.pendingMovesRef.current.map(move => move.dir)).toEqual(['u']);
    act(() => gmcpBus.emit('Event.Moved',{dir:'up'}));
    act(() => h.handleRoomInfo({num:0,name:'Above the Halls',exits:{d:1}}));
    expect(h.currentRoomIdRef.current).toBe('m_118502');
    expect(h.pendingMovesRef.current).toEqual([]);
});

it('does not change the old room through terrain or exit updates while searching', () => {
    const {hook,setRooms} = setup(), h = hook.result.current;
    act(() => gmcpBus.emit('Game.PlayerDeath',undefined));
    act(() => h.handleUpdateExits({exits:{u:{id:99}}}));
    act(() => h.handleTerrain('cavern'));
    expect(setRooms).not.toHaveBeenCalled();
    expect(h.roomsRef.current.m_8437.exits).toEqual({});
});

it('invalidates location and observation ownership when switching characters', () => {
    const {hook} = setup();
    act(() => hook.result.current.pushPendingMove('n'));
    hook.rerender({name:'Other'});
    expect(hook.result.current.locationState.current.confidence).toBe('searching');
    expect(hook.result.current.pendingMovesRef.current).toEqual([]);
});

it('keeps scout and spectate observations isolated from player confidence', () => {
    const {hook} = setup(), h = hook.result.current;
    act(() => gmcpBus.emit('Game.PlayerDeath',undefined));
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1},scouting:true}));
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1},spectating:true}));
    expect(h.locationState.current.confidence).toBe('searching');
    expect(h.currentRoomIdRef.current).toBe('m_8437');
});

it('uses XML directions to resolve uncertain candidates without consuming the following queued move', () => {
    const {hook} = setup(), h = hook.result.current;
    act(() => gmcpBus.emit('Session.Reset',undefined));
    act(() => h.handleRoomInfo({num:0,name:'Halls of the Morruhk',desc,exits:{u:1},source:'text'}));
    expect(h.currentRoomIdRef.current).toBe('m_118501');
    // Force uncertainty so XML cannot dead-reckon from the last confirmed marker.
    h.locationState.current.confidence = 'uncertain';
    act(() => {h.pushPendingMove('u');h.pushPendingMove('d');});
    act(() => h.handleMoveConfirmed(new CustomEvent('move',{detail:{source:'xml',dir:'u'}})));
    expect(h.currentRoomIdRef.current).toBe('m_118501');
    act(() => h.handleRoomInfo({num:0,name:'Above the Halls',exits:{d:1},source:'text'}));
    expect(h.currentRoomIdRef.current).toBe('m_118502');
    expect(h.pendingMovesRef.current.map(move => move.dir)).toEqual(['d']);
});
