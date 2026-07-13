import { useCallback, useRef, MutableRefObject } from 'react';
import { GRID_SIZE, normalizeTerrain } from './mapperUtils';
import { RenderContext } from './renderers/rendererUtils';
import type { CombatPulse } from './renderers/rendererUtils';
import { CompactMapExit, MapperPrediction, RegionLabel } from './mapperTypes';
import { drawTerrains, drawLocalTerrains, drawExplorationRevealOverlay, RING_REVEAL_BAKE_MS, RING_REVEAL_TOTAL_MS } from './renderers/drawTerrains';
import { drawFeatures, drawLocalFeatures, drawAnimatingFlags } from './renderers/drawFeatures';
import { drawDoorLabels } from './renderers/drawDoorLabels';
import { drawEntities, drawGroupMembers, drawDeathIndicator, drawMarkers, drawMarquee, drawDoorHighlights, drawFilterHighlights } from './renderers/drawEntities';
import { drawRegionLabels } from './renderers/drawRegionLabels';
import { drawZoneFocusOverlay } from './renderers/zoneFocusOverlay';
import { ZoneFilterConfig } from './zoneFilters';
import { buildLocalSpatialIndex, didLocalLayoutChange, didCacheRelevantChange } from './mapLayoutIndex';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { perfMonitor } from '../../utils/perfMonitor';


// Flag pop-in animation total (drawAnimatingFlags: delay 100 + animDur 450). The static
// feature cache skips flags while they're still animating (flagScale = 0), so the
// exploration bake must wait until the animation finishes — otherwise it bakes a flagless
// room and then marks itself baked, which stops the live animation overlay and leaves a
// gap until the next unrelated cache rebuild (the load-flag flicker).
const FLAG_POP_IN_MS = 550;
const EXPLORATION_CACHE_FRAME_MS = Math.max(RING_REVEAL_BAKE_MS, FLAG_POP_IN_MS);
const ZOOM_SETTLE_MS = 180;
const ICONS_ZOOM_IN = 0.22;
const ICONS_ZOOM_OUT = 0.05;
const ICONS_FORCE_OFF_ZOOM = 0.04;
const LABELS_ZOOM_IN = 0.42;
const LABELS_ZOOM_OUT = 0.28;
const LABELS_FORCE_OFF_ZOOM = 0.2;

const computeRevealRings = (
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>,
    explored: Set<string>,
    preloaded: Record<string, any>
) => {
    const ring1Revealed = new Set<string>();
    const ring2Peeked = new Set<string>();

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                if (explored.has(vnum)) continue;
                const rData = preloaded[vnum];
                if (!rData?.[4]) continue;
                for (const dir of ['n', 's', 'e', 'w']) {
                    const exit = rData[4][dir];
                    if (exit && explored.has(String(exit.target))) {
                        ring1Revealed.add(vnum);
                        break;
                    }
                }
            }
        }
    }

    return { ring1Revealed, ring2Peeked };
};

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
    treatMapAsExplored?: boolean;
    viewZ?: number | null;
    stateExploredVnums?: Set<string>;
    exploredRef: MutableRefObject<Set<string>>;
    exploredMarkers: Set<string>;
    renderVersion: number;
    firstExploredAtRef: MutableRefObject<Record<string, number>>;
    preloadedCoordsRef: MutableRefObject<Record<string, [number, number, number, number, Record<string, CompactMapExit>, string, string, string[], string[], string?, number?, number?]>>;
    spatialIndexRef: MutableRefObject<Record<number, Record<string, string[]>>>;
    baseMapExitsRef: MutableRefObject<Record<string, any>>;
    walkTargetId?: string | null;
    walkPath?: string[];
    showOrganicTerrain?: boolean;
    triggerRender?: () => void;
    clientPredictionsRef?: MutableRefObject<MapperPrediction[]>;
    entitiesRef: MutableRefObject<any>;
    serverIdIndexRef?: MutableRefObject<Record<string, string>>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    playerColor?: string;
    npcColor?: string;
    enemyColor?: string;
    neutralColor?: string;
    objectColor?: string;
    targetColor?: string;
    activeInlineEntityId?: string | null;
    selectedObjectIds?: Set<string>;
    deathRoomId?: string | null;
    heldButton?: any | null;
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    // Filter results computed upstream (MapperContext) and passed in, so the expensive
    // match scan + BFS path no longer run inside the render loop.
    closestRoomId?: string | null;
    filterPathIds?: string[];
    filterPathDistance?: number;
    matchedRoomIds?: Set<string>;
    combatPulsesRef?: MutableRefObject<CombatPulse[]>;
    mapTileOpacity?: number;
    mapTileVisuals?: any;
    zoneFilters?: Record<string, ZoneFilterConfig>;
    lighting?: string;
    isImmersionMode?: boolean;
    weather?: string;
    regionLabels?: Record<string, RegionLabel>;
    selectedRegionLabelId?: string | null;
    joystickActive?: boolean;
}

