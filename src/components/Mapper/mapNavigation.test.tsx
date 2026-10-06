// @vitest-environment jsdom
/** @file Regression coverage using the shipped map and the rooms from the navigation report. */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createRef } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readMm2 } from './performance/webcockpit/mm2';
import type { MapData } from './performance/webcockpit/model';
import { mapDataToLegacyImport } from './performance/webcockpit/mm2ImportAdapter';
import { adaptWebCockpitMap } from './performance/adaptWebCockpitMap';
import { buildSearchOverlay } from './performance/searchOverlayAdapter';
import { findCanonicalSmartWalkPath } from './hooks/canonicalSmartWalk';
import { findSmartWalkPath } from './hooks/smartWalkPath';
import { useMapHitTest } from './hooks/useMapHitTest';
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
