
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
    strokeColor?: string; // Optional stroke color for the blob boundary
    strokeWidth?: number; // Optional stroke width
}









// Cache for Path2D objects to avoid recalculating complex curves every frame
const pathCache = new Map<string, { fill: Path2D, stroke: Path2D | null }>();

function getCacheKey(size: number, neighbors: BlobNeighbors, options: BlobOptions): string {
    const nKey = `${neighbors.t ? 1:0}${neighbors.b ? 1:0}${neighbors.l ? 1:0}${neighbors.r ? 1:0}${neighbors.tl ? 1:0}${neighbors.tr ? 1:0}${neighbors.bl ? 1:0}${neighbors.br ? 1:0}`;
    return `${size}-${nKey}-${options.sharpCorners ? 1:0}-${options.inset || 20}-${options.wavy ? 1:0}-${options.craggy ? 1:0}-${options.patchy ? 1:0}`;
}

/**
 * Draws a blob-style terrain feature for a single cell on a canvas.
 feature for a single cell on a canvas.
 feature for a single cell on a canvas.
 feature for a single cell on a canvas.
 feature for a single cell on a canvas.
 feature for a single cell on a canvas.
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
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const cacheKey = getCacheKey(size, neighbors, options);
    let cachedPaths = pathCache.get(cacheKey);

    if (!cachedPaths) {
        const fillPath = new Path2D();
        const strokePath = options.strokeColor ? new Path2D() : null;
        let strokeActive = false;

        const low = inset;
        const high = 100 - inset;

        let curX = 50, curY = t ? -0.1 : low;

        const drawM = (tx: number, ty: number) => {
            fillPath.moveTo(tx, ty);
            if (strokePath) {
                strokePath.moveTo(tx, ty);
                strokeActive = false;
            }
            curX = tx; curY = ty;
        };

        const drawL = (tx: number, ty: number, isBank: boolean = false) => {
            if (strokePath) {
                if (isBank) {
                    if (!strokeActive) strokePath.moveTo(curX, curY);
                    strokeActive = true;
                } else {
                    strokeActive = false;
                }
            }

            if (isBank && (wavy || craggy || patchy)) {
                const dx = tx - curX;
                const dy = ty - curY;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len > 3) {
                    const nx = -dy / len;
                    const ny = dx / len;

                    const boundaryTaper = (px: number, py: number) => {
                        const margin = 5;
                        const tx_dist = Math.min(px, 100 - px);
                        const ty_dist = Math.min(py, 100 - py);
                        const min_dist = Math.min(tx_dist, ty_dist);
                        return Math.min(1, min_dist / margin);
                    };

                    const phase = (curX + curY) * 0.15;

                    const getOffset = (p: number, t: number) => {
                        const mask = boundaryTaper(p * dx + curX, p * dy + curY);
                        if (craggy) {
                            const noise = (Math.sin(t * 0.5) * 4 + Math.cos(t * 1.5) * 3);
                            return (6 + noise) * mask;
                        } else if (patchy) {
                            return (8 + Math.sin(t * 1.2) * 5) * mask;
                        } else {
                            return (5.0 + Math.sin(t * 0.8) * 3.5) * mask;
                        }
                    };

                    if (craggy) {
                        const p1x = curX + dx * 0.2 + nx * getOffset(0.2, phase), p1y = curY + dy * 0.2 + ny * getOffset(0.2, phase);
                        const p2x = curX + dx * 0.5 + nx * getOffset(0.5, phase + 1), p2y = curY + dy * 0.5 + ny * getOffset(0.5, phase + 1);
                        const p3x = curX + dx * 0.8 + nx * getOffset(0.8, phase + 2), p3y = curY + dy * 0.8 + ny * getOffset(0.8, phase + 2);

                        fillPath.lineTo(p1x, p1y); fillPath.lineTo(p2x, p2y); fillPath.lineTo(p3x, p3y); fillPath.lineTo(tx, ty);
                        if (strokeActive && strokePath) { strokePath.lineTo(p1x, p1y); strokePath.lineTo(p2x, p2y); strokePath.lineTo(p3x, p3y); strokePath.lineTo(tx, ty); }
                    } else if (patchy) {
                        const tufts = Math.max(2, Math.floor(len / 2.5));
                        for (let i = 1; i <= tufts; i++) {
                            const p = i / tufts, midP = (i - 0.5) / tufts;
                            const offset = getOffset(midP, phase + i * 4.7);
                            const mx = curX + dx * midP + nx * offset, my = curY + dy * midP + ny * offset;
                            const bx = curX + dx * p, by = curY + dy * p;
                            fillPath.lineTo(mx, my); fillPath.lineTo(bx, by);
                            if (strokeActive && strokePath) { strokePath.lineTo(mx, my); strokePath.lineTo(bx, by); }
                        }
                    } else { // wavy
                        const segments = Math.max(3, Math.floor(len / 2));
                        for (let i = 1; i <= segments; i++) {
                            const p = i / segments, midP = (i - 0.5) / segments;
                            const offset = getOffset(midP, phase + i * 3.2);
                            const mx = curX + dx * midP + nx * offset, my = curY + dy * midP + ny * offset;
                            const bx = curX + dx * p, by = curY + dy * p;
                            fillPath.lineTo(mx, my); fillPath.lineTo(bx, by);
                            if (strokeActive && strokePath) { strokePath.lineTo(mx, my); strokePath.lineTo(bx, by); }
                        }
                    }
                    curX = tx; curY = ty;
                } else {
                    fillPath.lineTo(tx, ty);
                    if (strokeActive && strokePath) strokePath.lineTo(tx, ty);
                    curX = tx; curY = ty;
                }
            } else {
                fillPath.lineTo(tx, ty);
                if (strokeActive && strokePath) strokePath.lineTo(tx, ty);
                curX = tx; curY = ty;
            }
        };

        const drawCorner = (cx: number, cy: number, tx: number, ty: number, isBank: boolean) => {
            if (sharpCorners) {
                drawL(cx, cy, isBank);
                drawL(tx, ty, isBank);
            } else {
                const sx = curX, sy = curY;
                for (let i = 1; i <= 8; i++) {
                    const t = i / 8;
                    const q = 1 - t;
                    const px = q * q * sx + 2 * q * t * cx + t * t * tx;
                    const py = q * q * sy + 2 * q * t * cy + t * t * ty;
                    drawL(px, py, isBank);
                }
            }
        };

        drawM(50, t ? -1.0 : low);

        // --- Top-Right Quadrant ---
        if (t && r && tr) {
            drawL(101.0, -1.0, false);
            drawL(101.0, 50, false);
        } else if (t && r && !tr) {
            drawL(high, -1.0, false);
            drawCorner(101.0, -1.0, 101.0, low, true);
            drawL(101.0, 50, false);
        } else if (t && !r) {
            drawL(high, -1.0, false);
            drawL(high, 50, true);
        } else if (!t && r) {
            drawL(101.0, low, true);
            drawL(101.0, 50, false);
        } else {
            drawCorner(high, low, high, 50, true);
        }

        // --- Bottom-Right Quadrant ---
        if (b && r && br) {
            drawL(101.0, 101.0, false);
            drawL(50, 101.0, false);
        } else if (b && r && !br) {
            drawL(101.0, high, false);
            drawCorner(101.0, 101.0, high, 101.0, true);
            drawL(50, 101.0, false);
        } else if (!b && r) {
            drawL(101.0, high, true);
            drawL(50, high, true);
        } else if (b && !r) {
            drawL(high, 101.0, true);
            drawL(50, 101.0, false);
        } else {
            drawCorner(high, high, 50, high, true);
        }

        // --- Bottom-Left Quadrant ---
        if (b && l && bl) {
            drawL(-1.0, 101.0, false);
            drawL(-1.0, 50, false);
        } else if (b && l && !bl) {
            drawL(low, 101.0, false);
            drawCorner(-1.0, 101.0, -1.0, high, true);
            drawL(-1.0, 50, false);
        } else if (b && !l) {
            drawL(low, 101.0, true);
            drawL(low, 50, true);
        } else if (!b && l) {
            drawL(-1.0, high, true);
            drawL(-1.0, 50, false);
        } else {
            drawCorner(low, high, low, 50, true);
        }

        // --- Top-Left Quadrant ---
        if (t && l && tl) {
            drawL(-1.0, -1.0, false);
            drawL(50, -1.0, false);
        } else if (t && l && !tl) {
            drawL(-1.0, low, false);
            drawCorner(-1.0, -1.0, low, -1.0, true);
            drawL(50, -1.0, false);
        } else if (!t && l) {
            drawL(-1.0, low, true);
            drawL(50, low, true);
        } else if (t && !l) {
            drawL(low, -1.0, true);
            drawL(50, -1.0, false);
        } else {
            drawCorner(low, low, 50, low, true);
        }

        fillPath.closePath();
        cachedPaths = { fill: fillPath, stroke: strokePath };
        pathCache.set(cacheKey, cachedPaths);
    }

    ctx.fillStyle = color;
    ctx.fill(cachedPaths.fill);

    if (cachedPaths.stroke && options.strokeColor) {
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth || (2 / scale);
        ctx.stroke(cachedPaths.stroke);
    }

    ctx.restore();
}