interface PendingBuild {
    params: string;
    lodParams: string;
    buildCamX: number;
    buildCamY: number;
    zoom: number;
    camX: number;
    camY: number;
    roomAtCoord: Record<string, any>;
    visitedAtCoord: Record<string, boolean>;
    localVisible: any[];
    rebuildStart: number;
    gatherMs: number;
    terrainMs: number;
    bakeFor: number | null;
    reason: string;
    // Bucket/grid geometry for the build, captured at gather time so terrain
    // columns can be drawn across multiple frames.
    bX1: number; bY1: number; bX2: number; bY2: number;
    gX1: number; gY1: number; gX2: number; gY2: number;
    // Chunked-terrain cursor: next bucket column to draw, and whether the
    // terrain layer (all columns + tail layers) has finished.
    terrainNextBx: number;
    terrainDone: boolean;
    // Tail-layer sub-phase timings, recorded once when the last column finishes.
    localMs: number; gridMs: number; zoneMs: number;
    ring1Revealed?: Set<string>;
    ring2Peeked?: Set<string>;
}

interface MapperLayerCache {
    terrainCanvas: HTMLCanvasElement;
    terrainCtx: CanvasRenderingContext2D;
    featureCanvas: HTMLCanvasElement;
    featureCtx: CanvasRenderingContext2D;
    // Back buffers for chunked (off-frame) rebuilds — drawn into across frames,
    // then swapped with the front canvases when the build completes.
    terrainBackCanvas?: HTMLCanvasElement;
    terrainBackCtx?: CanvasRenderingContext2D;
    featureBackCanvas?: HTMLCanvasElement;
    featureBackCtx?: CanvasRenderingContext2D;
    pendingBuild?: PendingBuild | null;
    lastParams: string;
    lastLodParams?: string;
    lastBuildZoom?: number;
    lastBuildX?: number;
    lastBuildY?: number;
    buildCamX?: number;
    buildCamY?: number;
    roomAtCoord?: Record<string, any>;
    visitedAtCoord?: Record<string, boolean>;
    lastExplorationBakeFor?: number;
}

