/**
 * @file ShaperCanvasGeometry.ts
 * @description Geometry helpers for Shaper canvas room and exit rendering.
 */

import { SHAPER_CELL, SHAPER_GUTTER, SHAPER_TILE } from '../hooks/useShaperCanvasView';
import type { ShaperDirection, ShaperRoomId } from '../model/shaperTypes';

// --- Types Section ---
export interface ShaperPoint {
    x: number;
    y: number;
}

export interface ShaperConnectionMenuState {
    screenX: number;
    screenY: number;
    aId: ShaperRoomId;
    bId: ShaperRoomId;
    dirAB: ShaperDirection;
    dirBA: ShaperDirection;
}

export interface ShaperConnectionDragState {
    sourceRoomId: ShaperRoomId;
    sourceDir: ShaperDirection;
    currentPos: ShaperPoint | null;
    hoveredTarget: { roomId: ShaperRoomId; dir: ShaperDirection } | null;
}

export interface ShaperRoomMenuState {
    screenX: number;
    screenY: number;
    cellX: number;
    cellY: number;
    roomId: ShaperRoomId | null;
}

// --- Geometry Section ---
export const getNodePosition = (x: number, y: number, dir: ShaperDirection): ShaperPoint => {
    const rx = x * SHAPER_CELL + SHAPER_GUTTER;
    const ry = y * SHAPER_CELL + SHAPER_GUTTER;
    switch (dir) {
        case 'n': return { x: rx + SHAPER_TILE / 2, y: ry };
        case 's': return { x: rx + SHAPER_TILE / 2, y: ry + SHAPER_TILE };
        case 'e': return { x: rx + SHAPER_TILE, y: ry + SHAPER_TILE / 2 };
        case 'w': return { x: rx, y: ry + SHAPER_TILE / 2 };
        case 'u': return { x: rx + 20, y: ry + 20 };
        case 'd': return { x: rx + SHAPER_TILE - 20, y: ry + SHAPER_TILE - 20 };
    }
};

export const getOppositeDirection = (dir: ShaperDirection): ShaperDirection => {
    switch (dir) {
        case 'n': return 's';
        case 's': return 'n';
        case 'e': return 'w';
        case 'w': return 'e';
        case 'u': return 'd';
        case 'd': return 'u';
    }
};

export const getOffsetPoints = (
    posA: ShaperPoint,
    posB: ShaperPoint,
    offsetDist: number
): { x1: number; y1: number; x2: number; y2: number } => {
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return { x1: posA.x, y1: posA.y, x2: posB.x, y2: posB.y };
    const px = -dy / len;
    const py = dx / len;
    return {
        x1: posA.x + px * offsetDist,
        y1: posA.y + py * offsetDist,
        x2: posB.x + px * offsetDist,
        y2: posB.y + py * offsetDist
    };
};

export const formatLayer = (z: number): string => {
    if (z === 0) return 'Surface';
    if (z > 0) return `Above +${z}`;
    return `Below ${z}`;
};
