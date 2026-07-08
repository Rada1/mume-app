/**
 * @file drawBackgroundMap.ts
 * @description Renders the stylized vector background map of Middle-earth
 * behind the MUME room grid, including coastlines, rivers, mountains, and labels.
 */

import { MiddleEarthVectors, LabelVector, MapBackgroundVisualAdjustments } from '../mapperTypes';

// --- Types Section ---

export interface BackgroundMapOptions {
    zoom: number;
    dpr: number;
    isDarkMode: boolean;
    isTracingMode: boolean;
    calibration: {
        bgScale: number;
        bgTranslateX: number;
        bgTranslateY: number;
        bgOpacity: number;
    };
    vectors: MiddleEarthVectors;
    activePath?: number[][]; // Currently being traced path
    referenceImage?: HTMLImageElement | null;
    drawLayers?: ('ocean' | 'land' | 'vectors' | 'image')[]; // Control which parts to draw
    visuals?: MapBackgroundVisualAdjustments;
}

const defaultBackgroundVisuals: MapBackgroundVisualAdjustments = {
    opacity: 1,
    brightness: 0.18,
    saturation: 1,
    grayscale: 0.7,
    contrast: 1,
    hue: 0,
    blurMin: 2,
    blurMax: 30,
    blurScale: 16,
    tintColor: '#1091a5',
    tintOpacity: 0.46,
};

const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = hex.replace('#', '').trim();
    const fullHex = normalized.length === 3
        ? normalized.split('').map(char => `${char}${char}`).join('')
        : normalized;
    const r = parseInt(fullHex.slice(0, 2), 16);
    const g = parseInt(fullHex.slice(2, 4), 16);
    const b = parseInt(fullHex.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return `rgba(16, 145, 165, ${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// --- Logic Section: Mountain Chevron Drawing ---

/**
 * Draws a single mountain peak (shaded chevron)
 */
function drawMountainPeak(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    isDarkMode: boolean
): void {
    const leftX = cx - w / 2;
    const rightX = cx + w / 2;
    const bottomY = cy + h / 2;
    const topY = cy - h / 2;

    // Left slope (lighter shading)
    ctx.fillStyle = isDarkMode ? 'rgba(75, 85, 99, 0.6)' : 'rgba(209, 213, 219, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(leftX, bottomY);
    ctx.lineTo(cx, bottomY);
    ctx.closePath();
    ctx.fill();

    // Right slope (darker shading)
    ctx.fillStyle = isDarkMode ? 'rgba(55, 65, 81, 0.6)' : 'rgba(156, 163, 175, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx, bottomY);
    ctx.lineTo(rightX, bottomY);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = isDarkMode ? 'rgba(156, 163, 175, 0.5)' : 'rgba(75, 85, 99, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, bottomY);
    ctx.lineTo(cx, topY);
    ctx.lineTo(rightX, bottomY);
    ctx.stroke();
}

/**
 * Draws a repeating mountain chain along a coordinate path
 */
function drawMountainPath(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 2) return;

    let carry = 0;
    const step = 25; // placement interval in background pixel coordinates

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.hypot(dx, dy);
        if (len === 0) continue;

        const ux = dx / len;
        const uy = dy / len;

        let dist = carry;
        while (dist < len) {
            const px = p1[0] + ux * dist;
            const py = p1[1] + uy * dist;
            const mPt = transform(px, py);

            // Mountain size in MUME grid space
            const w = 15;
            const h = 12;
            drawMountainPeak(ctx, mPt.x, mPt.y, w, h, isDarkMode);
            dist += step;
        }
        carry = dist - len;
    }
}

// --- Logic Section: Other Vector Features ---

function drawCoastline(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 2) return;

    ctx.beginPath();
    const first = transform(path[0][0], path[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
        const pt = transform(path[i][0], path[i][1]);
        ctx.lineTo(pt.x, pt.y);
    }

    // Ripple 2 (Outer wave, very faint)
    ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.04)' : 'rgba(30, 58, 138, 0.02)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Ripple 1 (Middle wave)
    ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(30, 58, 138, 0.06)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Main Coastline
    ctx.strokeStyle = isDarkMode ? 'rgba(96, 165, 250, 0.28)' : 'rgba(30, 58, 138, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawRiver(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 2) return;

    ctx.beginPath();
    const first = transform(path[0][0], path[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
        const pt = transform(path[i][0], path[i][1]);
        ctx.lineTo(pt.x, pt.y);
    }

    ctx.strokeStyle = isDarkMode ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.15)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
}

function fillLandPolygon(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 3) return;

    ctx.beginPath();
    const first = transform(path[0][0], path[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
        const pt = transform(path[i][0], path[i][1]);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    ctx.fillStyle = isDarkMode ? '#171e2e' : '#f3f4f6'; // dark slate-gray (dark) / warm parchment/light gray (light)
    ctx.fill();
}

function fillForest(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 3) return;

    ctx.beginPath();
    const first = transform(path[0][0], path[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
        const pt = transform(path[i][0], path[i][1]);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    ctx.fillStyle = isDarkMode ? 'rgba(16, 185, 129, 0.03)' : 'rgba(4, 120, 87, 0.05)';
    ctx.fill();
}

function strokeForest(
    ctx: CanvasRenderingContext2D,
    path: number[][],
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    if (path.length < 3) return;

    ctx.beginPath();
    const first = transform(path[0][0], path[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.length; i++) {
        const pt = transform(path[i][0], path[i][1]);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();

    ctx.strokeStyle = isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(4, 120, 87, 0.20)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    label: LabelVector,
    transform: (x: number, y: number) => { x: number; y: number },
    isDarkMode: boolean
): void {
    const pt = transform(label.x, label.y);
    const size = label.size || 14;

    ctx.font = `italic bold ${size}px "Cinzel", "Georgia", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow glow
    ctx.strokeStyle = isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(label.text, pt.x, pt.y);

    ctx.fillStyle = isDarkMode ? 'rgba(209, 213, 219, 0.55)' : 'rgba(55, 65, 81, 0.65)';
    ctx.fillText(label.text, pt.x, pt.y);
}

