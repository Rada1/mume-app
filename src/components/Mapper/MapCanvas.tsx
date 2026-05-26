import React, { useRef, useCallback, useEffect, useMemo, forwardRef } from 'react';
import { useMapperRenderer } from './useMapperRenderer';
import { useMapAnimation } from './useMapAnimation';
import { CompactMapExit, MapperPrediction } from './mapperTypes';
import { gmcpBus } from '../../events/gmcpBus';
import type { CombatPulse } from './renderers/rendererUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useVitalsStore } from '../../stores/useVitalsStore';

interface MapCanvasProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    camera: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    isLandscape?: boolean;
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>;
    characterName: string | null;
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    renderVersion: number;
    isDragging: boolean;
    isDraggingRef?: React.RefObject<boolean>;
    marquee: any;
    autoCenter?: boolean;
    stableRoomsRef: React.MutableRefObject<Record<string, any>>;
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableMarkersRef: React.MutableRefObject<Record<string, any>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, CompactMapExit>, string, string, string[], string[]]>>;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    exploredVnums: Set<string>;
    exploredRef: React.MutableRefObject<Set<string>>;
    exploredMarkers: Set<string>;
    onMouseDown?: (e: React.MouseEvent) => void;
    onMouseMove?: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    triggerRender?: () => void;
    unveilMap?: boolean;
    treatMapAsExplored?: boolean;
    viewZ?: number | null;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    preMoveRef?: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    walkTargetId?: string | null;
    walkPath?: string[];
    baseMapExitsRef: React.MutableRefObject<Record<string, any>>;
    clientPredictionsRef?: React.MutableRefObject<MapperPrediction[]>;
    groupMembers?: import('../../types').GroupMember[];
    serverIdIndexRef?: React.MutableRefObject<Record<string, string>>;
    roomChars?: Record<number, import('../../types').GmcpOccupant>;
    roomPlayers?: import('../../types').GmcpOccupant[];
    roomNpcs?: import('../../types').GmcpOccupant[];
    roomItems?: import('../../types').GmcpOccupant[];
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    playerColor?: string;
    npcColor?: string;
    enemyColor?: string;
    objectColor?: string;
    targetColor?: string;
    targetName?: string | null;
    opponentName?: string | null;
    opponentId?: string | null;
    inCombat?: boolean;
    activeInlineEntityId?: string | null;
    selectedObjectIds?: Set<string>;
    deathRoomId?: string | null;
    heldButton?: any | null;
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    mapTileOpacity?: number;
    mapTileVisuals?: import('./mapperTypes').MapTileVisualAdjustments;
    lighting?: string;
    calibration?: any;
    vectors?: any;
    isTracingMode?: boolean;
    activePath?: any;
    regionLabels?: any;
    regionLabelEditMode?: boolean;
    selectedRegionLabelId?: string | null;
}

