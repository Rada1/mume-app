import { useCallback, useRef, MutableRefObject } from 'react';
import { GRID_SIZE, normalizeTerrain } from './mapperUtils';
import { RenderContext } from './renderers/rendererUtils';
import { drawTerrains, drawLocalTerrains } from './renderers/drawTerrains';
import { drawFeatures, drawLocalFeatures } from './renderers/drawFeatures';
import { drawGrid, drawEntities, drawMarkers, drawMarquee } from './renderers/drawEntities';

interface RendererProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    cameraRef: MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    imagesRef: MutableRefObject<Record<string, HTMLImageElement>>;
    characterName: string | null;
    playerPosRef: MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    stableRoomsRef: MutableRefObject<Record<string, any>>;
    stableRoomIdRef: MutableRefObject<string | null>;
    stableMarkersRef: MutableRefObject<Record<string, any>>;
    unveilMap?: boolean;
    viewZ?: number | null;
    stateExploredVnums?: Set<string>;
    exploredRef: MutableRefObject<Set<string>>;
    renderVersion: number;
    firstExploredAtRef: MutableRefObject<Record<string, number>>;
    preloadedCoordsRef: MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean, flags?: string[] }>, string, string, string[], string[]]>>;
    spatialIndexRef: MutableRefObject<Record<number, Record<string, string[]>>>;
}

