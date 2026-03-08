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
    unveilMap?: boolean;
    allRooms: Record<string, any>;
    roomAtCoord: Record<string, any>;
    visitedAtCoord: Record<string, boolean>;
    preloaded: Record<string, any>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    selectedRoomIds: Set<string>;
    activeId: string | null;
}

export const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

export const drawLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, thickness: number, dpr: number, invZoom: number, dashed = false) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = (thickness / dpr) * invZoom;
    if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
};

import { GRID_SIZE } from '../mapperUtils';
export const getRoomAnchor = (rx: number, ry: number) => {
    const sX = getSeed(Math.round(rx), Math.round(ry)), sY = getSeed(Math.round(ry), Math.round(rx));
    const j = GRID_SIZE * 0.22; // 22% jitter
    return { x: Math.round(rx) * GRID_SIZE + GRID_SIZE / 2 + (sX - 0.5) * j, y: Math.round(ry) * GRID_SIZE + GRID_SIZE / 2 + (sY - 0.5) * j };
};

export const drawCurvedPath = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, thickness: number, dpr: number, invZoom: number) => {
    const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const seed = getSeed(x1 + x2, y1 + y2), bend = dist * (0.1 + seed * 0.15);
    const cx = (x1 + x2) / 2 + (-dy / dist) * (seed - 0.5) * bend, cy = (y1 + y2) / 2 + (dx / dist) * (seed - 0.5) * bend;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = (thickness / dpr) * invZoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
};
