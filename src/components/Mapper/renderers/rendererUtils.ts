import { MapperPrediction, MapTileVisualAdjustments } from '../mapperTypes';
import { ZoneFilterConfig } from '../zoneFilters';

export interface CombatPulse {
    direction: 'outgoing' | 'incoming';
    time: number;
}

export interface RenderContext {
    ctx: CanvasRenderingContext2D;
    dpr: number;
    canvasWidth: number;
    canvasHeight: number;
    camera: { x: number, y: number, zoom: number };
    isDarkMode: boolean;
    isMobile: boolean;
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>;
    processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>;
    now: number;
    ANIM_DUR: number;
    invZoom: number;
    currentZ: number;
    explored: Set<string>;
    exploredMarkers: Set<string>;
    unveilMap?: boolean;
    treatMapAsExplored?: boolean;
    allRooms: Record<string, any>;
    roomAtCoord: Record<string, any>;
    visitedAtCoord: Record<string, boolean>;
    roomNpcs?: import('../../../types').GmcpOccupant[];
    roomPlayers?: import('../../../types').GmcpOccupant[];
    roomItems?: import('../../../types').GmcpOccupant[];
    roomChars?: Record<number, import('../../../types').GmcpOccupant>;
    centerOverride?: { x: number, y: number, z: number };
    inlineCategories?: import('../../../types').InlineCategoryConfig[];
    playerColor?: string;
    npcColor?: string;
    enemyColor?: string;
    neutralColor?: string;
    objectColor?: string;
    targetColor?: string;
    targetName?: string | null;
    opponentName?: string | null;
    opponentId?: string | null;
    inCombat?: boolean;
    activeInlineEntityId?: string | null;
    selectedObjectIds?: Set<string>;
    preloaded: Record<string, any>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    selectedRoomIds: Set<string>;
    activeId: string | null;
    activeZone?: string | null;
    activeZonePreloaded?: string | null;
    walkTargetId?: string | null;
    walkPath?: string[];
    baseMapExitsRef: React.MutableRefObject<Record<string, any>>;
    triggerRender?: () => void;
    clientPredictionsRef?: React.MutableRefObject<MapperPrediction[]>;
    /** Maps MUME internal server vnum -> local preloaded vnum string (for resolving group member mapid) */
    serverIdIndexRef?: React.MutableRefObject<Record<string, string>>;
    ring1Revealed?: Set<string>;
    ring2Peeked?: Set<string>;
    /** Group members received from GMCP — used to render green friend-orbs on the map */
    groupMembers?: import('../../../types').GroupMember[];
    deathRoomId?: string | null;
    heldButton?: any | null;
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    matchedRoomIds?: Set<string>;
    closestRoomId?: string | null;
    filterPathIds?: string[];
    filterPathDistance?: number;
    combatPulsesRef?: React.MutableRefObject<CombatPulse[]>;
    isTracingMode?: boolean;
    mapTileVisuals?: MapTileVisualAdjustments;
    mapTileOpacity?: number;
    zoneFilters?: Record<string, ZoneFilterConfig>;
    lighting?: string;
    weather?: string;
    isDragging?: boolean;
    lowEffects?: boolean;
    suppressExplorationAnimation?: boolean;
    showTerrainIcons?: boolean;
    showDoorLabels?: boolean;
    isExplorationBaked?: boolean;
    joystickActive?: boolean;
}

export const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

export const drawLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, thickness: number, dpr: number, invZoom: number, dashed = false) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
};

import { GRID_SIZE } from '../mapperUtils';
export const getRoomAnchor = (rx: number, ry: number) => {
    const sX = getSeed(Math.round(rx), Math.round(ry)), sY = getSeed(Math.round(ry), Math.round(rx));
    const j = GRID_SIZE * 0.22; // 22% jitter
    return { x: Math.round(rx) * GRID_SIZE + GRID_SIZE / 2 + (sX - 0.5) * j, y: Math.round(ry) * GRID_SIZE + GRID_SIZE / 2 + (sY - 0.5) * j };
};

export const drawCurvedPath = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, thickness: number, dpr: number, invZoom: number) => {
    drawLine(ctx, x1, y1, x2, y2, color, thickness, dpr, 1.0);
};

export const drawInkyLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, thickness: number, dpr: number, invZoom: number) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6 * invZoom;
    ctx.shadowOffsetX = 1.5 * invZoom;
    ctx.shadowOffsetY = 2.0 * invZoom;
    drawLine(ctx, x1, y1, x2, y2, color, thickness, dpr, 1.0);
    ctx.restore();
};
