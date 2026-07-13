/**
 * @file drawNewMapArt.ts
 * @description Modern, minimalist topographic legend-style vector icon renderer for the mapper.
 * Renders terrain icons centered in each tile.
 */

// --- Logic Section ---

import { getClientThemeColor } from '../mapperUtils';

/**
 * Procedurally draws a single, centered, minimalist vector icon representing the terrain.
 * Uses the new-art palette with consistent centered placement.
 */
export const drawNewArtTerrainIcon = (
    ictx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    s: number,
    tName: string,
    variant: number,
    isDarkMode: boolean,
    weather?: string,
    connects: number = 0,
    floorColor?: string,
    walls?: { n: boolean; s: boolean; e: boolean; w: boolean }
): void => {
    ictx.save();

    // Use the same theme color as the log text for all new-art terrain ink.
    const terrainInk = getClientThemeColor('--text-primary', isDarkMode ? '#d4cdb8' : '#2f2a20');
    const withAlpha = (alpha: number): string => {
        const match = terrainInk.match(/^#([0-9a-f]{6})$/i);
        if (!match) return terrainInk;
        const value = match[1];
        const r = parseInt(value.slice(0, 2), 16);
        const g = parseInt(value.slice(2, 4), 16);
        const b = parseInt(value.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const strokeColor = withAlpha(0.85);
    const shadowFill = withAlpha(0.12);
    const caveEntranceFill = withAlpha(0.95);

    ictx.strokeStyle = strokeColor;
    ictx.lineWidth = 1.35; // Slightly thicker stroke for high visibility
    ictx.lineCap = 'round';
    ictx.lineJoin = 'round';

    const cX = s / 2;
    const cY = s / 2;
    const size = s * 0.55; // Standard bounding box size for icons

    if (tName === 'Mountains') {
        // Shaded Mountain Group matching the reference image style
        
        // Ground base loop/ellipse
        ictx.beginPath();
        ictx.ellipse(cX, cY + size * 0.38, size * 0.72, size * 0.16, 0, 0, Math.PI * 2);
        ictx.fillStyle = withAlpha(0.05);
        ictx.fill();
        ictx.stroke();

        // Helper to draw a rugged shaded peak with a left (light) and right (dark) facet
        const drawMountainPeak = (
            apexX: number, apexY: number,
            leftX: number, leftY: number,
            rightX: number, rightY: number,
            ridgeX: number, ridgeY: number,
            midRidgeX: number, midRidgeY: number
        ) => {
            // Right (shadow) facet
            ictx.beginPath();
            ictx.moveTo(apexX, apexY);
            ictx.lineTo(midRidgeX, midRidgeY);
            ictx.lineTo(ridgeX, ridgeY);
            ictx.lineTo(rightX, rightY);
            ictx.closePath();
            ictx.fillStyle = withAlpha(0.38);
            ictx.fill();
            ictx.stroke();

            // Left (light) facet
            ictx.beginPath();
            ictx.moveTo(apexX, apexY);
            ictx.lineTo(leftX, leftY);
            ictx.lineTo(ridgeX, ridgeY);
            ictx.lineTo(midRidgeX, midRidgeY);
            ictx.closePath();
            ictx.fillStyle = withAlpha(0.15);
            ictx.fill();
            ictx.stroke();
        };

        // 1. Small Left Peak (background layer)
        drawMountainPeak(
            cX - size * 0.45, cY + size * 0.08,
            cX - size * 0.65, cY + size * 0.35,
            cX - size * 0.22, cY + size * 0.35,
            cX - size * 0.38, cY + size * 0.35,
            cX - size * 0.42, cY + size * 0.22
        );

        // 2. Main Center-Left Peak (middle background layer)
        drawMountainPeak(
            cX - size * 0.05, cY - size * 0.48,
            cX - size * 0.55, cY + size * 0.35,
            cX + size * 0.38, cY + size * 0.35,
            cX + size * 0.02, cY + size * 0.35,
            cX - size * 0.02, cY - size * 0.1
        );

        // 3. Foreground Right Peak (foreground layer)
        drawMountainPeak(
            cX + size * 0.32, cY - size * 0.12,
            cX - size * 0.1, cY + size * 0.35,
            cX + size * 0.65, cY + size * 0.35,
            cX + size * 0.4, cY + size * 0.35,
            cX + size * 0.34, cY + size * 0.1
        );

        // 4. Tiny conifer tree helpers on the ground base
        const drawMiniConifer = (tx: number, ty: number, h: number) => {
            const w = h * 0.5;
            ictx.beginPath();
            ictx.moveTo(tx, ty - h);
            ictx.lineTo(tx - w / 2, ty);
            ictx.lineTo(tx + w / 2, ty);
            ictx.closePath();
            ictx.fillStyle = withAlpha(0.65);
            ictx.fill();
            ictx.stroke();
        };

        drawMiniConifer(cX - size * 0.35, cY + size * 0.34, size * 0.18);
        drawMiniConifer(cX - size * 0.24, cY + size * 0.36, size * 0.15);
        drawMiniConifer(cX + size * 0.14, cY + size * 0.42, size * 0.18);
        drawMiniConifer(cX + size * 0.52, cY + size * 0.32, size * 0.16);
        drawMiniConifer(cX + size * 0.62, cY + size * 0.35, size * 0.20);

    } else if (tName === 'Forest') {
        // Single centered conifer, matching the mountain icon's dark outlined vector style.
        const treeSize = size * 0.82;
        const treeBaseY = cY + treeSize * 0.38;
        const treeTopY = cY - treeSize * 0.42;
        const treeWidth = treeSize * 0.62;

        ictx.beginPath();
        ictx.moveTo(cX, treeTopY);
        ictx.lineTo(cX - treeWidth * 0.34, cY - treeSize * 0.08);
        ictx.lineTo(cX - treeWidth * 0.18, cY - treeSize * 0.08);
        ictx.lineTo(cX - treeWidth * 0.48, cY + treeSize * 0.20);
        ictx.lineTo(cX - treeWidth * 0.22, cY + treeSize * 0.20);
        ictx.lineTo(cX - treeWidth * 0.60, treeBaseY);
        ictx.lineTo(cX + treeWidth * 0.60, treeBaseY);
        ictx.lineTo(cX + treeWidth * 0.22, cY + treeSize * 0.20);
        ictx.lineTo(cX + treeWidth * 0.48, cY + treeSize * 0.20);
        ictx.lineTo(cX + treeWidth * 0.18, cY - treeSize * 0.08);
        ictx.lineTo(cX + treeWidth * 0.34, cY - treeSize * 0.08);
        ictx.closePath();
        ictx.fillStyle = withAlpha(0.12);
        ictx.fill();
        ictx.stroke();

        ictx.beginPath();
        ictx.moveTo(cX, treeBaseY);
        ictx.lineTo(cX, treeBaseY + treeSize * 0.10);
        ictx.stroke();

    } else if (tName === 'Hills') {
        // Layered rolling hills, drawn as a compact topographic silhouette.
        const baseY = cY + size * 0.38;
        const drawHill = (offsetX: number, peakY: number, width: number, alpha: number) => {
            const leftX = cX + offsetX - width / 2;
            const rightX = cX + offsetX + width / 2;
            const shoulderY = cY + size * 0.23;

            ictx.beginPath();
            ictx.moveTo(leftX, baseY);
            ictx.quadraticCurveTo(leftX + width * 0.27, shoulderY, cX + offsetX, peakY);
            ictx.quadraticCurveTo(rightX - width * 0.27, shoulderY, rightX, baseY);
            ictx.lineTo(rightX, baseY + size * 0.08);
            ictx.lineTo(leftX, baseY + size * 0.08);
            ictx.closePath();
            ictx.fillStyle = withAlpha(alpha);
            ictx.fill();
            ictx.stroke();
        };

        drawHill(-size * 0.22, cY - size * 0.05, size * 0.62, 0.13);
        drawHill(size * 0.20, cY - size * 0.25, size * 0.72, 0.20);

        ictx.strokeStyle = withAlpha(0.6);
        ictx.lineWidth = 1;
        ictx.beginPath();
        ictx.moveTo(cX - size * 0.46, baseY + size * 0.08);
        ictx.quadraticCurveTo(cX, baseY + size * 0.02, cX + size * 0.46, baseY + size * 0.08);
        ictx.stroke();

    } else if (tName === 'Field' || tName === 'Grasslands' || tName === 'Road') {
        // Simple scattered grass ticks across the entire tile
        ictx.save();
        ictx.strokeStyle = withAlpha(0.48);
        ictx.lineWidth = 1.25;
        ictx.lineCap = 'round';

        // Draw 6 scattered 2-blade grass tufts
        const bladeCount = (tName === 'Field' || tName === 'Grasslands') ? 1 : 6;
        const isCenteredFieldIcon = bladeCount === 1;
        for (let i = 0; i < bladeCount; i++) {
            // Pseudo-random deterministic placement based on variant and index
            const s1 = isCenteredFieldIcon ? 0.5 : Math.abs(Math.sin((i + variant * 3.7) * 113.1) * 43758.5453) % 1;
            const s2 = isCenteredFieldIcon ? 0.5 : Math.abs(Math.sin((i + variant * 3.7) * 271.3 + 1.1) * 43758.5453) % 1;
            const s3 = Math.abs(Math.sin((i + variant * 3.7) * 157.9 + 2.3) * 43758.5453) % 1;

            const bx = s1 * s;
            const h = isCenteredFieldIcon
                ? 8 + s3 * 6
                : 2.5 + s3 * 2.5; // field blade height between 8 and 14
            const by = isCenteredFieldIcon ? cY + h * 0.35 : s2 * s;

            // Draw a small 2-blade grass tuft
            ictx.beginPath();
            // Left blade
            ictx.moveTo(bx, by);
            ictx.lineTo(bx - h * 0.25, by - h);
            // Right blade
            ictx.moveTo(bx, by);
            ictx.lineTo(bx + h * 0.3, by - h * 0.75);
            ictx.stroke();
        }
        ictx.restore();

    } else if (tName === 'Brush') {
        // Layered leafy bush silhouette with a grounded base.
        const bushY = cY + size * 0.18;
        const lobe = (x: number, y: number, radius: number, alpha: number) => {
            ictx.beginPath();
            ictx.arc(x, y, radius, Math.PI, Math.PI * 2);
            ictx.lineTo(x + radius * 0.82, bushY + radius * 0.55);
            ictx.lineTo(x - radius * 0.82, bushY + radius * 0.55);
            ictx.closePath();
            ictx.fillStyle = withAlpha(alpha);
            ictx.fill();
            ictx.stroke();
        };

        lobe(cX - size * 0.27, bushY, size * 0.20, 0.12);
        lobe(cX, bushY - size * 0.13, size * 0.26, 0.20);
        lobe(cX + size * 0.27, bushY, size * 0.20, 0.14);

        ictx.beginPath();
        ictx.moveTo(cX - size * 0.48, bushY + size * 0.18);
        ictx.quadraticCurveTo(cX, bushY + size * 0.28, cX + size * 0.48, bushY + size * 0.18);
        ictx.stroke();

    } else if (tName === 'City') {
        // Clean single castle keep / tower symbol
        const w = size * 0.5;
        const h = size * 0.75;
        const topY = cY - h * 0.5;
        const bottomY = cY + h * 0.5;
        const leftX = cX - w * 0.5;
        const rightX = cX + w * 0.5;

        // Base rectangle
        ictx.beginPath();
        ictx.moveTo(leftX, bottomY);
        ictx.lineTo(leftX, topY);
        // Crenellations on top
        ictx.lineTo(leftX + w * 0.25, topY);
        ictx.lineTo(leftX + w * 0.25, topY + h * 0.12);
        ictx.lineTo(leftX + w * 0.5, topY + h * 0.12);
        ictx.lineTo(leftX + w * 0.5, topY);
        ictx.lineTo(leftX + w * 0.75, topY);
        ictx.lineTo(leftX + w * 0.75, topY + h * 0.12);
        ictx.lineTo(rightX, topY + h * 0.12);
        ictx.lineTo(rightX, topY);
        ictx.lineTo(rightX, bottomY);
        ictx.closePath();

        ictx.fillStyle = shadowFill;
        ictx.fill();
        ictx.stroke();

        // Arrow slit window in the center
        ictx.beginPath();
        ictx.moveTo(cX, cY - h * 0.15);
        ictx.lineTo(cX, cY + h * 0.1);
        ictx.stroke();

    } else if (tName === 'Water' || tName === 'Rapids' || tName === 'Underwater' || tName === 'Shallows') {
        // Double parallel water wave symbol
        const len = size * 0.85;
        const wX = cX - len / 2;

        const drawWaveLine = (yOffset: number) => {
            ictx.beginPath();
            for (let x = 0; x <= len; x += 1.5) {
                const angle = (x / len) * Math.PI * 2.5;
                const y = yOffset + Math.sin(angle) * (size * 0.08);
                if (x === 0) ictx.moveTo(wX + x, y);
                else ictx.lineTo(wX + x, y);
            }
            ictx.stroke();
        };

        drawWaveLine(cY - size * 0.18);
        drawWaveLine(cY + size * 0.18);

    } else if (tName === 'Cavern' || tName === 'Tunnel') {
        // Clean archway representing a cavern / tunnel entrance
        const w = size * 0.65;
        const bottomY = cY + size * 0.35;
        const archTopY = cY - size * 0.05;
        const leftX = cX - w * 0.5;
        const rightX = cX + w * 0.5;

        ictx.beginPath();
        ictx.moveTo(leftX, bottomY);
        ictx.lineTo(leftX, archTopY);
        // Arc for the ceiling
        ictx.arc(cX, archTopY, size * 0.3, Math.PI, 0);
        ictx.lineTo(rightX, bottomY);
        ictx.closePath();

        // Dark filled cave entrance
        ictx.fillStyle = caveEntranceFill;
        ictx.fill();
        ictx.stroke();

    } else if (tName === 'Building') {
        // Clean single house outline symbol
        const bottomY = cY + size * 0.35;
        const roofBaseY = cY;
        const topY = cY - size * 0.35;
        const leftX = cX - size * 0.28;
        const rightX = cX + size * 0.28;
        const w = rightX - leftX;

        // House body
        ictx.beginPath();
        ictx.rect(leftX, roofBaseY, w, bottomY - roofBaseY);
        ictx.fillStyle = shadowFill;
        ictx.fill();
        ictx.stroke();

        // Triangular roof
        ictx.beginPath();
        ictx.moveTo(leftX, roofBaseY);
        ictx.lineTo(cX, topY);
        ictx.lineTo(rightX, roofBaseY);
        ictx.closePath();
        ictx.stroke();

    } else {
        // Utilitarian fallback: a clean centered diamond point
        ictx.beginPath();
        ictx.moveTo(cX, cY - size * 0.25);
        ictx.lineTo(cX + size * 0.25, cY);
        ictx.lineTo(cX, cY + size * 0.25);
        ictx.lineTo(cX - size * 0.25, cY);
        ictx.closePath();
        ictx.fillStyle = shadowFill;
        ictx.fill();
        ictx.stroke();
    }

    ictx.restore();
};
