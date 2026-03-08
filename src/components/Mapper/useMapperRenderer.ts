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
    exploredVnums?: Set<string>;
    firstExploredAtRef: MutableRefObject<Record<string, number>>;
    preloadedCoordsRef: MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean, flags?: string[] }>, string, string, string[], string[]]>>;
    spatialIndexRef: MutableRefObject<Record<number, Record<string, string[]>>>;
}

export const useMapperRenderer = ({
    selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef, preloadedCoordsRef,
    spatialIndexRef, exploredVnums: stateExploredVnums,
    unveilMap, viewZ, firstExploredAtRef
}: RendererProps) => {

    const processedIconsRef = useRef<Record<string, HTMLCanvasElement>>({});
    const cacheCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const cacheParamsRef = useRef({ z: -999, cx: 0, cy: 0, cw: 0, ch: 0, zoom: 0, darkMode: false, exploredCount: 0 });
    const isCacheValidRef = useRef(false);

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
        const now = Date.now();
        const activeId = stableRoomIdRef.current;
        const baseZ = activeId ? (stableRoomsRef.current[activeId]?.z || 0) : 0;
        const currentZ = viewZ !== null && viewZ !== undefined ? viewZ : baseZ;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;
        const ANIM_DUR = 1500;
        
        const allRooms = stableRoomsRef.current;
        const explored = stateExploredVnums || new Set<string>();

        // Background
        ctx.fillStyle = isDarkMode ? '#181825' : '#f2f2f2';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const currentExploredCount = explored.size;
        const cacheParams = cacheParamsRef.current;
        const zoomChanged = Math.abs(cacheParams.zoom - camera.zoom) > 0.01;
        const posChanged = Math.abs(cacheParams.cx - camera.x) > 1 || Math.abs(cacheParams.cy - camera.y) > 1;
        const sizeChanged = cacheParams.cw !== canvasWidth || cacheParams.ch !== canvasHeight;
        
        const needsCacheInvalidation = (
            cacheParams.z !== currentZ || 
            zoomChanged || 
            posChanged || 
            sizeChanged || 
            cacheParams.darkMode !== isDarkMode || 
            cacheParams.exploredCount !== currentExploredCount ||
            !isCacheValidRef.current
        );

        if (needsCacheInvalidation) {
            // Update cache params
            cacheParamsRef.current = {
                z: currentZ,
                cx: camera.x,
                cy: camera.y,
                cw: canvasWidth,
                ch: canvasHeight,
                zoom: camera.zoom,
                darkMode: isDarkMode,
                exploredCount: currentExploredCount
            };
            isCacheValidRef.current = true;
        }

        // Grid bounds
        const vX1 = camera.x, vY1 = camera.y;
        const vX2 = camera.x + (canvasWidth / camera.zoom), vY2 = camera.y + (canvasHeight / camera.zoom);
        const gX1 = Math.floor(vX1 / GRID_SIZE) - 1, gY1 = Math.floor(vY1 / GRID_SIZE) - 1;
        const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1, gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;

        const roomAtCoord: Record<string, any> = {};
        const visitedAtCoord: Record<string, boolean> = {};

        const preloaded = preloadedCoordsRef.current;
        const floorIndex = spatialIndexRef.current[Math.round(currentZ)];

        if (floorIndex) {
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);

            for (let bx = bX1; bx <= bX2; bx++) {
                for (let by = bY1; by <= bY2; by++) {
                    const bucket = floorIndex[`${bx},${by}`];
                    if (!bucket) continue;
                    bucket.forEach(vnum => {
                        const [rx, ry, rz, tSector] = preloaded[vnum];
                        const irx = Math.round(rx), iry = Math.round(ry);
                        const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                        roomAtCoord[`${irx},${iry}`] = normalizeTerrain(localRoom ? localRoom.terrain : tSector);
                        if (explored.has(vnum) || unveilMap) visitedAtCoord[`${irx},${iry}`] = true;
                    });
                }
            }
        }

        Object.values(allRooms).forEach((room: any) => {
            if (!room.id.startsWith('m_') && Math.abs((room.z || 0) - currentZ) < 0.5) {
                const s = GRID_SIZE;
                const rx_p = room.x * s, ry_p = room.y * s;
                if (rx_p < vX1 - s || rx_p > vX2 + s || ry_p < vY1 - s || ry_p > vY2 + s) return;
                const irx = Math.round(room.x), iry = Math.round(room.y);
                roomAtCoord[`${irx},${iry}`] = normalizeTerrain(room.terrain);
                visitedAtCoord[`${irx},${iry}`] = true;
            }
        });

        const rCtx: RenderContext = {
            ctx, dpr, canvasWidth, canvasHeight, camera, isDarkMode, isMobile,
            imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, unveilMap,
            allRooms, roomAtCoord, visitedAtCoord, preloaded, firstExploredAtRef, selectedRoomIds, activeId
        };

        drawGrid(rCtx, gX1, gY1, gX2, gY2);

        if (floorIndex) {
            const bX1 = Math.floor(gX1 / 5), bY1 = Math.floor(gY1 / 5);
            const bX2 = Math.floor(gX2 / 5), bY2 = Math.floor(gY2 / 5);
            drawTerrains(rCtx, bX1, bY1, bX2, bY2, floorIndex);
            drawFeatures(rCtx, bX1, bY1, bX2, bY2, floorIndex);
        }

        drawLocalTerrains(rCtx);
        drawLocalFeatures(rCtx);
        drawEntities(rCtx, playerTrailRef, playerPosRef, characterName);
        drawMarkers(rCtx, stableMarkersRef, selectedMarkerId, vX1, vY1, vX2, vY2);

        ctx.restore();
        drawMarquee(rCtx, marquee);

    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, viewZ, spatialIndexRef, preloadedCoordsRef, stateExploredVnums, firstExploredAtRef]);

    return { drawMap };
};