export const useMapperRenderer = ({
    selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef, preloadedCoordsRef,
    spatialIndexRef, exploredRef, renderVersion,
    unveilMap, viewZ, firstExploredAtRef
}: RendererProps) => {

    const offscreenCacheRef = useRef<{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, lastParams: string } | null>(null);
    const localSpatialIndexRef = useRef<Record<number, Record<string, string[]>>>({});
    const lastRoomsRef = useRef<Record<string, any>>({});
    const processedIconsRef = useRef<Record<string, HTMLCanvasElement>>({});
    const cacheParamsRef = useRef({ exploredCount: 0 });
    
    // Cache for visible items to avoid recalculating room lookups every frame
    const visibleCacheRef = useRef<{
        roomAtCoord: Record<string, any>,
        visitedAtCoord: Record<string, boolean>,
        localRooms: any[],
        viewBounds: { x1: number, y1: number, x2: number, y2: number, z: number }
    }>({
        roomAtCoord: {},
        visitedAtCoord: {},
        localRooms: [],
        viewBounds: { x1: 0, y1: 0, x2: 0, y2: 0, z: -999 }
    });

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
        const now = Date.now();
        const activeId = stableRoomIdRef.current;
        const baseZ = activeId ? (stableRoomsRef.current[activeId]?.z || 0) : 0;
        const currentZ = viewZ !== null && viewZ !== undefined ? viewZ : baseZ;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;
        const ANIM_DUR = 300;
        
        const allRooms = stableRoomsRef.current;
        const explored = exploredRef.current;

        // 1. Update Local Spatial Index if rooms changed
        if (allRooms !== lastRoomsRef.current) {
            lastRoomsRef.current = allRooms;
            const newIndex: Record<number, Record<string, string[]>> = {};
            Object.values(allRooms).forEach((room: any) => {
                if (room.id.startsWith('m_')) return;
                const rz = Math.round(room.z || 0);
                if (!newIndex[rz]) newIndex[rz] = {};
                const bx = Math.floor(room.x / 5), by = Math.floor(room.y / 5);
                const key = `${bx},${by}`;
                if (!newIndex[rz][key]) newIndex[rz][key] = [];
                newIndex[rz][key].push(room.id);
            });
            localSpatialIndexRef.current = newIndex;
        }

        // 2. Viewport & Bounds
        const vX1 = camera.x, vY1 = camera.y;
        const vX2 = camera.x + (canvasWidth / camera.zoom), vY2 = camera.y + (canvasHeight / camera.zoom);
        const gX1 = Math.floor(vX1 / GRID_SIZE) - 1, gY1 = Math.floor(vY1 / GRID_SIZE) - 1;
        const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1, gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;
        const curZInt = Math.round(currentZ);

        // 3. Static Cache Management
        // We cache a slightly larger area than visible to allow for smooth panning without rebuild
        if (!offscreenCacheRef.current) {
            const canvas = document.createElement('canvas');
            const offCtx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
            offscreenCacheRef.current = { canvas, ctx: offCtx, lastParams: "" };
        }

        const cache = offscreenCacheRef.current;
        const w = ctx.canvas.width, h = ctx.canvas.height;
        if (cache.canvas.width !== w || cache.canvas.height !== h) {
            cache.canvas.width = w; cache.canvas.height = h;
            cache.lastParams = ""; // Force rebuild
        }

        const cacheParams = `${curZInt}_${camera.zoom}_${isDarkMode}_${allRooms === lastRoomsRef.current}_${explored.size}_${unveilMap}_${renderVersion}`;
        const cameraDist = Math.hypot(camera.x - (cache as any).lastCamX, camera.y - (cache as any).lastCamY);
        
        const needsRebuild = cache.lastParams !== cacheParams || cameraDist > (GRID_SIZE * 2.5);

        if (needsRebuild) {
            const offCtx = cache.ctx;
            offCtx.setTransform(1, 0, 0, 1, 0, 0);
            offCtx.fillStyle = isDarkMode ? '#11111b' : '#f2f2f2';
            offCtx.fillRect(0, 0, w, h);
            
            offCtx.save();
            offCtx.imageSmoothingEnabled = false; // Pixel-perfect static layer
            offCtx.scale(dpr * camera.zoom, dpr * camera.zoom);
            offCtx.translate(-camera.x, -camera.y);

            // Re-fetch visible data for the cache
            const vCache = visibleCacheRef.current;
            const roomAtCoord: Record<string, any> = {};
            const visitedAtCoord: Record<string, boolean> = {};
            const localVisible: any[] = [];
            const preloaded = preloadedCoordsRef.current;
            const floorIndex = spatialIndexRef.current[curZInt];
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);

            if (floorIndex) {
                for (let bx = bX1; bx <= bX2; bx++) {
                    for (let by = bY1; by <= bY2; by++) {
                        const bucket = floorIndex[`${bx},${by}`];
                        if (bucket) {
                            for (let j = 0; j < bucket.length; j++) {
                                const vnum = bucket[j];
                                const rData = preloaded[vnum];
                                const irx = Math.round(rData[0]), iry = Math.round(rData[1]);
                                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                                roomAtCoord[`${irx},${iry}`] = normalizeTerrain(localRoom ? localRoom.terrain : rData[3]);
                                if (explored.has(vnum) || unveilMap) visitedAtCoord[`${irx},${iry}`] = true;
                            }
                        }
                    }
                }
            }

            const localFloor = localSpatialIndexRef.current[curZInt];
            if (localFloor) {
                for (let bx = bX1; bx <= bX2; bx++) {
                    for (let by = bY1; by <= bY2; by++) {
                        const bucket = localFloor[`${bx},${by}`];
                        if (bucket) {
                            for (let j = 0; j < bucket.length; j++) {
                                const id = bucket[j];
                                const room = allRooms[id];
                                const irx = Math.round(room.x), iry = Math.round(room.y);
                                roomAtCoord[`${irx},${iry}`] = normalizeTerrain(room.terrain);
                                visitedAtCoord[`${irx},${iry}`] = true;
                                localVisible.push(room);
                            }
                        }
                    }
                }
            }

            vCache.roomAtCoord = roomAtCoord; vCache.visitedAtCoord = visitedAtCoord; vCache.localRooms = localVisible;
            vCache.viewBounds = { x1: gX1, y1: gY1, x2: gX2, y2: gY2, z: curZInt };

            const rCtx: RenderContext = {
                ctx: offCtx, dpr, canvasWidth, canvasHeight, camera, isDarkMode, isMobile,
                imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, unveilMap,
                allRooms, roomAtCoord: vCache.roomAtCoord, visitedAtCoord: vCache.visitedAtCoord, preloaded, firstExploredAtRef, selectedRoomIds, activeId
            };

            drawGrid(rCtx, gX1, gY1, gX2, gY2);
            if (floorIndex) {
                drawTerrains(rCtx, bX1, bY1, bX2, bY2, floorIndex);
                drawFeatures(rCtx, bX1, bY1, bX2, bY2, floorIndex);
            }
            drawLocalTerrains(rCtx, vCache.localRooms);
            drawLocalFeatures(rCtx, vCache.localRooms);
            offCtx.restore();

            cache.lastParams = cacheParams;
            (cache as any).lastCamX = camera.x; (cache as any).lastCamY = camera.y;
        }

        // 4. Main Rendering Pass
        // Wipe main canvas before drawing
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = isDarkMode ? '#11111b' : '#f2f2f2';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw the static cache with offset correction
        // Use Math.round for pixel-perfect stability
        const offsetX = Math.round(((cache as any).lastCamX - camera.x) * camera.zoom * dpr);
        const offsetY = Math.round(((cache as any).lastCamY - camera.y) * camera.zoom * dpr);
        ctx.drawImage(cache.canvas, offsetX, offsetY);

        // Overlay Dynamic Entities (Player, Trails, Markers)
        ctx.save();
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const rCtx: RenderContext = {
            ctx, dpr, canvasWidth, canvasHeight, camera, isDarkMode, isMobile,
            imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, unveilMap,
            allRooms, roomAtCoord: visibleCacheRef.current.roomAtCoord, visitedAtCoord: visibleCacheRef.current.visitedAtCoord, 
            preloaded: preloadedCoordsRef.current, firstExploredAtRef, selectedRoomIds, activeId
        };

        drawEntities(rCtx, playerTrailRef, playerPosRef, characterName);
        drawMarkers(rCtx, stableMarkersRef, selectedMarkerId, vX1, vY1, vX2, vY2);

        ctx.restore();
        drawMarquee(rCtx, marquee);

    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, viewZ, spatialIndexRef, preloadedCoordsRef, exploredRef, renderVersion, firstExploredAtRef]);

    return { drawMap };
};