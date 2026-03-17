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
    baseMapExitsRef: MutableRefObject<Record<string, any>>;
    walkTargetId?: string | null;
    walkPath?: string[];
    showOrganicTerrain?: boolean;
}

export const useMapperRenderer = ({
    rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
    preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, exploredRef, renderVersion,
    unveilMap, viewZ, firstExploredAtRef, walkTargetId, walkPath,
    showOrganicTerrain = true
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
        let baseZ = 0;
        if (activeId) {
            const room = stableRoomsRef.current[activeId];
            if (room) {
                baseZ = room.z || 0;
            } else {
                const rawId = activeId.startsWith('m_') ? activeId.substring(2) : activeId;
                const pData = preloadedCoordsRef.current[rawId];
                if (pData) baseZ = pData[2] || 0;
            }
        }
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

        const curZInt = Math.round(currentZ);

        // 2. Static Cache Management (Oversized 2x Buffer)
        if (!offscreenCacheRef.current) {
            const canvas = document.createElement('canvas');
            const offCtx = canvas.getContext('2d', { alpha: true })!;
            offscreenCacheRef.current = { canvas, ctx: offCtx, lastParams: "" };
        }

        const cache = offscreenCacheRef.current;
        const baseW = ctx.canvas.width, baseH = ctx.canvas.height;
        // We make the cache 2x larger than the screen to allow for smooth panning
        const cacheW = baseW * 2, cacheH = baseH * 2;
        
        if (cache.canvas.width !== cacheW || cache.canvas.height !== cacheH) {
            cache.canvas.width = cacheW; 
            cache.canvas.height = cacheH;
            cache.lastParams = ""; // Force rebuild
        }

        // Cache rebuilding logic:
        // We only rebuild if:
        // 1. Core params changed (Dark Mode, Rooms, Explored set)
        // 2. Zoom changed significantly (> 20%)
        // 3. Viewport moved too close to the buffer edges
        const lastBuildZoom = (cache as any).lastBuildZoom ?? 0;
        const zoomDiff = Math.abs(Math.log2(camera.zoom / lastBuildZoom));
        const lastBuildX = (cache as any).lastBuildX ?? 0;
        const lastBuildY = (cache as any).lastBuildY ?? 0;
        
        // Distance from center of cache in world units
        const moveDist = Math.hypot(camera.x - lastBuildX, camera.y - lastBuildY) * camera.zoom * dpr;
        // Rebuild if we moved more than 30% of the screen width from the cached center
        const moveThreshold = baseW * 0.4;

        const baseParams = `${curZInt}_${isDarkMode}_${allRooms === lastRoomsRef.current}_${explored.size}_${unveilMap}_${renderVersion}_${activeId}`;
        const needsRebuild = cache.lastParams !== baseParams || zoomDiff > 0.25 || moveDist > moveThreshold;

        if (needsRebuild) {
            const offCtx = cache.ctx;
            offCtx.setTransform(1, 0, 0, 1, 0, 0);
            offCtx.clearRect(0, 0, cacheW, cacheH);
            
            offCtx.save();
            offCtx.imageSmoothingEnabled = false; 
            offCtx.scale(dpr * camera.zoom, dpr * camera.zoom);
            
            // Center the cache on the camera
            // Current viewport in world units: [camera.x, camera.y] to [camera.x + baseW/zoom, camera.y + baseH/zoom]
            // We want the cache to cover [camera.x - baseW/zoom/2, camera.y - baseH/zoom/2] to [camera.x + 3/2*baseW/zoom, ...]
            const buildCamX = camera.x - (baseW / camera.zoom) * 0.5;
            const buildCamY = camera.y - (baseH / camera.zoom) * 0.5;
            
            offCtx.translate(-buildCamX, -buildCamY);

            const vX1 = buildCamX, vY1 = buildCamY;
            const vX2 = buildCamX + (cacheW / (camera.zoom * dpr)), vY2 = buildCamY + (cacheH / (camera.zoom * dpr));
            const gX1 = Math.floor(vX1 / GRID_SIZE) - 1, gY1 = Math.floor(vY1 / GRID_SIZE) - 1;
            const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1, gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;

            const roomAtCoord: Record<string, any> = {};
            const visitedAtCoord: Record<string, boolean> = {};
            const localVisible: any[] = [];
            const preloaded = preloadedCoordsRef.current;
            const floorIndex = spatialIndexRef.current[curZInt];
            
            // Spatially gather visible elements for the enlarged buffer
            const lookSpan = 15; // Increased buffer
            const bX1 = Math.floor(gX1 / 5) - 2, bY1 = Math.floor(gY1 / 5) - 2;
            const bX2 = Math.floor(gX2 / 5) + 2, bY2 = Math.floor(gY2 / 5) + 2;

            if (floorIndex) {
                for (let bx = bX1; bx <= bX2; bx++) {
                    for (let by = bY1; by <= bY2; by++) {
                        const bucket = floorIndex[`${bx},${by}`];
                        if (bucket) {
                            for (let j = 0; j < bucket.length; j++) {
                                const vnum = bucket[j];
                                if (!explored.has(vnum) && !unveilMap) continue;
                                const rData = preloaded[vnum];
                                const irx = Math.round(rData[0]), iry = Math.round(rData[1]);
                                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                                roomAtCoord[`${irx},${iry}`] = normalizeTerrain(localRoom ? localRoom.terrain : rData[3]);
                                visitedAtCoord[`${irx},${iry}`] = true;
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

            const rCtx: RenderContext = {
                ctx: offCtx, dpr, canvasWidth: cacheW, canvasHeight: cacheH, camera: { ...camera, x: buildCamX, y: buildCamY }, isDarkMode, isMobile,
                imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, unveilMap,
                allRooms, roomAtCoord, visitedAtCoord, preloaded, firstExploredAtRef, selectedRoomIds, activeId, walkTargetId, walkPath, baseMapExitsRef
            };

            drawGrid(rCtx, gX1, gY1, gX2, gY2);
            if (floorIndex) drawTerrains(rCtx, bX1, bY1, bX2, bY2, floorIndex);
            drawLocalTerrains(rCtx, localVisible);

            if (camera.zoom > 0.05) {
                if (floorIndex) drawFeatures(rCtx, bX1, bY1, bX2, bY2, floorIndex);
                drawLocalFeatures(rCtx, localVisible);
            }
            
            offCtx.restore();

            cache.lastParams = baseParams;
            (cache as any).lastBuildZoom = camera.zoom;
            (cache as any).lastBuildX = camera.x;
            (cache as any).lastBuildY = camera.y;
            (cache as any).buildCamX = buildCamX;
            (cache as any).buildCamY = buildCamY;
            (cache as any).roomAtCoord = roomAtCoord;
            (cache as any).visitedAtCoord = visitedAtCoord;
        }

        // 3. Main Rendering Pass (Draw the static cache with scaling/projection)
        ctx.clearRect(0, 0, baseW, baseH);

        // Project the cached canvas onto the screen
        // Cache is centered at [buildCamX, buildCamY] with zoom [lastBuildZoom]
        const bZoom = (cache as any).lastBuildZoom;
        const bX = (cache as any).buildCamX;
        const bY = (cache as any).buildCamY;
        
        // Calculate the rectangle of the cache that is visible on screen
        const sX = (camera.x - bX) * bZoom * dpr;
        const sY = (camera.y - bY) * bZoom * dpr;
        const sW = baseW * (bZoom / camera.zoom);
        const sH = baseH * (bZoom / camera.zoom);
        
        ctx.drawImage(cache.canvas, sX, sY, sW, sH, 0, 0, baseW, baseH);

        // 4. Overlay Dynamic Entities (Player, Trails, Markers)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const rCtx: RenderContext = {
            ctx, dpr, canvasWidth: baseW, canvasHeight: baseH, camera, isDarkMode, isMobile,
            imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, unveilMap,
            allRooms, roomAtCoord: (cache as any).roomAtCoord, visitedAtCoord: (cache as any).visitedAtCoord, 
            preloaded: preloadedCoordsRef.current, firstExploredAtRef, selectedRoomIds, activeId, walkTargetId, walkPath, baseMapExitsRef
        };

        drawEntities(rCtx, playerTrailRef, playerPosRef, characterName);
        drawMarkers(rCtx, stableMarkersRef, selectedMarkerId, camera.x, camera.y, camera.x + baseW/camera.zoom, camera.y + baseH/camera.zoom);

        ctx.restore();
        drawMarquee(rCtx, marquee);

    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, viewZ, spatialIndexRef, preloadedCoordsRef, baseMapExitsRef, exploredRef, renderVersion, firstExploredAtRef]);

    return { drawMap };
};