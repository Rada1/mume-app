/**
 * @file Draws far-zoom location beacons on the mapper canvas (player + group members).
 */
import { GRID_SIZE } from '../mapperUtils';
import type { RenderContext } from './rendererUtils';

type RoomAnchor = { x: number, y: number, z: number };

export interface PlayerBeaconMetrics {
    visibility: number;
    outerRadius: number;
    innerRadius: number;
    lineWidth: number;
}

const BEACON_START_ZOOM = 0.34;
const BEACON_FULL_ZOOM = 0.16;
const DEFAULT_PLAYER_BEACON_COLOR = '#7dd3fc';
const GROUP_BEACON_COLOR = '#22c55e';
const GROUP_BEACON_SIZE_SCALE = 0.72;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const colorWithAlpha = (color: string, alpha: number) => {
    const hex = color.match(/^#([0-9a-f]{6})$/i);
    if (hex) {
        const value = hex[1];
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;

    return color;
};

// Cached beacon glow rendered to an offscreen canvas at a reference radius.
// Scaled via drawImage; one cache entry per color.
const BEACON_GLOW_REF_RADIUS = 128;
const beaconGlowCache = new Map<string, HTMLCanvasElement>();

const getBeaconGlowCanvas = (color: string): HTMLCanvasElement | null => {
    const cached = beaconGlowCache.get(color);
    if (cached) return cached;
    if (typeof document === 'undefined') return null;
    const size = BEACON_GLOW_REF_RADIUS * 2;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const oc = off.getContext('2d');
    if (!oc) return null;
    const cx = BEACON_GLOW_REF_RADIUS;
    const cy = BEACON_GLOW_REF_RADIUS;
    const innerR = BEACON_GLOW_REF_RADIUS * 0.18;
    const grad = oc.createRadialGradient(cx, cy, innerR, cx, cy, BEACON_GLOW_REF_RADIUS);
    grad.addColorStop(0, colorWithAlpha(color, 0.95));
    grad.addColorStop(0.28, colorWithAlpha(color, 0.55));
    grad.addColorStop(1, colorWithAlpha(color, 0));
    oc.fillStyle = grad;
    oc.beginPath();
    oc.arc(cx, cy, BEACON_GLOW_REF_RADIUS, 0, Math.PI * 2);
    oc.fill();
    beaconGlowCache.set(color, off);
    return off;
};

// --- Logic Section ---
export const getPlayerBeaconMetrics = (zoom: number, now: number, sizeScale = 1): PlayerBeaconMetrics | null => {
    if (zoom >= BEACON_START_ZOOM) return null;

    const visibility = clamp((BEACON_START_ZOOM - zoom) / (BEACON_START_ZOOM - BEACON_FULL_ZOOM), 0, 1);
    const pulse = (Math.sin(now / 420) + 1) / 2;
    const outerScreenRadius = (20 + visibility * 18 + pulse * 8) * sizeScale;
    const innerScreenRadius = (6 + visibility * 3) * sizeScale;

    return {
        visibility,
        outerRadius: outerScreenRadius / zoom,
        innerRadius: innerScreenRadius / zoom,
        lineWidth: (1.7 * sizeScale) / zoom
    };
};

// --- Render Section ---
interface ZoomBeaconOptions {
    color?: string;
    sizeScale?: number;
}

export const drawZoomBeacon = (
    rCtx: RenderContext,
    anchor: RoomAnchor,
    floorAlpha: number,
    options: ZoomBeaconOptions = {}
) => {
    const sizeScale = options.sizeScale ?? 1;
    const metrics = getPlayerBeaconMetrics(rCtx.camera.zoom, rCtx.now, sizeScale);
    if (!metrics) return;

    const { ctx, camera, now, triggerRender } = rCtx;
    const px = anchor.x * GRID_SIZE + GRID_SIZE / 2;
    const py = anchor.y * GRID_SIZE + GRID_SIZE / 2;
    const alpha = floorAlpha * (0.28 + metrics.visibility * 0.72);
    const color = options.color || rCtx.playerColor || DEFAULT_PLAYER_BEACON_COLOR;
    const pulse = (Math.sin(now / 420) + 1) / 2;
    const rayLength = metrics.outerRadius * (0.78 + pulse * 0.12);
    const tickRadius = metrics.outerRadius * 0.58;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;

    const glowCanvas = getBeaconGlowCanvas(color);
    if (glowCanvas) {
        const r = metrics.outerRadius;
        ctx.drawImage(glowCanvas, px - r, py - r, r * 2, r * 2);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = metrics.lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = (18 * sizeScale) / camera.zoom;
    ctx.beginPath();
    ctx.arc(px, py, tickRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - rayLength, py);
    ctx.lineTo(px - metrics.innerRadius * 1.5, py);
    ctx.moveTo(px + metrics.innerRadius * 1.5, py);
    ctx.lineTo(px + rayLength, py);
    ctx.moveTo(px, py - rayLength);
    ctx.lineTo(px, py - metrics.innerRadius * 1.5);
    ctx.moveTo(px, py + metrics.innerRadius * 1.5);
    ctx.lineTo(px, py + rayLength);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = (10 * sizeScale) / camera.zoom;
    ctx.beginPath();
    ctx.arc(px, py, metrics.innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    triggerRender?.();
};

export const drawPlayerZoomBeacon = (
    rCtx: RenderContext,
    anchor: RoomAnchor,
    floorAlpha: number
) => drawZoomBeacon(rCtx, anchor, floorAlpha);

export const drawGroupMemberZoomBeacon = (
    rCtx: RenderContext,
    anchor: RoomAnchor,
    floorAlpha: number
) => drawZoomBeacon(rCtx, anchor, floorAlpha, { color: GROUP_BEACON_COLOR, sizeScale: GROUP_BEACON_SIZE_SCALE });
