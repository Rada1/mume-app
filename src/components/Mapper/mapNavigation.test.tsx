// @vitest-environment jsdom
/** @file Regression coverage using the shipped map and the rooms from the navigation report. */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createRef, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readMm2 } from './performance/webcockpit/mm2';
import type { MapData } from './performance/webcockpit/model';
import { mapDataToLegacyImport } from './performance/webcockpit/mm2ImportAdapter';
import { adaptWebCockpitMap } from './performance/adaptWebCockpitMap';
import { buildSearchOverlay } from './performance/searchOverlayAdapter';
import { findCanonicalSmartWalkPath } from './hooks/canonicalSmartWalk';
import { findSmartWalkPath } from './hooks/smartWalkPath';
import { useMapHitTest } from './hooks/useMapHitTest';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useRoomInfoHandler } from './hooks/useRoomInfoHandler';
import { alignMappedRooms } from '../../hooks/useMapperRoomCoordinates';
import { findClosestMatchingRoomPath, GRID_SIZE } from './mapperUtils';
import type { MapperRoom } from './mapperTypes';

// --- Logic Section ---
let map: MapData;
let tuples: Record<string, unknown[]>;
const names = ["Cluttered Traveller's Shop", 'Peaceful Meadow', 'Low Stone Cabin', 'Smithy Square'];
const idFor = (name: string) => `m_${map.extId[map.names.indexOf(name)]}`;
beforeAll(async () => {
    map = await readMm2(new Uint8Array(readFileSync('public/nazgum-latest.mm2')), async bytes => new Uint8Array(inflateSync(bytes)));
    tuples = Object.fromEntries(Object.entries(mapDataToLegacyImport(map).rooms).map(([id, tuple]) => [id, [...tuple]]));
});
afterEach(cleanup);

