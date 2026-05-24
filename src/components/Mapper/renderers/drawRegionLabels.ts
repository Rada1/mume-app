import { GRID_SIZE } from '../mapperUtils';
import { RegionLabel } from '../mapperTypes';
import { RenderContext } from './rendererUtils';

/**
 * Returns the rendered geometry of a region label in WORLD PIXEL coordinates.
 * Used by both the renderer and hit-test paths so handles line up exactly with what's drawn.
 */
export interface RegionLabelGeometry {
    cx: number; cy: number;       // center in world px
    halfW: number; halfH: number; // half-width / half-height of the padded bounding box (world px)
    fontPx: number;               // font height in world px
    rotation: number;             // radians
    totalWidth: number;           // width of the text itself (no padding) in world px
}

export const getRegionLabelGeometry = (
    label: RegionLabel,
    measureCtx: CanvasRenderingContext2D
): RegionLabelGeometry => {
    const s = GRID_SIZE;
    const cx = label.x * s;
    const cy = label.y * s;
    const fontPx = label.fontSize * s * 0.05;
    const letterSpacing = label.letterSpacing ?? Math.max(2, fontPx * 0.08);

    measureCtx.save();
    measureCtx.font = `${fontPx}px "Aniron", "Cinzel", "Trajan Pro", serif`;
    const text = (label.text || '').toUpperCase();
    const chars = [...text];
    const widths = chars.map(ch => measureCtx.measureText(ch).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + letterSpacing * Math.max(0, chars.length - 1);
    measureCtx.restore();

    const padX = fontPx * 0.2;
    const padY = fontPx * 0.3;
    return {
        cx, cy,
        halfW: totalWidth / 2 + padX,
        halfH: fontPx / 2 + padY,
        fontPx,
        rotation: label.rotation || 0,
        totalWidth
    };
};

/**
 * Renders LOTR-style region labels.
 */
export const drawRegionLabels = (
    rCtx: RenderContext,
    labels: Record<string, RegionLabel>,
    selectedId: string | null = null,
    editMode: boolean = false
) => {
    const { ctx, currentZ, isDarkMode, camera } = rCtx;
    const list = Object.values(labels);
    if (list.length === 0) return;
    if (!editMode && camera.zoom >= 1 / 3) return;

    const s = GRID_SIZE;
    const defaultColor = '#ffffff';
    const defaultOpacity = isDarkMode ? 0.72 : 0.55;

    for (const label of list) {
        if ((label.z ?? 0) !== currentZ) continue;

        const geom = getRegionLabelGeometry(label, ctx);
        const screenPx = geom.fontPx * camera.zoom;
        if (screenPx < 4) continue;

        const color = label.color || defaultColor;
        const opacity = label.opacity ?? defaultOpacity;
        const letterSpacing = label.letterSpacing ?? Math.max(2, geom.fontPx * 0.08);

        ctx.save();
        ctx.translate(geom.cx, geom.cy);
        if (geom.rotation) ctx.rotate(geom.rotation);
        ctx.globalAlpha = opacity;

        ctx.font = `${geom.fontPx}px "Aniron", "Cinzel", "Trajan Pro", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const text = (label.text || '').toUpperCase();
        const chars = [...text];
        const widths = chars.map(ch => ctx.measureText(ch).width);
        let cursor = -geom.totalWidth / 2;

        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = Math.max(4, geom.fontPx * 0.15);
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.lineWidth = Math.max(1.5, geom.fontPx * 0.04);
        ctx.fillStyle = color;

        for (let i = 0; i < chars.length; i++) {
            const charCx = cursor + widths[i] / 2;
            ctx.strokeText(chars[i], charCx, 0);
            ctx.fillText(chars[i], charCx, 0);
            cursor += widths[i] + letterSpacing;
        }

        // Edit-mode chrome: bounding box + resize / rotate handles
        if (editMode) {
            ctx.shadowBlur = 0;
            const isSelected = selectedId === label.id;
            ctx.globalAlpha = isSelected ? 1.0 : 0.45;
            ctx.strokeStyle = isSelected ? '#ffd166' : (isDarkMode ? '#888' : '#444');
            ctx.lineWidth = Math.max(1, geom.fontPx * 0.02);
            ctx.setLineDash([geom.fontPx * 0.15, geom.fontPx * 0.1]);
            ctx.strokeRect(-geom.halfW, -geom.halfH, geom.halfW * 2, geom.halfH * 2);
            ctx.setLineDash([]);

            // Handle sizes — use invZoom so handles stay roughly screen-fixed
            const handleR = Math.max(6, 8 * rCtx.invZoom);
            const rotateOffset = geom.halfH + Math.max(20, 28 * rCtx.invZoom);

            // Connector line to rotation handle
            ctx.strokeStyle = isSelected ? '#ffd166' : (isDarkMode ? '#888' : '#444');
            ctx.lineWidth = Math.max(1, 1.5 * rCtx.invZoom);
            ctx.beginPath();
            ctx.moveTo(0, geom.halfH);
            ctx.lineTo(0, rotateOffset);
            ctx.stroke();

            // Resize handle: bottom-right corner
            ctx.fillStyle = '#4ade80';   // green = resize
            ctx.strokeStyle = '#0a3a18';
            ctx.beginPath();
            ctx.arc(geom.halfW, geom.halfH, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Rotation handle: below center
            ctx.fillStyle = '#60a5fa';   // blue = rotate
            ctx.strokeStyle = '#0a2138';
            ctx.beginPath();
            ctx.arc(0, rotateOffset, handleR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }
};

export type RegionLabelHitMode = 'move' | 'resize' | 'rotate';
export interface RegionLabelHit {
    id: string;
    mode: RegionLabelHitMode;
    geometry: RegionLabelGeometry;
}

/**
 * Hit-test against region labels — handles take precedence over the label body when in edit mode.
 * Input coordinates are world tile units (will be * GRID_SIZE internally).
 * Iterates in reverse so topmost label wins.
 */
export const hitTestRegionLabelFull = (
    labels: Record<string, RegionLabel>,
    worldX: number,
    worldY: number,
    z: number,
    ctxForMeasure: CanvasRenderingContext2D,
    invZoom: number,
    editMode: boolean
): RegionLabelHit | null => {
    const s = GRID_SIZE;
    const px = worldX * s;
    const py = worldY * s;

    const ids = Object.keys(labels);
    for (let i = ids.length - 1; i >= 0; i--) {
        const label = labels[ids[i]];
        if ((label.z ?? 0) !== z) continue;
        const geom = getRegionLabelGeometry(label, ctxForMeasure);
        const { cx, cy, halfW, halfH, fontPx, rotation } = geom;

        // Transform click into label's local (un-rotated) space.
        const dx = px - cx;
        const dy = py - cy;
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        if (editMode) {
            const handleR = Math.max(6, 8 * invZoom);
            const grab = handleR * 1.4; // a bit larger than visual for forgiving touch

            // Resize handle at (halfW, halfH)
            const rx = localX - halfW;
            const ry = localY - halfH;
            if (rx * rx + ry * ry <= grab * grab) {
                return { id: label.id, mode: 'resize', geometry: geom };
            }
            // Rotate handle below at (0, halfH + offset)
            const rotateOffset = halfH + Math.max(20, 28 * invZoom);
            const rrx = localX - 0;
            const rry = localY - rotateOffset;
            if (rrx * rrx + rry * rry <= grab * grab) {
                return { id: label.id, mode: 'rotate', geometry: geom };
            }
        }

        if (localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH) {
            return { id: label.id, mode: 'move', geometry: geom };
        }
    }
    return null;
};

/**
 * Backwards-compatible body-only hit-test that returns just the id.
 */
export const hitTestRegionLabel = (
    labels: Record<string, RegionLabel>,
    worldX: number,
    worldY: number,
    z: number,
    ctxForMeasure: CanvasRenderingContext2D
): string | null => {
    const hit = hitTestRegionLabelFull(labels, worldX, worldY, z, ctxForMeasure, 1, false);
    return hit && hit.mode === 'move' ? hit.id : null;
};