export const useMapperRenderer = ({
    rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
    cameraRef, isDarkMode, isMobile, imagesRef, characterName,
    playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
    preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, exploredRef, exploredMarkers,
    unveilMap, treatMapAsExplored, viewZ, firstExploredAtRef, walkTargetId, walkPath,
    triggerRender, clientPredictionsRef, entitiesRef, serverIdIndexRef,
    inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor,
    activeInlineEntityId, selectedObjectIds, deathRoomId, heldButton,
    activeMapFilter, mapSearchQuery, combatPulsesRef,
    closestRoomId = null, filterPathIds = [], filterPathDistance = 0, matchedRoomIds = new Set(),
    mapTileVisuals, mapTileOpacity, zoneFilters,
    lighting = 'none',
    isImmersionMode = true,
    weather = 'none',
    regionLabels = {},
    selectedRegionLabelId = null,
    joystickActive = false,
    showOrganicTerrain = true
}: RendererProps) => {

    const zoneFocusGrayscale = useSettingsStore(s => s.zoneFocusGrayscale);
    const isPerformanceMode = useSettingsStore(s => s.isPerformanceMode);
    const useLegacyMapArt = useSettingsStore(s => s.useLegacyMapArt);

    const layerCacheRef = useRef<MapperLayerCache | null>(null);
    const localSpatialIndexRef = useRef<Record<number, Record<string, string[]>>>({});
    const lastRoomsRef = useRef<Record<string, any>>({});
    const processedIconsRef = useRef<Record<string, HTMLCanvasElement>>({});
    const roomsVersionRef = useRef(0);
    const cacheGeometryVersionRef = useRef(0);
    const lastMapTileVisualsRef = useRef<any>(null);
    const lastMapTileOpacityRef = useRef<number>(1);
    const lastZoneFiltersRef = useRef<Record<string, ZoneFilterConfig> | null>(null);
    const fullExploredRef = useRef<{ count: number, set: Set<string> }>({ count: 0, set: new Set() });
    const emptyExploredAtRef = useRef<Record<string, number>>({});
    const zoomLodRef = useRef({
        lastZoom: 0,
        lastZoomActivity: 0,
        showTerrainIcons: true,
        showDoorLabels: true
    });
    const filterFitRef = useRef<{ zoom: number, camX: number, camY: number } | null>(null);

    const drawMap = useCallback((ctx: CanvasRenderingContext2D, dpr: number, canvasWidth: number, canvasHeight: number, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null, isDragging: boolean = false) => {
        const {
            roomChars,
            roomPlayers,
            roomNpcs,
            roomItems,
            groupMembers,
            opponentName,
            opponentId,
            inCombat,
            target: targetName
        } = entitiesRef.current;
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
        const activeRoom = activeId ? stableRoomsRef.current[activeId] : null;
        const activeRawId = activeId?.startsWith('m_') ? activeId.substring(2) : activeId;
        const activePreloadedData = activeRawId ? preloadedCoordsRef.current[activeRawId] : null;
        const activeZone = zoneFocusGrayscale ? (activeRoom?.zone || activePreloadedData?.[9] || null) : null;
        const activeZonePreloaded = zoneFocusGrayscale ? (activePreloadedData?.[9] || null) : null;
        const currentZ = viewZ !== null && viewZ !== undefined ? viewZ : baseZ;
        const camera = cameraRef.current;
        const invZoom = 1 / camera.zoom;
        const ANIM_DUR = 300;
        const zoomLod = zoomLodRef.current;
        if (zoomLod.lastZoom === 0) {
            zoomLod.lastZoom = camera.zoom;
            zoomLod.showTerrainIcons = camera.zoom > ICONS_ZOOM_OUT;
            zoomLod.showDoorLabels = camera.zoom > LABELS_ZOOM_OUT;
        } else if (Math.abs(Math.log2(camera.zoom / zoomLod.lastZoom)) > 0.01) {
            zoomLod.lastZoom = camera.zoom;
            zoomLod.lastZoomActivity = now;
        }
        const isZoomSettling = now - zoomLod.lastZoomActivity < ZOOM_SETTLE_MS;
        const isViewportInteracting = isDragging || isZoomSettling;
        if (!isViewportInteracting) {
            if (camera.zoom > ICONS_ZOOM_IN) zoomLod.showTerrainIcons = true;
            else if (camera.zoom < ICONS_ZOOM_OUT) zoomLod.showTerrainIcons = false;

            if (camera.zoom > LABELS_ZOOM_IN) zoomLod.showDoorLabels = true;
            else if (camera.zoom < LABELS_ZOOM_OUT) zoomLod.showDoorLabels = false;
        } else {
            if (camera.zoom < ICONS_FORCE_OFF_ZOOM) zoomLod.showTerrainIcons = false;
            if (camera.zoom > ICONS_ZOOM_IN) zoomLod.showTerrainIcons = true;
            if (camera.zoom < LABELS_FORCE_OFF_ZOOM) zoomLod.showDoorLabels = false;
            if (camera.zoom > LABELS_ZOOM_IN) zoomLod.showDoorLabels = true;
        }
        const lowEffects = isPerformanceMode || (isMobile && isViewportInteracting);
        const showTerrainIcons = !lowEffects && zoomLod.showTerrainIcons;
        const showDoorLabels = !lowEffects && zoomLod.showDoorLabels;
        
        const allRooms = stableRoomsRef.current;
        const preloaded = preloadedCoordsRef.current;

        const revealAll = !!(treatMapAsExplored || unveilMap);
        const explored = (() => {
            if (!revealAll) return exploredRef.current;
            const keys = Object.keys(preloaded);
            if (fullExploredRef.current.count !== keys.length) {
                fullExploredRef.current = { count: keys.length, set: new Set(keys) };
            }
            return fullExploredRef.current.set;
        })();
        const effectiveExploredMarkers = treatMapAsExplored
            ? new Set(Object.keys(stableMarkersRef.current))
            : exploredMarkers;
        const effectiveFirstExploredAtRef = treatMapAsExplored ? emptyExploredAtRef : firstExploredAtRef;

        // 1. Update Local Spatial Index if rooms changed
        if (allRooms !== lastRoomsRef.current) {
            const layoutChanged = didLocalLayoutChange(lastRoomsRef.current, allRooms);
            // The static-layer cache only invalidates on terrain-relevant changes
            // (position, terrain, light/sundeath, zone, snow, exits/doors — including
            // door open/close on preloaded `m_` rooms). Transient room churn (visit
            // flags, re-received data) bumps roomsVersion for the filter cache but no
            // longer forces a full cache rebuild on every step.
            if (didCacheRelevantChange(lastRoomsRef.current, allRooms)) {
                cacheGeometryVersionRef.current += 1;
            }
            lastRoomsRef.current = allRooms;
            roomsVersionRef.current += 1;
            if (layoutChanged) {
                localSpatialIndexRef.current = buildLocalSpatialIndex(allRooms);
            }
        }

        // Filter matches + BFS path are computed upstream (MapperContext) and arrive as
        // props (matchedRoomIds, closestRoomId, filterPathIds, filterPathDistance). The
        // renderer just consumes them, keeping that expensive scan out of the draw loop.
        const effectiveFilter = activeMapFilter || '';
        const effectiveQuery = (mapSearchQuery || '').trim().toLowerCase();
        const filterActive = !!(effectiveFilter || effectiveQuery);
        void filterPathDistance;

        // Compute fit-camera state so the animation hook can zoom to show player + target
        if (filterActive && closestRoomId && playerPosRef.current) {
            const normId = closestRoomId.startsWith('m_') ? closestRoomId.substring(2) : closestRoomId;
            const targetData = preloaded[normId];
            if (targetData) {
                const PADDING = GRID_SIZE * 4;
                const pWX = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2;
                const pWY = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
                const tWX = targetData[0] * GRID_SIZE + GRID_SIZE / 2;
                const tWY = targetData[1] * GRID_SIZE + GRID_SIZE / 2;
                const bbW = Math.abs(tWX - pWX) + PADDING * 2;
                const bbH = Math.abs(tWY - pWY) + PADDING * 2;
                const targetZoom = Math.max(0.002, Math.min(0.8, Math.min(canvasWidth / bbW, canvasHeight / bbH)));
                const ctrX = (pWX + tWX) / 2;
                const ctrY = (pWY + tWY) / 2;
                filterFitRef.current = {
                    zoom: targetZoom,
                    camX: ctrX - canvasWidth / (2 * targetZoom),
                    camY: ctrY - canvasHeight / (2 * targetZoom),
                };
            } else {
                filterFitRef.current = null;
            }
        } else {
            filterFitRef.current = null;
        }

        const curZInt = Math.round(currentZ);

        // 2. Static Layer Cache Management (Oversized 2x Buffer)
        if (!layerCacheRef.current) {
            const terrainCanvas = document.createElement('canvas');
            const featureCanvas = document.createElement('canvas');
            const terrainCtx = terrainCanvas.getContext('2d', { alpha: true })!;
            const featureCtx = featureCanvas.getContext('2d', { alpha: true })!;
            layerCacheRef.current = { terrainCanvas, terrainCtx, featureCanvas, featureCtx, lastParams: "" };
        }

        const cache = layerCacheRef.current;
        const baseW = ctx.canvas.width, baseH = ctx.canvas.height;
        // We make the cache 2x larger than the screen to allow for smooth panning
        const cacheW = baseW * 2, cacheH = baseH * 2;
        
        if (!cache.terrainBackCanvas) {
            cache.terrainBackCanvas = document.createElement('canvas');
            cache.featureBackCanvas = document.createElement('canvas');
            cache.terrainBackCtx = cache.terrainBackCanvas.getContext('2d', { alpha: true })!;
            cache.featureBackCtx = cache.featureBackCanvas.getContext('2d', { alpha: true })!;
        }

        if (cache.terrainCanvas.width !== cacheW || cache.terrainCanvas.height !== cacheH) {
            cache.terrainCanvas.width = cacheW;
            cache.terrainCanvas.height = cacheH;
            cache.featureCanvas.width = cacheW;
            cache.featureCanvas.height = cacheH;
            cache.terrainBackCanvas!.width = cacheW;
            cache.terrainBackCanvas!.height = cacheH;
            cache.featureBackCanvas!.width = cacheW;
            cache.featureBackCanvas!.height = cacheH;
            cache.pendingBuild = null; // Abandon any in-flight chunked build
            cache.lastParams = ""; // Force rebuild
        }

        // Cache rebuilding logic:
        // We only rebuild if:
        // 1. Core params changed (Dark Mode, Rooms, Explored set)
        // 2. Zoom changed significantly (> 20%)
        // 3. Viewport moved too close to the buffer edges
        const lastBuildZoom = cache.lastBuildZoom ?? 0;
        const zoomDiff = Math.abs(Math.log2(camera.zoom / lastBuildZoom));
        const lastBuildX = cache.lastBuildX ?? 0;
        const lastBuildY = cache.lastBuildY ?? 0;
        
        // Distance from center of cache in world units
        const moveDist = Math.hypot(camera.x - lastBuildX, camera.y - lastBuildY) * camera.zoom * dpr;

        // Dynamic threshold adjustment: during drag/pinch zoom interactions, 
        // we use much higher thresholds to avoid rebuilding the static cache 
        // constantly, letting the GPU stretch/scale the cached canvas smoothly.
        // Once the interaction ends, thresholds drop back to standard levels,
        // triggering a crisp cache rebuild instantly.
        const zoomThreshold = isViewportInteracting ? 0.85 : 0.28;
        const moveThreshold = isViewportInteracting ? baseW * 0.75 : baseW * 0.4;

        const lastExplored = effectiveFirstExploredAtRef.current['_latest'] || 0;
        const explorationAge = lastExplored ? now - lastExplored : Number.POSITIVE_INFINITY;
        const isExplorationAnimating = explorationAge < RING_REVEAL_TOTAL_MS;
        const isExplorationBaked = cache.lastExplorationBakeFor === lastExplored;
        const isExplorationOverlayActive = !isPerformanceMode && !!lastExplored && (explorationAge < RING_REVEAL_BAKE_MS || !isExplorationBaked);
        const finalExplorationBakeDue = !!lastExplored
            && explorationAge >= EXPLORATION_CACHE_FRAME_MS
            && !isExplorationBaked;

        const zoneFiltersChanged = zoneFilters !== lastZoneFiltersRef.current;
        if (zoneFiltersChanged) {
            lastZoneFiltersRef.current = zoneFilters;
        }
        const visualsChanged = mapTileVisuals !== lastMapTileVisualsRef.current || mapTileOpacity !== lastMapTileOpacityRef.current || zoneFiltersChanged;
        if (visualsChanged) {
            lastMapTileVisualsRef.current = mapTileVisuals;
            lastMapTileOpacityRef.current = mapTileOpacity;
        }

        const lodParams = `${showTerrainIcons}_${showDoorLabels}_${lowEffects}`;
        const lodChanged = cache.lastLodParams !== lodParams;
        const paramParts: [string, string | number | boolean][] = [
            ['z', curZInt], ['dark', isDarkMode], ['roomsV', cacheGeometryVersionRef.current],
            // explored.size intentionally omitted: including it forced a full static-cache
            // rebuild on every room discovered (one per step while walking) — the discovery
            // lag. Freshly discovered rooms appear via the screen-space reveal overlay, then
            // fold into the cache once via the deferred bake (finalExplorationBakeDue) after
            // movement settles. Makes discovery behave like reveal-all.
            ['unveil', unveilMap], ['treatExpl', treatMapAsExplored],
            ['weather', weather], ['zone', activeZone || ''], ['zonePre', activeZonePreloaded || ''],
            ['legacyMapArt', useLegacyMapArt],
        ];
        const baseParams = paramParts.map(p => p[1]).join('_');
        const needsRebuild = cache.lastParams !== baseParams || (!isViewportInteracting && lodChanged) || zoomDiff > zoomThreshold || moveDist > moveThreshold || finalExplorationBakeDue || visualsChanged;

        let rebuildReason = '';
        if (perfMonitor.enabled && needsRebuild) {
            if (cache.lastParams !== baseParams) {
                // Name which baseParams field changed (cache.lastParams is the prior join).
                const prevParts = String(cache.lastParams).split('_');
                const changed = paramParts
                    .filter((p, i) => String(p[1]) !== prevParts[i])
                    .map(p => p[0]);
                rebuildReason = changed.length ? changed.join('+') : 'params';
            } else if (visualsChanged) rebuildReason = 'visuals';
            else if (zoomDiff > zoomThreshold) rebuildReason = 'zoom';
            else if (moveDist > moveThreshold) rebuildReason = 'move';
            else if (finalExplorationBakeDue) rebuildReason = 'bake';
            else if (lodChanged) rebuildReason = 'lod';
        }

        // Cache is centered on the camera. Visible world extent is
        // baseW/(zoom*dpr) wide; the cache is 2x screen → 0.5 screens of buffer
        // on each side. Geometry is recomputed per phase from the build anchor.
        const computeBuildGeometry = (buildCamX: number, buildCamY: number) => {
            const vX2 = buildCamX + (cacheW / (camera.zoom * dpr)), vY2 = buildCamY + (cacheH / (camera.zoom * dpr));
            const gX1 = Math.floor(buildCamX / GRID_SIZE) - 1, gY1 = Math.floor(buildCamY / GRID_SIZE) - 1;
            const gX2 = Math.ceil(vX2 / GRID_SIZE) + 1, gY2 = Math.ceil(vY2 / GRID_SIZE) + 1;
            const bX1 = Math.floor(gX1 / 5) - 2, bY1 = Math.floor(gY1 / 5) - 2;
            const bX2 = Math.floor(gX2 / 5) + 2, bY2 = Math.floor(gY2 / 5) + 2;
            return { gX1, gY1, gX2, gY2, bX1, bY1, bX2, bY2 };
        };

        const makeRCtx = (
            targetCtx: CanvasRenderingContext2D, buildCamX: number, buildCamY: number,
            roomAtCoord: Record<string, any>, visitedAtCoord: Record<string, boolean>,
            ring1Revealed?: Set<string>, ring2Peeked?: Set<string>
        ): RenderContext => ({
            ctx: targetCtx, dpr, canvasWidth: cacheW, canvasHeight: cacheH, camera: { ...camera, x: buildCamX, y: buildCamY }, isDarkMode, isMobile,
            imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, exploredMarkers: effectiveExploredMarkers, unveilMap, treatMapAsExplored,
            allRooms, roomAtCoord, visitedAtCoord, preloaded, firstExploredAtRef: effectiveFirstExploredAtRef, selectedRoomIds, activeId, walkTargetId, walkPath, baseMapExitsRef,
            activeZone,
            activeZonePreloaded,
            triggerRender, roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor, targetName, opponentName, opponentId,
            activeInlineEntityId, selectedObjectIds,
            activeMapFilter, mapSearchQuery, matchedRoomIds, closestRoomId, filterPathIds, filterPathDistance, combatPulsesRef,
            mapTileVisuals, mapTileOpacity,
            zoneFilters,
            lighting,
            weather,
            inCombat,
            isDragging,
            lowEffects,
            suppressExplorationAnimation: isExplorationOverlayActive && !finalExplorationBakeDue,
            showTerrainIcons,
            showDoorLabels,
            isExplorationBaked,
            ring1Revealed,
            ring2Peeked,
            joystickActive,
            useLegacyMapArt
        });

        // Phase 1a: clear the back terrain buffer + gather visible rooms. Cheap
        // (~6ms) and runs in the frame the rebuild is triggered. The actual
        // terrain draw is deferred to runTerrainChunk across subsequent frames.
        const gatherTerrainData = (terrainCtx: CanvasRenderingContext2D, buildCamX: number, buildCamY: number) => {
            terrainCtx.setTransform(1, 0, 0, 1, 0, 0);
            terrainCtx.clearRect(0, 0, cacheW, cacheH);
            terrainCtx.fillStyle = isDarkMode ? 'rgba(0,0,0,0)' : '#f2f2f7';
            terrainCtx.fillRect(0, 0, cacheW, cacheH);

            const geo = computeBuildGeometry(buildCamX, buildCamY);
            const { bX1, bY1, bX2, bY2 } = geo;
            const roomAtCoord: Record<string, any> = {};
            const visitedAtCoord: Record<string, boolean> = {};
            const localVisible: any[] = [];
            const floorIndex = spatialIndexRef.current[curZInt];

            const tGatherStart = performance.now();
            const rings = computeRevealRings(bX1, bY1, bX2, bY2, floorIndex || {}, explored, preloaded);

            if (floorIndex) {
                for (let bx = bX1; bx <= bX2; bx++) {
                    for (let by = bY1; by <= bY2; by++) {
                        const bucket = floorIndex[`${bx},${by}`];
                        if (bucket) {
                            for (let j = 0; j < bucket.length; j++) {
                                const vnum = bucket[j];
                                const isExplored = explored.has(vnum);
                                const isRing1 = rings.ring1Revealed.has(vnum);
                                if (!isExplored && !isRing1 && !unveilMap && !treatMapAsExplored) continue;
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
            const gatherMs = performance.now() - tGatherStart;
            perfMonitor.resetIconSplit();

            return { roomAtCoord, visitedAtCoord, localVisible, gatherMs, geo, ring1Revealed: rings.ring1Revealed, ring2Peeked: rings.ring2Peeked };
        };

        // Phase 1b: draw terrain columns into the back buffer within a time
        // budget, advancing pb.terrainNextBx. When the last column is drawn, the
        // tail layers (local terrain, grid, zone overlay) run in the same frame
        // and pb.terrainDone flips true. budgetMs = Infinity runs it all at once
        // (first paint / post-resize) to avoid flashing a blank map.
        const TERRAIN_CHUNK_BUDGET_MS = 8;
        const runTerrainChunk = (pb: PendingBuild, budgetMs: number) => {
            const terrainCtx = cache.terrainBackCtx!;
            const floorIndex = spatialIndexRef.current[curZInt];
            const rCtx = makeRCtx(terrainCtx, pb.buildCamX, pb.buildCamY, pb.roomAtCoord, pb.visitedAtCoord, pb.ring1Revealed, pb.ring2Peeked);

            const tStart = performance.now();
            const deadline = tStart + budgetMs;
            // Scale by the PINNED build zoom (pb.zoom), never the live camera.zoom. The
            // chunked build spans several frames; during an active zoom the live zoom
            // drifts between frames, so using it would draw later columns (and the tail
            // grid/zone layers) at a different scale than earlier ones — the terrain/wall
            // misalignment seen while zooming. The finished cache is reprojected to the
            // live camera at draw time via bZoom = lastBuildZoom = pb.zoom.
            terrainCtx.save();
            terrainCtx.imageSmoothingEnabled = true;
            terrainCtx.scale(dpr * pb.zoom, dpr * pb.zoom);
            terrainCtx.translate(-pb.buildCamX, -pb.buildCamY);

            if (floorIndex) {
                // Always draw at least one column so a build can't stall.
                do {
                    drawTerrains(rCtx, pb.terrainNextBx, pb.bY1, pb.terrainNextBx, pb.bY2, floorIndex);
                    pb.terrainNextBx++;
                } while (pb.terrainNextBx <= pb.bX2 && performance.now() < deadline);
            } else {
                pb.terrainNextBx = pb.bX2 + 1;
            }
            terrainCtx.restore();
            pb.terrainMs += performance.now() - tStart;

            if (pb.terrainNextBx > pb.bX2) {
                // Tail layers, drawn once after all terrain columns are down.
                terrainCtx.save();
                terrainCtx.imageSmoothingEnabled = true;
                terrainCtx.scale(dpr * pb.zoom, dpr * pb.zoom);
                terrainCtx.translate(-pb.buildCamX, -pb.buildCamY);
                const tl0 = performance.now();
                drawLocalTerrains(rCtx, pb.localVisible);
                const tl1 = performance.now();
                const tl2 = performance.now();
                if (floorIndex) drawZoneFocusOverlay(rCtx, pb.bX1, pb.bY1, pb.bX2, pb.bY2, floorIndex, pb.localVisible, true);
                const tl3 = performance.now();
                terrainCtx.restore();
                pb.localMs = tl1 - tl0; pb.gridMs = tl2 - tl1; pb.zoneMs = tl3 - tl2;
                pb.terrainDone = true;
                perfMonitor.setTerrainSplit({ terrains: pb.terrainMs, local: pb.localMs, grid: pb.gridMs, zone: pb.zoneMs });
            }
        };

        // Phase 2: draw the feature layer into featureCtx using the gathered data.
        const runFeaturePhase = (
            featureCtx: CanvasRenderingContext2D, buildCamX: number, buildCamY: number,
            roomAtCoord: Record<string, any>, visitedAtCoord: Record<string, boolean>, localVisible: any[],
            buildZoom: number, ring1Revealed?: Set<string>, ring2Peeked?: Set<string>
        ) => {
            featureCtx.setTransform(1, 0, 0, 1, 0, 0);
            featureCtx.clearRect(0, 0, cacheW, cacheH);
            const floorIndex = spatialIndexRef.current[curZInt];
            const { bX1, bY1, bX2, bY2 } = computeBuildGeometry(buildCamX, buildCamY);
            const featureRCtx = makeRCtx(featureCtx, buildCamX, buildCamY, roomAtCoord, visitedAtCoord, ring1Revealed, ring2Peeked);

            const tFeatureStart = performance.now();
            // Use the pinned build zoom (not live camera.zoom) so features stay locked to
            // the terrain layer built in the same pass; the cache is reprojected to the
            // live camera at draw time.
            if (buildZoom > 0.05) {
                featureCtx.save();
                featureCtx.imageSmoothingEnabled = false;
                featureCtx.scale(dpr * buildZoom, dpr * buildZoom);
                featureCtx.translate(-buildCamX, -buildCamY);

                if (floorIndex) drawFeatures(featureRCtx, bX1, bY1, bX2, bY2, floorIndex);
                drawLocalFeatures(featureRCtx, localVisible);
                if (floorIndex && showDoorLabels) drawDoorLabels(featureRCtx, bX1, bY1, bX2, bY2, floorIndex);
                if (floorIndex) drawZoneFocusOverlay(featureRCtx, bX1, bY1, bX2, bY2, floorIndex, localVisible);

                featureCtx.restore();
            }
            return performance.now() - tFeatureStart;
        };

        const swapBuffers = () => {
            const tc = cache.terrainCanvas, tcx = cache.terrainCtx;
            cache.terrainCanvas = cache.terrainBackCanvas!; cache.terrainCtx = cache.terrainBackCtx!;
            cache.terrainBackCanvas = tc; cache.terrainBackCtx = tcx;
            const fc = cache.featureCanvas, fcx = cache.featureCtx;
            cache.featureCanvas = cache.featureBackCanvas!; cache.featureCtx = cache.featureBackCtx!;
            cache.featureBackCanvas = fc; cache.featureBackCtx = fcx;
        };

        const finalizeBuild = (pb: PendingBuild, featureMs: number) => {
            swapBuffers();
            cache.lastParams = pb.params;
            cache.lastBuildZoom = pb.zoom;
            cache.lastBuildX = pb.camX;
            cache.lastBuildY = pb.camY;
            cache.buildCamX = pb.buildCamX;
            cache.buildCamY = pb.buildCamY;
            cache.lastLodParams = pb.lodParams;
            cache.roomAtCoord = pb.roomAtCoord;
            cache.visitedAtCoord = pb.visitedAtCoord;
            if (pb.bakeFor != null) cache.lastExplorationBakeFor = pb.bakeFor;
            perfMonitor.recordRebuild({
                total: performance.now() - pb.rebuildStart,
                gather: pb.gatherMs,
                terrain: pb.terrainMs,
                feature: featureMs,
                tiles: Object.keys(pb.visitedAtCoord).length,
                reason: pb.reason,
            });
            cache.pendingBuild = null;
        };

        // Chunked rebuild state machine. A rebuild spans several frames:
        //  gather frame — clear + collect visible rooms into the BACK terrain buffer
        //  terrain frames — drawTerrains in time-budgeted column bands until done
        //  feature frame — features into the BACK canvas, then swap front<->back
        // atomically. This keeps any single frame under ~16ms even when zoomed out
        // over thousands of tiles. The front canvas stays visible the whole time.
        // First paint (lastParams === "") finishes synchronously to avoid a blank map.
        if (cache.pendingBuild) {
            const pb = cache.pendingBuild;
            if (!pb.terrainDone) {
                runTerrainChunk(pb, TERRAIN_CHUNK_BUDGET_MS);
                triggerRender?.();
            } else {
                const featureMs = runFeaturePhase(cache.featureBackCtx!, pb.buildCamX, pb.buildCamY, pb.roomAtCoord, pb.visitedAtCoord, pb.localVisible, pb.zoom, pb.ring1Revealed, pb.ring2Peeked);
                finalizeBuild(pb, featureMs);
                triggerRender?.();
            }
        } else if (needsRebuild) {
            const rebuildStart = performance.now();
            const buildCamX = camera.x - (baseW / (camera.zoom * dpr)) * 0.5;
            const buildCamY = camera.y - (baseH / (camera.zoom * dpr)) * 0.5;
            const t = gatherTerrainData(cache.terrainBackCtx!, buildCamX, buildCamY);
            const pb: PendingBuild = {
                params: baseParams, lodParams, buildCamX, buildCamY, zoom: camera.zoom,
                camX: camera.x, camY: camera.y,
                roomAtCoord: t.roomAtCoord, visitedAtCoord: t.visitedAtCoord, localVisible: t.localVisible,
                rebuildStart, gatherMs: t.gatherMs, terrainMs: 0,
                bakeFor: finalExplorationBakeDue ? lastExplored : null, reason: rebuildReason,
                bX1: t.geo.bX1, bY1: t.geo.bY1, bX2: t.geo.bX2, bY2: t.geo.bY2,
                gX1: t.geo.gX1, gY1: t.geo.gY1, gX2: t.geo.gX2, gY2: t.geo.gY2,
                terrainNextBx: t.geo.bX1, terrainDone: false,
                localMs: 0, gridMs: 0, zoneMs: 0,
                ring1Revealed: t.ring1Revealed,
                ring2Peeked: t.ring2Peeked,
            };
            if (!cache.lastParams) {
                // First paint / post-resize: finish now so we never flash a blank map.
                runTerrainChunk(pb, Infinity);
                const featureMs = runFeaturePhase(cache.featureBackCtx!, buildCamX, buildCamY, t.roomAtCoord, t.visitedAtCoord, t.localVisible, pb.zoom, pb.ring1Revealed, pb.ring2Peeked);
                finalizeBuild(pb, featureMs);
            } else {
                cache.pendingBuild = pb;
                triggerRender?.();
            }
        }

        // 3. Main Rendering Pass (Draw the static cache with scaling/projection)
        ctx.clearRect(0, 0, baseW, baseH);

        // Project the cached canvas onto the screen
        // Cache is centered at [buildCamX, buildCamY] with zoom [lastBuildZoom]
        const bZoom = cache.lastBuildZoom || camera.zoom;
        const bX = cache.buildCamX ?? camera.x;
        const bY = cache.buildCamY ?? camera.y;
        
        // Calculate the rectangle of the cache that is visible on screen
        const sX = (camera.x - bX) * bZoom * dpr;
        const sY = (camera.y - bY) * bZoom * dpr;
        const sW = baseW * (bZoom / camera.zoom);
        const sH = baseH * (bZoom / camera.zoom);
        
        ctx.drawImage(cache.terrainCanvas, sX, sY, sW, sH, 0, 0, baseW, baseH);

        const overlayFloorIndex = spatialIndexRef.current[curZInt];
        const screenRings = (() => {
            if (!overlayFloorIndex || !isExplorationOverlayActive) {
                return { ring1Revealed: new Set<string>(), ring2Peeked: new Set<string>() };
            }
            const screenGeo = computeBuildGeometry(camera.x - (baseW / (camera.zoom * dpr)) * 0.5, camera.y - (baseH / (camera.zoom * dpr)) * 0.5);
            return computeRevealRings(screenGeo.bX1, screenGeo.bY1, screenGeo.bX2, screenGeo.bY2, overlayFloorIndex, explored, preloaded);
        })();

        const baseDynamicRCtx: RenderContext = {
            ctx, dpr, canvasWidth: baseW, canvasHeight: baseH, camera, isDarkMode, isMobile,
            imagesRef, processedIconsRef, now, ANIM_DUR, invZoom, currentZ, explored, exploredMarkers: effectiveExploredMarkers, unveilMap, treatMapAsExplored,
            allRooms, roomAtCoord: cache.roomAtCoord || {}, visitedAtCoord: cache.visitedAtCoord || {},
            preloaded: preloadedCoordsRef.current, firstExploredAtRef: effectiveFirstExploredAtRef, selectedRoomIds, activeId, walkTargetId, walkPath, baseMapExitsRef, clientPredictionsRef,
            activeZone,
            groupMembers, serverIdIndexRef, roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor, targetName, opponentName,
            opponentId, activeInlineEntityId, selectedObjectIds, deathRoomId, heldButton,
            activeMapFilter, mapSearchQuery, matchedRoomIds, closestRoomId, filterPathIds, filterPathDistance, combatPulsesRef,
            mapTileVisuals, mapTileOpacity,
            zoneFilters,
            lighting,
            weather,
            inCombat,
            isDragging,
            lowEffects,
            showTerrainIcons,
            showDoorLabels,
            isExplorationBaked,
            ring1Revealed: screenRings.ring1Revealed,
            ring2Peeked: screenRings.ring2Peeked,
            joystickActive
        };

        if (overlayFloorIndex && isExplorationOverlayActive) {
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
            ctx.translate(-camera.x, -camera.y);
            const visibleWorldWidth = baseW / (dpr * camera.zoom);
            const visibleWorldHeight = baseH / (dpr * camera.zoom);
            const ogX1 = Math.floor(camera.x / GRID_SIZE) - 1;
            const ogY1 = Math.floor(camera.y / GRID_SIZE) - 1;
            const ogX2 = Math.ceil((camera.x + visibleWorldWidth) / GRID_SIZE) + 1;
            const ogY2 = Math.ceil((camera.y + visibleWorldHeight) / GRID_SIZE) + 1;
            drawExplorationRevealOverlay(
                baseDynamicRCtx,
                Math.floor(ogX1 / 5) - 1,
                Math.floor(ogY1 / 5) - 1,
                Math.floor(ogX2 / 5) + 1,
                Math.floor(ogY2 / 5) + 1,
                overlayFloorIndex
            );
            ctx.restore();
        }

        ctx.drawImage(cache.featureCanvas, sX, sY, sW, sH, 0, 0, baseW, baseH);

        // 4. Overlay Dynamic Entities (Player, Trails, Markers)
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(dpr * camera.zoom, dpr * camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        const rCtx = baseDynamicRCtx;
        drawGroupMembers(rCtx);
        drawDeathIndicator(rCtx);
        drawFilterHighlights(rCtx, playerPosRef);
        drawEntities(rCtx, playerTrailRef, playerPosRef, characterName);
        drawDoorHighlights(rCtx, playerPosRef);
        drawMarkers(rCtx, stableMarkersRef, selectedMarkerId, camera.x, camera.y, camera.x + baseW/camera.zoom, camera.y + baseH/camera.zoom);
        drawRegionLabels(rCtx, regionLabels, selectedRegionLabelId);
        if (!isPerformanceMode) {
            drawAnimatingFlags(rCtx);
        }

        ctx.restore();
        drawMarquee(rCtx, marquee);



    }, [selectedRoomIds, selectedMarkerId, cameraRef, isDarkMode, isMobile, characterName, imagesRef, stableRoomsRef, stableRoomIdRef, unveilMap, treatMapAsExplored, viewZ, spatialIndexRef, preloadedCoordsRef, baseMapExitsRef, exploredRef, firstExploredAtRef, entitiesRef, serverIdIndexRef, inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor, activeInlineEntityId, selectedObjectIds, deathRoomId, heldButton, walkTargetId, walkPath, activeMapFilter, mapSearchQuery, matchedRoomIds, closestRoomId, filterPathIds, filterPathDistance, combatPulsesRef, currentRoomId, mapTileVisuals, mapTileOpacity, zoneFilters, lighting, weather, regionLabels, selectedRegionLabelId]);

    return { drawMap, filterFitRef };
};