describe('reported rooms in the bundled MMapper map', () => {
    it('follows live server room IDs through an entirely unvisited route', () => {
        const shop = idFor(names[0]);
        const meadow = idFor(names[1]);
        const route = findCanonicalSmartWalkPath(map, shop, meadow, {});
        expect(route).not.toBeNull();
        const serverIndex = Object.fromEntries(Object.entries(tuples).filter(([, tuple]) => tuple[6]).map(([id, tuple]) => [String(tuple[6]), id]));
        const execute = vi.fn();
        const hook = renderHook(() => {
            const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
            const roomsRef = useRef(rooms);
            roomsRef.current = rooms;
            const [roomId, setRoomId] = useState<string | null>(null);
            const currentRoomIdRef = useRef(roomId);
            const preloadedCoordsRef = useRef(tuples);
            const [, setExploredVnums] = useState(new Set<string>());
            const parser = useRoomInfoHandler({
                roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId: setRoomId, preloadedCoordsRef,
                pendingMovesRef: useRef([]), nameIndexRef: useRef({}), serverIdIndexRef: useRef(serverIndex),
                discoverySourceRef: useRef(null), exploredRef: useRef(new Set<string>()), setExploredVnums,
                lastDetectedTerrainRef: useRef(null), firstExploredAtRef: useRef({}), activeView: 'self',
            });
            const walk = useSmartWalk(roomId, rooms, execute, preloadedCoordsRef, undefined, false, new Set(), map);
            return { parser, walk, roomId, rooms };
        });
        const arrive = (id: string) => {
            const tuple = tuples[id.substring(2)];
            act(() => hook.result.current.parser.handleRoomInfo({ id: Number(tuple[6]), name: String(tuple[5]), terrain: 'city' }));
            expect(hook.result.current.roomId).toBe(id);
            expect(hook.result.current.rooms[id]).toMatchObject({ name: tuple[5], x: tuple[0], y: tuple[1] });
        };
        arrive(shop);
        act(() => hook.result.current.walk.startWalking(meadow));
        expect(hook.result.current.walk.isWalking).toBe(true);
        for (const id of route!.ids.slice(1)) arrive(id);
        expect(execute.mock.calls.map(call => call[0])).toEqual(route!.dirs);
        expect(hook.result.current.walk.isWalking).toBe(false);
    });

    it('routes from the shop to the meadow and back with no live or explored rooms', () => {
        const shop = idFor(names[0]);
        const meadow = idFor(names[1]);
        for (const [start, end] of [[shop, meadow], [meadow, shop]]) {
            const canonical = findCanonicalSmartWalkPath(map, start, end, {}, { exploredVnums: new Set(), revealAll: false });
            const legacy = findSmartWalkPath(start, end, {}, tuples, { exploredVnums: new Set(), revealAll: false });
            expect(canonical?.ids[0]).toBe(start);
            expect(canonical?.ids.at(-1)).toBe(end);
            expect(canonical?.dirs.length).toBeGreaterThan(0);
            expect(legacy?.ids.at(-1)).toBe(end);
            const search = findClosestMatchingRoomPath(start, {}, tuples, '', '', { explored: new Set(), targetRoomId: end });
            expect(search?.targetId).toBe(end);
        }
    });

    it('repairs all old saved coordinates together before visiting any of the rooms', () => {
        const saved: Record<string, MapperRoom> = {};
        for (const name of names) {
            const i = map.names.indexOf(name);
            const id = idFor(name);
            saved[id] = { id, gmcpId: map.serverId[i], name, desc: '', x: map.x[i], y: -map.y[i], z: map.z[i], terrain: 'field', zone: '', exits: {}, notes: 'keep my note', createdAt: 1 };
        }
        const aligned = alignMappedRooms(saved, tuples);
        for (const name of names) {
            const id = idFor(name);
            const tuple = tuples[id.substring(2)];
            expect(aligned[id]).toMatchObject({ x: tuple[0], y: tuple[1], z: tuple[2], name, notes: 'keep my note' });
            expect(aligned[id].x - saved[id].x).toBe(1);
            expect(aligned[id].y - saved[id].y).toBe(1);
        }
        expect(alignMappedRooms(aligned, tuples)).toBe(aligned);
    });

    it('right-clicks the rendered tile and highlights its center with no visited data', () => {
        const rendered = adaptWebCockpitMap(map).map;
        const spatial: Record<number, Record<string, string[]>> = {};
        for (const [id, tuple] of Object.entries(tuples)) {
            const z = Number(tuple[2]);
            const key = `${Math.floor(Number(tuple[0]) / 5)},${Math.floor(Number(tuple[1]) / 5)}`;
            ((spatial[z] ??= {})[key] ??= []).push(id);
        }
        const canvas = document.createElement('canvas');
        canvas.dataset.mapRenderer = 'performance-worker';
        const canvasRef = createRef<HTMLCanvasElement>();
        canvasRef.current = canvas;
        const camera = { x: 4150, y: 2500, zoom: 0.7 };
        const hook = renderHook(() => useMapHitTest({
            roomsRef: { current: {} }, markersRef: { current: {} }, currentRoomIdRef: { current: idFor(names[0]) },
            cameraRef: { current: camera }, canvasRef, viewZ: 0,
            spatialIndexRef: { current: spatial }, preloadedCoordsRef: { current: tuples },
        }));
        for (const name of names) {
            const index = map.names.indexOf(name);
            const id = idFor(name);
            const x = rendered.x[index] + 0.5;
            const y = rendered.y[index] + 0.5;
            const pointer = hook.result.current.screenToWorld((x * GRID_SIZE - camera.x) * camera.zoom, (-y * GRID_SIZE - camera.y) * camera.zoom);
            const hit = hook.result.current.getRoomAt(pointer.x, pointer.y, true);
            expect(hit, name).toBe(id);
            expect(tuples[hit!.substring(2)][5]).toBe(name);
            const overlay = buildSearchOverlay({ mapSearchQuery: name, matchedRoomIds: new Set([id]), closestRoomId: id, rooms: {}, preloaded: tuples, canonical: map });
            expect(overlay.target).toEqual({ x, y, z: rendered.z[index] });
        }
    });
});