export const MapCanvas = React.memo(forwardRef<HTMLCanvasElement, MapCanvasProps>((props, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;
    const combatPulsesRef = useRef<CombatPulse[]>([]);

    const getDPR = useCallback(() => Math.min(props.isMobile ? 2.0 : 2.5, window.devicePixelRatio || 1), [props.isMobile]);

    const {
        rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
        camera, isDarkMode, isMobile, isLandscape, imagesRef, characterName,
        playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
        preloadedCoordsRef, spatialIndexRef, exploredRef, exploredMarkers, renderVersion,
        unveilMap, treatMapAsExplored, viewZ, firstExploredAtRef, preMoveRef, walkTargetId, walkPath,
        baseMapExitsRef, triggerRender, clientPredictionsRef, groupMembers, serverIdIndexRef,
        roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor, targetName,
        opponentName, opponentId, inCombat, activeInlineEntityId, selectedObjectIds, deathRoomId, heldButton,
        activeMapFilter, mapSearchQuery, mapTileOpacity, lighting,
        regionLabels, regionLabelEditMode, selectedRegionLabelId
    } = props;

    const zoneFilters = useSettingsStore(state => state.zoneFilters);
    const mapTileVisuals = useSettingsStore(state => state.mapTileVisuals);
    const weather = useVitalsStore(state => state.weather);

    // Zone filters are drawn directly onto elements in the canvas rather than using CSS filters

    const { drawMap } = useMapperRenderer({
        rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
        cameraRef: camera, isDarkMode, isMobile, imagesRef, characterName,
        playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
        preloadedCoordsRef, spatialIndexRef, exploredRef, exploredMarkers, renderVersion,
        unveilMap, treatMapAsExplored, viewZ, firstExploredAtRef, walkTargetId, walkPath,
        baseMapExitsRef, triggerRender, clientPredictionsRef, groupMembers, serverIdIndexRef,
        roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, playerColor, npcColor, enemyColor, objectColor, targetColor, targetName,
        opponentName, opponentId, inCombat, activeInlineEntityId, selectedObjectIds, deathRoomId, heldButton,
        activeMapFilter, mapSearchQuery, combatPulsesRef, zoneFilters,
        mapTileVisuals,
        mapTileOpacity,
        lighting,
        weather,
        regionLabels,
        regionLabelEditMode,
        selectedRegionLabelId
    });

    useEffect(() => gmcpBus.on('Game.CombatPulse', pulse => {
        const cutoff = pulse.time - 1200;
        combatPulsesRef.current = [
            ...combatPulsesRef.current.filter(entry => entry.time >= cutoff),
            pulse
        ].slice(-6);
        triggerRender?.();
    }), [triggerRender]);

    const combatAnimationActive = useMemo(() => {
        if (opponentId || opponentName) return true;
        return Object.values(roomChars || {}).some(char => {
            const fighting = char.fighting == null ? '' : String(char.fighting);
            return fighting !== '' && fighting.toLowerCase() !== 'you' && fighting !== 'Someone';
        });
    }, [opponentId, opponentName, roomChars]);

    useMapAnimation({
        drawMap,
        rooms: props.rooms,
        markers: props.markers,
        currentRoomId: props.currentRoomId,
        isDragging: props.isDragging,
        isDraggingRef: props.isDraggingRef,
        renderVersion: props.renderVersion,
        canvasRef,
        camera: props.camera,
        playerPosRef: props.playerPosRef,
        playerTrailRef: props.playerTrailRef,
        getDPR,
        marquee: props.marquee,
        autoCenter: props.autoCenter,
        stableRoomsRef: props.stableRoomsRef,
        stableRoomIdRef: props.stableRoomIdRef,
        stableMarkersRef: props.stableMarkersRef,
        firstExploredAtRef,
        preloadedCoordsRef: props.preloadedCoordsRef,
        preMoveRef,
        walkTargetId: props.walkTargetId,
        walkPath: props.walkPath,
        activeMapFilter: props.activeMapFilter,
        combatAnimationActive,
        isMobile,
        isLandscape
    });

    // Parallax: update when mapper state wakes instead of running a permanent RAF loop.
    useEffect(() => {
        const FACTOR = 0.035;
        const container = canvasRef.current?.closest('.mapper-container') as HTMLElement | null;
        if (!container) return;
        container.style.setProperty('--parallax-x', `${-props.camera.current.x * FACTOR}px`);
        container.style.setProperty('--parallax-y', `${-props.camera.current.y * FACTOR}px`);
    }, [canvasRef, props.camera, props.renderVersion]);

    useEffect(() => {
        const cvs = canvasRef.current;
        const parent = cvs?.parentElement;
        if (!cvs || !parent) return;

        let animationFrameId: number | null = null;

        const handleResize = () => {
            const width = Math.round(parent.clientWidth);
            const height = Math.round(parent.clientHeight);
            if (width === 0 || height === 0) return;
            
            const dpr = getDPR();
            const nextWidth = Math.round(width * dpr);
            const nextHeight = Math.round(height * dpr);
            const widthDelta = Math.abs(cvs.width - nextWidth);
            const heightDelta = Math.abs(cvs.height - nextHeight);
            if (widthDelta === 0 && heightDelta === 0) return;
            if (cvs.width > 0 && cvs.height > 0 && widthDelta < 2 && heightDelta < 2) return;

            cvs.width = nextWidth;
            cvs.height = nextHeight;
            const ctx = cvs.getContext('2d', { alpha: true });
            if (ctx) drawMap(ctx, dpr, width, height, null);
            props.triggerRender?.();
        };

        const ro = new ResizeObserver(() => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(handleResize);
        });
        ro.observe(parent);
        handleResize(); // Initial call

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            ro.disconnect();
        };
    }, [drawMap, getDPR, canvasRef, props.triggerRender]);

    return (
        <canvas
            ref={canvasRef}
            className="map-canvas"
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none',
                cursor: props.isDragging ? 'grabbing' : 'crosshair'
            }}
            onMouseDown={props.onMouseDown}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
            onPointerDown={props.onPointerDown}
            onPointerMove={props.onPointerMove}
            onPointerUp={props.onPointerUp}
        />
    );
}));

MapCanvas.displayName = 'MapCanvas';