// --- Logic Section: Main Background Map Renderer ---

/**
 * Main draw call for background map and/or reference image
 */
export function drawBackgroundMap(
    ctx: CanvasRenderingContext2D,
    options: BackgroundMapOptions
): void {
    const { zoom, isDarkMode, isTracingMode, calibration, vectors, activePath, referenceImage, drawLayers = ['ocean', 'land', 'vectors'] } = options;
    const visuals = { ...defaultBackgroundVisuals, ...(options.visuals || {}) };
    const { bgScale, bgTranslateX, bgTranslateY, bgOpacity } = calibration;

    // Coordinate projection helper
    const transform = (px: number, py: number) => {
        return {
            x: px * bgScale + bgTranslateX,
            y: py * bgScale + bgTranslateY
        };
    };

    ctx.save();

    // 1. Draw Ocean Background
    if (drawLayers.includes('ocean')) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = isDarkMode ? '#0b0f19' : '#e0e7ff'; // deep dark blue-gray (dark) / soft indigo (light)
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    // 2. Draw Land mass (filled coastline loops & forests)
    if (drawLayers.includes('land')) {
        ctx.save();
        if (vectors.coastlines) {
            for (const coastline of vectors.coastlines) {
                fillLandPolygon(ctx, coastline, transform, isDarkMode);
            }
        }
        if (vectors.forests) {
            for (const forest of vectors.forests) {
                fillForest(ctx, forest, transform, isDarkMode);
            }
        }
        ctx.restore();
    }

    // 3. Draw Reference Image
    if (drawLayers.includes('image') && referenceImage) {
        ctx.save();
        if (!isTracingMode) {
            // Apply a desaturating and dimming filter so it sits quietly in play mode
            ctx.filter = isDarkMode
                ? `hue-rotate(${visuals.hue}deg) saturate(${visuals.saturation * 100}%) grayscale(${visuals.grayscale * 100}%) brightness(${visuals.brightness * 100}%) contrast(${visuals.contrast * 100}%)`
                : `grayscale(100%) brightness(105%) contrast(95%)`;
            ctx.globalAlpha = bgOpacity * visuals.opacity; // full calibrated opacity in play mode
        } else {
            ctx.globalAlpha = bgOpacity;
        }
        
        // Translate context to project image into MUME grid space
        ctx.translate(bgTranslateX, bgTranslateY);
        ctx.scale(bgScale, bgScale);
        ctx.drawImage(referenceImage, 0, 0);

        if (!isTracingMode && isDarkMode) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = hexToRgba(visuals.tintColor, visuals.tintOpacity);
            ctx.fillRect(0, 0, referenceImage.width, referenceImage.height);
            ctx.globalCompositeOperation = 'source-over';
        }
        ctx.restore();
    }

    // 4. Draw Vector Layers (Coastline outlines, rivers, forest borders, mountains, labels)
    if (drawLayers.includes('vectors')) {
        ctx.save();
        // Scale global vector opacity with zoom (fade out when zoomed in, full when zoomed out)
        const fadeOpacity = zoom <= 0.2 ? 1.0 : zoom >= 0.8 ? 0.15 : 1.0 - ((zoom - 0.2) / 0.6) * 0.85;
        ctx.globalAlpha = fadeOpacity;

        // Forests
        if (vectors.forests) {
            for (const forest of vectors.forests) {
                strokeForest(ctx, forest, transform, isDarkMode);
            }
        }

        // Rivers
        if (vectors.rivers) {
            for (const river of vectors.rivers) {
                drawRiver(ctx, river, transform, isDarkMode);
            }
        }

        // Coastlines
        if (vectors.coastlines) {
            for (const coastline of vectors.coastlines) {
                drawCoastline(ctx, coastline, transform, isDarkMode);
            }
        }

        // Mountains (draw on top of coastlines/rivers)
        if (vectors.mountains) {
            for (const mountain of vectors.mountains) {
                drawMountainPath(ctx, mountain, transform, isDarkMode);
            }
        }

        // Text Labels (draw on top of shapes)
        if (vectors.labels) {
            for (const label of vectors.labels) {
                drawLabel(ctx, label, transform, isDarkMode);
            }
        }
        ctx.restore();
    }

    // 5. Draw Active Path being Traced (for feedback in Tracing HUD)
    if (isTracingMode && activePath && activePath.length > 0) {
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#ef4444'; // bright red
        ctx.fillStyle = '#ef4444';
        ctx.lineWidth = 2;

        ctx.beginPath();
        const first = transform(activePath[0][0], activePath[0][1]);
        ctx.moveTo(first.x, first.y);
        ctx.arc(first.x, first.y, 4, 0, 2 * Math.PI);

        for (let i = 1; i < activePath.length; i++) {
            const pt = transform(activePath[i][0], activePath[i][1]);
            ctx.lineTo(pt.x, pt.y);
            ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
        }
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}
