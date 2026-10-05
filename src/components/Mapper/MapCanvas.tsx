/** @file Renders the map with the worker-backed WebGL canvas. */
import React, { forwardRef } from 'react';
import { CompactMapExit, MapperPrediction } from './mapperTypes';
import type { MoveAnimState } from './playerMoveAnimator';
import { FastMapCanvas } from './performance/FastMapCanvas';
import type { MapData } from './performance/webcockpit/model';
import type { GroupMember } from '../../types';

export interface MapCanvasProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    contextMenuRoomId?: string | null;
    selectedMarkerId: string | null;
    camera: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    isLandscape?: boolean;
    characterName: string | null;
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
    moveAnimRef?: React.MutableRefObject<MoveAnimState>;
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number, startTime?: number }[]>;
    renderVersion: number;
    isDragging: boolean;
    isDraggingRef?: React.RefObject<boolean>;
    marquee: any;
    autoCenter?: boolean;
    stableRoomsRef: React.MutableRefObject<Record<string, any>>;
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableMarkersRef: React.MutableRefObject<Record<string, any>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, CompactMapExit>, string, string, string[], string[]]>>;
    performanceMapRef?: React.MutableRefObject<MapData | null>;
    performanceMapRevision?: number;
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
    entitiesRef: React.MutableRefObject<any>;
    groupMembers?: GroupMember[];
    serverIdIndexRef?: React.MutableRefObject<Record<string, string>>;
    inlineCategories?: import('../../types').InlineCategoryConfig[];
    playerColor?: string;
    npcColor?: string;
    enemyColor?: string;
    objectColor?: string;
    targetColor?: string;
    mapBrightness?: number;
    activeInlineEntityId?: string | null;
    selectedObjectIds?: Set<string>;
    deathRoomId?: string | null;
    heldButton?: any | null;
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    mapTileOpacity?: number;
    mapTileVisuals?: import('./mapperTypes').MapTileVisualAdjustments;
    lighting?: string;
    isImmersionMode?: boolean;
    calibration?: any;
    vectors?: any;
    isTracingMode?: boolean;
    activePath?: any;
    regionLabels?: any;
    selectedRegionLabelId?: string | null;
    joystickActive?: boolean;
    closestRoomId?: string | null;
    filterPathIds?: string[];
    filterPathDistance?: number;
    matchedRoomIds?: Set<string>;
    hoveredSearchRoomId?: string | null;
}

export const MapCanvas = React.memo(forwardRef<HTMLCanvasElement, MapCanvasProps>((props, ref) => {
    return <FastMapCanvas
        ref={ref}
        mapProps={props}
        transparentBackground={props.isImmersionMode === true}
        onFallback={reason => {
            console.error('[Mapper] WebGL renderer failed; Canvas2D fallback is disabled:', reason);
        }}
    />;
}));

MapCanvas.displayName = 'MapCanvas';
