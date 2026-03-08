
/**
 * blobTerrainRenderer.ts
 * 
 * Adapted from BlobTerrainLogic.ts to work with CanvasRenderingContext2D.
 */

export interface BlobNeighbors {
    t: boolean;
    b: boolean;
    l: boolean;
    r: boolean;
    tl: boolean;
    tr: boolean;
    bl: boolean;
    br: boolean;
}

export interface BlobOptions {
    sharpCorners?: boolean;
    inset?: number; // Distance from edge (0-50). Default is 20.
    wavy?: boolean; // Whether to weave edges (e.g., for water)
    craggy?: boolean; // Whether to have jagged, uneven edges (e.g., for caverns)
    patchy?: boolean; // Whether to have irregular, "tufted" edges (e.g., for fields)
}

/**
 * Draws a blob-style terrain feature for a single cell on a canvas.
 * 
 * @param ctx The Canvas rendering context.
 * @param x The top-left X coordinate of the cell.
 * @param y The top-left Y coordinate of the cell.
 * @param size The size of the grid cell.
 * @param neighbors Object containing boolean flags for the 8 neighbors.
 * @param color The fill color for the blob.
 * @param options Styling options (e.g., sharpCorners, inset, wavy, craggy, patchy).
 */
export function drawBlobTerrain(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    neighbors: BlobNeighbors,
    color: string,
    options: BlobOptions = {}
) {
    const { t, b, l, r, tl, tr, bl, br } = neighbors;
    const { sharpCorners = false, inset = 20, wavy = false, craggy = false, patchy = false } = options;
    const s = size;
    const scale = s / 100;
    
    const low = inset;
    const high = 100 - inset;
    
    // Correct inner radius MUST match inset to align with neighboring tiles' banks
    // For outer rounding, we use the remaining space
    const innerR = inset;
    const outerR = 50 - inset;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();

    let curX = 50, curY = t ? -0.1 : low;
    const drawM = (tx: number, ty: number) => {
        ctx.moveTo(tx, ty);
        curX = tx; curY = ty;
    };

    const drawL = (tx: number, ty: number, isBank: boolean = false) => {
        if (isBank && (wavy || craggy || patchy)) {
            const dx = tx - curX;
            const dy = ty - curY;
            const len = Math.sqrt(dx * dx + dy * dy);
            
            if (len > 3) {
                const nx = -dy / len;
                const ny = dx / len;

                // Taper the offset near tile boundaries to ensure perfect alignment with neighbors
                // This prevents "pitting" gaps at corners where one room has a neighbor and the other doesn't.
                const boundaryTaper = (px: number, py: number) => {
                    const margin = 5;
                    const tx_dist = Math.min(px, 100 - px);
                    const ty_dist = Math.min(py, 100 - py);
                    const min_dist = Math.min(tx_dist, ty_dist);
                    return Math.min(1, min_dist / margin);
                };

                // Sync texture phase with absolute grid coordinates to eliminate seams between rooms
                const globalX = x / scale + curX;
                const globalY = y / scale + curY;
                const phase = (globalX + globalY) * 0.15;

                const getOffset = (p: number, t: number) => {
                    const mask = boundaryTaper(p * dx + curX, p * dy + curY);
                    if (craggy) {
                        const noise = (Math.sin(t * 0.5) * 2 + Math.cos(t * 1.1) * 1.5);
                        return (4 + noise) * mask;
                    } else if (patchy) {
                        return (6 + Math.sin(t) * 2) * mask;
                    } else {
                        return (3.5 + Math.sin(t) * 1.5) * mask;
                    }
                };

                if (craggy) {
                    ctx.lineTo(curX + dx * 0.2 + nx * getOffset(0.2, phase), curY + dy * 0.2 + ny * getOffset(0.2, phase));
                    ctx.lineTo(curX + dx * 0.5 + nx * getOffset(0.5, phase + 1), curY + dy * 0.5 + ny * getOffset(0.5, phase + 1));
                    ctx.lineTo(curX + dx * 0.8 + nx * getOffset(0.8, phase + 2), curY + dy * 0.8 + ny * getOffset(0.8, phase + 2));
                    ctx.lineTo(tx, ty);
                } else if (patchy) {
                    // High-frequency "bristly" look: many sharp, dense tufts
                    const tufts = Math.max(2, Math.floor(len / 2.5));
                    for (let i = 1; i <= tufts; i++) {
                        const p = i / tufts;
                        const prevP = (i - 1) / tufts;
                        const midP = prevP + (0.5 / tufts);
                        
                        const offset = getOffset(midP, phase + i * 4.7);
                        // Prickly peak
                        ctx.lineTo(curX + dx * midP + nx * offset, curY + dy * midP + ny * offset);
                        // Return to base path
                        ctx.lineTo(curX + dx * p, curY + dy * p);
                    }
                } else {
                    const o1 = getOffset(0.33, phase);
                    const o2 = getOffset(0.67, phase + 1.5);
                    ctx.bezierCurveTo(
                        curX + dx * 0.33 + nx * o1, curY + dy * 0.33 + ny * o1,
                        curX + dx * 0.67 - nx * o2, curY + dy * 0.67 - ny * o2,
                        tx, ty
                    );
                }
            } else {
                ctx.lineTo(tx, ty);
            }
        } else {
            ctx.lineTo(tx, ty);
        }
        curX = tx; curY = ty;
    };

    // Smooth curve approximation (8 segments)
    const drawCorner = (cx: number, cy: number, tx: number, ty: number, isBank: boolean) => {
        if (sharpCorners) {
            drawL(cx, cy, isBank);
            drawL(tx, ty, isBank);
        } else {
            const sx = curX, sy = curY;
            for (let i = 1; i <= 8; i++) {
                const t = i / 8;
                const q = 1 - t;
                // Quadratic bezier approximation
                const px = q * q * sx + 2 * q * t * cx + t * t * tx;
                const py = q * q * sy + 2 * q * t * cy + t * t * ty;
                drawL(px, py, isBank);
            }
        }
    };

    // Start at Top-Middle (using a 0.1 bleed for connections to hide hairlines)
    drawM(50, t ? -0.1 : low);

    // --- Top-Right Quadrant ---
    if (t && r && tr) {
        drawL(100.1, -0.1, false);
        drawL(100.1, 50, false);
    } else if (t && r && !tr) {
        drawL(high, -0.1, false);
        drawCorner(100.1, -0.1, 100.1, low, true);
        drawL(100.1, 50, false);
    } else if (t && !r) {
        drawL(high, -0.1, false);
        drawL(high, 50, true);
    } else if (!t && r) {
        drawL(100.1, low, true);
        drawL(100.1, 50, false);
    } else {
        drawCorner(high, low, high, 50, true);
    }

    // --- Bottom-Right Quadrant ---
    if (b && r && br) {
        drawL(100.1, 100.1, false);
        drawL(50, 100.1, false);
    } else if (b && r && !br) {
        drawL(100.1, high, false);
        drawCorner(100.1, 100.1, high, 100.1, true);
        drawL(50, 100.1, false);
    } else if (!b && r) {
        drawL(100.1, high, true);
        drawL(50, high, true);
    } else if (b && !r) {
        drawL(high, 100.1, true);
        drawL(50, 100.1, false);
    } else {
        drawCorner(high, high, 50, high, true);
    }

    // --- Bottom-Left Quadrant ---
    if (b && l && bl) {
        drawL(-0.1, 100.1, false);
        drawL(-0.1, 50, false);
    } else if (b && l && !bl) {
        drawL(low, 100.1, false);
        drawCorner(-0.1, 100.1, -0.1, high, true);
        drawL(-0.1, 50, false);
    } else if (b && !l) {
        drawL(low, 100.1, true);
        drawL(low, 50, true);
    } else if (!b && l) {
        drawL(-0.1, high, true);
        drawL(-0.1, 50, false);
    } else {
        drawCorner(low, high, low, 50, true);
    }

    // --- Top-Left Quadrant ---
    if (t && l && tl) {
        drawL(-0.1, -0.1, false);
        drawL(50, -0.1, false);
    } else if (t && l && !tl) {
        drawL(-0.1, low, false);
        drawCorner(-0.1, -0.1, low, -0.1, true);
        drawL(50, -0.1, false);
    } else if (!t && l) {
        drawL(-0.1, low, true);
        drawL(50, low, true);
    } else if (t && !l) {
        drawL(low, -0.1, true);
        drawL(50, -0.1, false);
    } else {
        drawCorner(low, low, 50, low, true);
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
