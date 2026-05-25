import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, getTerrainName } from '../mapperUtils';
import { getZoneVisuals } from '../zoneFilters';

const TERRAIN_TILE_INSET = 0;
const FAR_ZOOM_TERRAIN_LOD = 0.22;

let tempContentCanvas: HTMLCanvasElement | null = null;
let tempContentCtx: CanvasRenderingContext2D | null = null;
let tempMaskCanvas: HTMLCanvasElement | null = null;
let tempMaskCtx: CanvasRenderingContext2D | null = null;

function getTempCanvases(size: number) {
    if (typeof document === 'undefined') return null;
    if (!tempContentCanvas) tempContentCanvas = document.createElement('canvas');
    if (!tempMaskCanvas) tempMaskCanvas = document.createElement('canvas');
    
    if (tempContentCanvas.width !== size || tempContentCanvas.height !== size) {
        tempContentCanvas.width = size;
        tempContentCanvas.height = size;
        tempContentCtx = tempContentCanvas.getContext('2d', { alpha: true });
    }
    if (tempMaskCanvas.width !== size || tempMaskCanvas.height !== size) {
        tempMaskCanvas.width = size;
        tempMaskCanvas.height = size;
        tempMaskCtx = tempMaskCanvas.getContext('2d', { alpha: true });
    }
    return {
        contentCanvas: tempContentCanvas,
        contentCtx: tempContentCtx!,
        maskCanvas: tempMaskCanvas,
        maskCtx: tempMaskCtx!
    };
}

export const getTerrainTileInset = (s: number) => Math.min(TERRAIN_TILE_INSET, Math.max(1, s * 0.06));

const fillTerrainTile = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    const inset = getTerrainTileInset(s);
    const transform = ctx.getTransform();
    const sx1 = Math.floor((x + inset) * transform.a + transform.e);
    const sy1 = Math.floor((y + inset) * transform.d + transform.f);
    const sx2 = Math.ceil((x + s - inset) * transform.a + transform.e);
    const sy2 = Math.ceil((y + s - inset) * transform.d + transform.f);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
    ctx.restore();
};

const fillAnimatedTerrainTile = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    sourceDir: string,
    alphaMul: number
) => {
    const inset = getTerrainTileInset(s);
    const ix = x + inset;
    const iy = y + inset;
    const is = s - inset * 2;

    if (sourceDir === 'n') ctx.fillRect(ix, iy, is, is * alphaMul);
    else if (sourceDir === 's') ctx.fillRect(ix, iy + is * (1 - alphaMul), is, is * alphaMul);
    else if (sourceDir === 'w') ctx.fillRect(ix, iy, is * alphaMul, is);
    else if (sourceDir === 'e') ctx.fillRect(ix + is * (1 - alphaMul), iy, is * alphaMul, is);
    else fillTerrainTile(ctx, x, y, s);
};

const drawLodBatches = (
    ctx: CanvasRenderingContext2D,
    batches: Record<string, { x: number, y: number }[]>,
    s: number,
    tileBacking: string,
    colorAlpha: number
) => {
    ctx.save();
    ctx.fillStyle = tileBacking;
    ctx.globalAlpha = 1.0;
    for (const color in batches) {
        const rooms = batches[color];
        for (let i = 0; i < rooms.length; i++) {
            fillTerrainTile(ctx, rooms[i].x, rooms[i].y, s);
        }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = colorAlpha;
    for (const color in batches) {
        const rooms = batches[color];
        ctx.fillStyle = color;
        for (let i = 0; i < rooms.length; i++) {
            fillTerrainTile(ctx, rooms[i].x, rooms[i].y, s);
        }
    }
    ctx.restore();
};

const drawSingleTree = (
    ictx: CanvasRenderingContext2D,
    cx: number,
    baseY: number,
    sz: number,
    isDarkMode: boolean
) => {
    const trunkColor = isDarkMode ? 'rgba(70, 44, 18, 1.0)' : 'rgba(55, 30, 10, 1.0)';
    const crownFill  = isDarkMode ? 'rgba(14, 36, 12, 1.0)' : 'rgba(10, 48, 14, 1.0)';
    const crownEdge  = isDarkMode ? 'rgba(6,  18,  6, 1.0)' : 'rgba(4,  26,  6, 1.0)';
    const hlColor    = isDarkMode ? 'rgba(50,  88, 36, 0.14)' : 'rgba(34, 86, 24, 0.14)';

    const tH    = sz * 0.20;
    const tW    = Math.max(1.5, sz * 0.10);
    const cRx   = sz * 0.27;
    const cRy   = sz * 0.36;
    const cCY   = baseY - tH - cRy * 0.70;

    // Drop shadow (crown shadow) - slightly darker for depth
    ictx.fillStyle = isDarkMode ? 'rgba(0,0,0,0.30)' : 'rgba(0,0,0,0.22)';
    ictx.beginPath();
    ictx.ellipse(cx + 1.5, cCY + 2, cRx, cRy, 0, 0, Math.PI * 2);
    ictx.fill();

    // Additional base trunk shadow (directly on the ground/under the trunk)
    ictx.fillStyle = isDarkMode ? 'rgba(0,0,0,0.36)' : 'rgba(0,0,0,0.28)';
    ictx.beginPath();
    ictx.ellipse(cx, baseY, tW * 1.5, tH * 0.45, 0, 0, Math.PI * 2);
    ictx.fill();

    // Trunk
    ictx.fillStyle = trunkColor;
    ictx.fillRect(cx - tW / 2, baseY - tH, tW, tH);

    // Crown fill
    ictx.fillStyle = crownFill;
    ictx.beginPath();
    ictx.ellipse(cx, cCY, cRx, cRy, 0, 0, Math.PI * 2);
    ictx.fill();

    // Crown outline for crisp definition
    ictx.strokeStyle = crownEdge;
    ictx.lineWidth = 0.9;
    ictx.beginPath();
    ictx.ellipse(cx, cCY, cRx, cRy, 0, 0, Math.PI * 2);
    ictx.stroke();

    // Upper-left highlight
    const hlGrad = ictx.createRadialGradient(cx - cRx * 0.25, cCY - cRy * 0.30, 0, cx, cCY, cRx * 1.2);
    hlGrad.addColorStop(0, hlColor);
    hlGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ictx.fillStyle = hlGrad;
    ictx.beginPath();
    ictx.ellipse(cx, cCY, cRx, cRy, 0, 0, Math.PI * 2);
    ictx.fill();
};

const drawOutskirtTrees = (
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    vnum: string,
    s: number,
    terrain: any,
    preloaded: any,
    isDarkMode: boolean,
    tileOpacity: number,
    explored: Set<string>
) => {
    const tName = getTerrainName(terrain);
    if (tName === 'Forest') return;

    const rData = preloaded[vnum];
    if (!rData || !rData[4]) return;

    const gridX = Math.round(rx / s);
    const gridY = Math.round(ry / s);
    const exits = rData[4] as Record<string, any>;

    for (const dir of ['n', 's', 'e', 'w']) {
        const exit = exits[dir];
        if (exit) {
            const targetData = preloaded[String(exit.target)];
            if (targetData && getTerrainName(targetData[3]) === 'Forest') {
                ctx.save();
                // slightly dimmer if target forest is unexplored
                ctx.globalAlpha = tileOpacity * (explored.has(String(exit.target)) ? 1.0 : 0.45);

                const treeSeed = Math.abs(Math.sin(gridX * 7.1 + gridY * 13.3 + (dir === 'n' ? 1 : dir === 's' ? 2 : dir === 'e' ? 3 : 4)) * 1000) % 1;
                const numOutskirtTrees = treeSeed > 0.65 ? 2 : 1;

                for (let j = 0; j < numOutskirtTrees; j++) {
                    const offsetFrac = 0.15 + ((treeSeed * 10 + j * 3.4) % 7) / 10 * 0.7; // 0.15 to 0.85 along the border
                    let tx = rx + s / 2;
                    let ty = ry + s / 2;

                    if (dir === 'n') {
                        tx = rx + offsetFrac * s;
                        ty = ry + s * 0.08 + (j * 4);
                    } else if (dir === 's') {
                        tx = rx + offsetFrac * s;
                        ty = ry + s * 0.92 - (j * 4);
                    } else if (dir === 'e') {
                        tx = rx + s * 0.92 - (j * 4);
                        ty = ry + offsetFrac * s;
                    } else if (dir === 'w') {
                        tx = rx + s * 0.08 + (j * 4);
                        ty = ry + offsetFrac * s;
                    }

                    drawSingleTree(ctx, tx, ty, s * 0.13, isDarkMode);
                }
                ctx.restore();
            }
        }
    }
};

const drawGrassTexture = (
    ictx: CanvasRenderingContext2D,
    s: number,
    variant: number,
    isDarkMode: boolean,
    bladeCount: number = 14
) => {
    ictx.save();
    const bladeColor = isDarkMode ? 'rgba(100, 130, 88, 0.22)' : 'rgba(38, 98, 42, 0.20)';
    ictx.strokeStyle = bladeColor;
    ictx.lineCap = 'round';
    for (let i = 0; i < bladeCount; i++) {
        const s1 = Math.abs(Math.sin((i + variant * 4.7) * 113.1) * 43758.5453) % 1;
        const s2 = Math.abs(Math.sin((i + variant * 4.7) * 271.3 + 1.1) * 43758.5453) % 1;
        const s3 = Math.abs(Math.sin((i + variant * 4.7) * 157.9 + 2.3) * 43758.5453) % 1;
        const bx = s1 * s;
        const by = s2 * s;
        const height = 3 + s3 * 3;
        const lean = (s3 - 0.5) * 3;
        ictx.lineWidth = 0.7 + s3 * 0.4;
        ictx.beginPath();
        ictx.moveTo(bx, by);
        ictx.lineTo(bx + lean, by - height);
        ictx.stroke();
    }
    ictx.restore();
};

const drawTerrainTileIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    terrain: any,
    isDarkMode: boolean,
    processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>,
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>,
    variant: number,
    weather?: string
) => {
    const inset = getTerrainTileInset(s);
    drawTerrainIcon(ctx, x + inset, y + inset, s - inset * 2, terrain, isDarkMode, processedIconsRef, imagesRef, variant, weather);
};

export const drawTerrainIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    terrain: any,
    isDarkMode: boolean,
    processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>,
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>,
    variant: number = 0,
    weather?: string
) => {
    const tName = getTerrainName(terrain);
    const variantSpecificTerrains = ['Hills', 'Forest', 'Brush', 'Mountains', 'Field', 'Cavern', 'Tunnel', 'Water', 'Shallows', 'Rapids', 'City', 'Underwater', 'Building'];
    const iconSize = Math.round(s);

    // Include image-load state in key so the icon rebuilds once the image is ready
    const useMountain2 = variant % 2 === 1;
    const mountainImg = tName === 'Mountains' ? (useMountain2 ? imagesRef.current['mountain2'] : imagesRef.current['mountain']) : null;
    const mountainImgReady = !!(mountainImg && mountainImg.complete && mountainImg.naturalWidth > 0);
    const hillImg = tName === 'Hills' ? imagesRef.current['hill'] : null;
    const hillImgReady = !!(hillImg && hillImg.complete && hillImg.naturalWidth > 0);
    const key = variantSpecificTerrains.includes(tName)
        ? `${tName}_v${variant}_${isDarkMode}_s${iconSize}_w${weather || 'none'}_v66${
            tName === 'Mountains' ? `_i${mountainImgReady ? 1 : 0}` : 
            tName === 'Hills' ? `_h${hillImgReady ? 1 : 0}` : ''
          }`
        : `${tName}_${isDarkMode}_s${iconSize}_w${weather || 'none'}_v66`;
    
    if (!processedIconsRef.current[key]) {
        let targetW = s;
        let targetH = s;
        if (tName === 'Mountains' && mountainImgReady) {
            const ratio = mountainImg!.naturalHeight / mountainImg!.naturalWidth;
            const scale = useMountain2 ? 1.0 : 1.3;
            if (ratio > 1) {
                targetW = s * scale;
                targetH = s * ratio * scale;
            } else {
                targetH = s * scale;
                targetW = (s / ratio) * scale;
            }
        } else if (tName === 'Hills' && hillImgReady) {
            const ratio = hillImg!.naturalHeight / hillImg!.naturalWidth;
            if (ratio > 1) {
                targetW = s * 0.5;
                targetH = s * ratio * 0.5;
            } else {
                targetH = s * 0.5;
                targetW = (s / ratio) * 0.5;
            }
        } else if (tName === 'Forest') {
            targetW = s * 1.25;
            targetH = s * 1.30;
        }

        const canvasW = Math.max(s, targetW);
        const canvasH = Math.max(s, targetH);

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = canvasW;
        iconCanvas.height = canvasH;
        const ictx = iconCanvas.getContext('2d')!;
        
        const cX = s / 2;
        const cY = s / 2;
        ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
        ictx.lineWidth = 2;
        ictx.lineJoin = 'round';
        ictx.lineCap = 'round';

        if (tName === 'Mountains') {
            // Draw background grass texture
            drawGrassTexture(ictx, s, variant, isDarkMode, 8);

            if (mountainImgReady) {
                const offsetX = (canvasW - targetW) / 2;
                const offsetY = canvasH - targetH;
                ictx.save();
                ictx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ictx.shadowBlur = 6;
                ictx.shadowOffsetX = 0;
                ictx.shadowOffsetY = -3;
                ictx.drawImage(mountainImg!, offsetX, offsetY, targetW, targetH);
                ictx.restore();

                // Draw a few trees around the mountain base
                drawSingleTree(ictx, offsetX + targetW * 0.12, canvasH - targetH * 0.05, s * 0.16, isDarkMode);
                drawSingleTree(ictx, offsetX + targetW * 0.88, canvasH - targetH * 0.07, s * 0.14, isDarkMode);
                drawSingleTree(ictx, offsetX + targetW * 0.25, canvasH - targetH * 0.02, s * 0.12, isDarkMode);

                if (weather === 'snow') {
                    ictx.save();
                    ictx.globalCompositeOperation = 'source-atop';
                    const snowGrad = ictx.createLinearGradient(0, offsetY, 0, offsetY + targetH * 0.35);
                    snowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                    snowGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
                    ictx.fillStyle = snowGrad;
                    ictx.fillRect(offsetX, offsetY, targetW, targetH);
                    ictx.restore();
                }
            } else {
            ictx.save();
            ictx.lineJoin = 'round';
            ictx.lineCap  = 'round';

            const outlineColor = isDarkMode ? 'rgba(28,22,16,0.95)' : 'rgba(14,9,4,0.94)';
            const fillColor    = isDarkMode ? 'rgba(34,30,26,0.93)' : 'rgba(138,128,116,0.90)';
            const hatchColor   = isDarkMode ? 'rgba(12,9,7,0.88)'   : 'rgba(20,14,6,0.58)';

            type Pt = [number, number];
            // Classic alpine silhouette: sharp main peak + secondary ridge, modelled on ink-sketch style
            const shapes: Pt[][] = [
                [[0.05,0.88],[0.40,0.22],[0.58,0.60],[0.72,0.50],[0.95,0.86]],
                [[0.05,0.88],[0.35,0.20],[0.55,0.58],[0.70,0.46],[0.95,0.86]],
                [[0.08,0.88],[0.48,0.24],[0.63,0.60],[0.76,0.48],[0.95,0.86]],
                [[0.05,0.88],[0.30,0.26],[0.52,0.62],[0.66,0.52],[0.82,0.58],[0.95,0.86]],
                [[0.05,0.88],[0.44,0.22],[0.60,0.58],[0.74,0.44],[0.95,0.86]],
                [[0.05,0.88],[0.38,0.28],[0.56,0.64],[0.70,0.54],[0.86,0.60],[0.95,0.86]],
            ];

            const pts   = shapes[variant % 6];
            const py    = (p: Pt) => p[1] * s;
            const baseY = Math.max(...pts.map(py));
            const minY  = Math.min(...pts.map(py));

            const buildPath = () => {
                ictx.beginPath();
                ictx.moveTo(pts[0][0] * s, py(pts[0]));
                for (let i = 1; i < pts.length; i++) ictx.lineTo(pts[i][0] * s, py(pts[i]));
                ictx.lineTo(pts[pts.length - 1][0] * s, baseY);
                ictx.lineTo(pts[0][0] * s, baseY);
                ictx.closePath();
            };

            // 1. Fill
            const fillGrad = ictx.createLinearGradient(0, minY, 0, baseY);
            fillGrad.addColorStop(0,    fillColor);
            fillGrad.addColorStop(0.75, fillColor);
            fillGrad.addColorStop(1,    'rgba(0,0,0,0)');
            ictx.fillStyle = fillGrad;
            buildPath();
            ictx.fill();

            // 2. Diagonal hatching on descending (shadow) faces
            ictx.save();
            buildPath();
            ictx.clip();
            ictx.strokeStyle = hatchColor;
            ictx.lineWidth   = 0.8;
            ictx.lineCap     = 'butt';
            for (let i = 1; i < pts.length; i++) {
                const x0 = pts[i-1][0] * s, y0 = py(pts[i-1]);
                const x1 = pts[i][0]   * s, y1 = py(pts[i]);
                if (y1 <= y0) continue;
                ictx.save();
                ictx.beginPath();
                ictx.moveTo(x0, y0); ictx.lineTo(x1, y1);
                ictx.lineTo(x1, baseY); ictx.lineTo(x0, baseY);
                ictx.closePath();
                ictx.clip();
                const step = 3.5;
                for (let hx = x0 - (baseY - y0); hx < x1 + 4; hx += step) {
                    ictx.beginPath();
                    ictx.moveTo(hx, y0 - 2);
                    ictx.lineTo(hx + (baseY - y0) + 4, baseY + 2);
                    ictx.stroke();
                }
                ictx.restore();
            }
            ictx.restore();

            // 3. Snow cap: white gradient clipped to mountain, fading out below snow line
            const snowLine = minY + (baseY - minY) * 0.30;
            ictx.save();
            buildPath();
            ictx.clip();
            const snowGrad = ictx.createLinearGradient(0, minY, 0, snowLine);
            snowGrad.addColorStop(0,    'rgba(235,242,255,0.96)');
            snowGrad.addColorStop(0.65, 'rgba(215,228,248,0.70)');
            snowGrad.addColorStop(1,    'rgba(200,218,240,0.00)');
            ictx.fillStyle = snowGrad;
            ictx.fillRect(0, minY - 2, s, snowLine - minY + 4);
            ictx.restore();

            // 4. Ridge outline
            ictx.strokeStyle = outlineColor;
            ictx.lineWidth   = 1.8;
            ictx.beginPath();
            ictx.moveTo(pts[0][0] * s, py(pts[0]));
            for (let i = 1; i < pts.length; i++) ictx.lineTo(pts[i][0] * s, py(pts[i]));
            ictx.stroke();

            ictx.restore();

            // Draw a few trees around the base for procedural mountains
            drawSingleTree(ictx, s * 0.12, s * 0.90, s * 0.16, isDarkMode);
            drawSingleTree(ictx, s * 0.88, s * 0.92, s * 0.14, isDarkMode);
            drawSingleTree(ictx, s * 0.25, s * 0.95, s * 0.12, isDarkMode);
            } // end else (procedural fallback)
        } else if (tName === 'Hills') {
            // Draw background grass texture
            drawGrassTexture(ictx, s, variant, isDarkMode, 10);

            if (hillImgReady) {
                const offsetX = (canvasW - targetW) / 2;
                const offsetY = canvasH - targetH;
                ictx.save();
                ictx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ictx.shadowBlur = 6;
                ictx.shadowOffsetX = 0;
                ictx.shadowOffsetY = -3;
                ictx.drawImage(hillImg!, offsetX, offsetY, targetW, targetH);
                ictx.restore();

                if (weather === 'snow') {
                    ictx.save();
                    ictx.globalCompositeOperation = 'source-atop';
                    const snowGrad = ictx.createLinearGradient(0, offsetY, 0, offsetY + targetH * 0.35);
                    snowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                    snowGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
                    ictx.fillStyle = snowGrad;
                    ictx.fillRect(offsetX, offsetY, targetW, targetH);
                    ictx.restore();
                }
            } else {
                ictx.save();
                // Rounded hill crests: upward-arching compact arcs with brown shading.
                const shadowColor = isDarkMode ? 'rgba(30, 18, 8, 0.55)'   : 'rgba(20, 10, 2, 0.40)';
                const hillColor   = isDarkMode ? 'rgba(148, 104, 54, 0.80)' : 'rgba(110, 72, 30, 0.70)';
                ictx.lineCap = 'round';

                const numHills = 2 + (variant % 2);
                for (let i = 0; i < numHills; i++) {
                    const s1 = Math.abs(Math.sin((i * 3.7 + variant * 5.1) * 47.9)  * 43758.5453) % 1;
                    const s2 = Math.abs(Math.sin((i * 6.1 + variant * 3.3) * 31.7)  * 43758.5453) % 1;
                    const s3 = Math.abs(Math.sin((i * 2.9 + variant * 7.7) * 113.1) * 43758.5453) % 1;

                    const cx   = s * (0.15 + s1 * 0.70);
                    const hw   = s * (0.20 + s2 * 0.15);
                    const cy   = s * (0.15 + (i / numHills) * 0.70 + (s3 - 0.5) * 0.08);
                    const rise = s * (0.15 + s2 * 0.13);
                    const lw   = 0.9 + s3 * 0.6;

                    // Shadow pass: slightly offset down, thicker, dark
                    ictx.strokeStyle = shadowColor;
                    ictx.lineWidth = lw + 1.2;
                    ictx.globalAlpha = 0.55 + s1 * 0.30;
                    ictx.beginPath();
                    ictx.moveTo(cx - hw, cy + 1.5);
                    ictx.quadraticCurveTo(cx, cy - rise + 1.5, cx + hw, cy + 1.5);
                    ictx.stroke();

                    // Main brown crest
                    ictx.strokeStyle = hillColor;
                    ictx.lineWidth = lw;
                    ictx.globalAlpha = 0.65 + s1 * 0.35;
                    ictx.beginPath();
                    ictx.moveTo(cx - hw, cy);
                    ictx.quadraticCurveTo(cx, cy - rise, cx + hw, cy);
                    ictx.stroke();
                }
                ictx.restore();
            }
        } else if (tName === 'Forest') {
            ictx.save();

            // Tree icons: visible trunk + vertically-elongated crown, sorted back-to-front.
            // [cx_frac, baseY_frac, size_frac]
            type TreeDef = [number, number, number];
            const treeLayouts: TreeDef[][] = [
                [
                    [0.15, 0.08, 0.18], [0.40, 0.07, 0.18], [0.65, 0.09, 0.18], [0.90, 0.08, 0.18],
                    [0.05, 0.22, 0.19], [0.28, 0.24, 0.19], [0.52, 0.21, 0.19], [0.76, 0.25, 0.19], [0.95, 0.23, 0.18],
                    [0.15, 0.40, 0.20], [0.38, 0.39, 0.20], [0.62, 0.41, 0.20], [0.85, 0.40, 0.19],
                    [0.05, 0.56, 0.20], [0.28, 0.58, 0.21], [0.50, 0.55, 0.20], [0.72, 0.57, 0.20], [0.95, 0.56, 0.20],
                    [0.15, 0.74, 0.21], [0.38, 0.72, 0.21], [0.62, 0.75, 0.21], [0.85, 0.73, 0.21],
                    [0.05, 0.90, 0.22], [0.28, 0.92, 0.22], [0.50, 0.89, 0.22], [0.72, 0.91, 0.22], [0.95, 0.90, 0.22]
                ],
                [
                    [0.10, 0.07, 0.18], [0.35, 0.09, 0.18], [0.60, 0.08, 0.18], [0.85, 0.07, 0.18],
                    [0.20, 0.23, 0.19], [0.45, 0.22, 0.19], [0.70, 0.24, 0.19], [0.95, 0.23, 0.18],
                    [0.05, 0.39, 0.20], [0.30, 0.41, 0.20], [0.55, 0.40, 0.20], [0.80, 0.39, 0.19],
                    [0.15, 0.55, 0.20], [0.40, 0.57, 0.21], [0.65, 0.56, 0.20], [0.90, 0.55, 0.20],
                    [0.05, 0.73, 0.21], [0.30, 0.75, 0.22], [0.55, 0.74, 0.21], [0.80, 0.73, 0.21],
                    [0.15, 0.91, 0.22], [0.40, 0.89, 0.22], [0.65, 0.92, 0.22], [0.90, 0.90, 0.22]
                ],
                [
                    [0.20, 0.08, 0.18], [0.50, 0.07, 0.18], [0.80, 0.09, 0.18],
                    [0.05, 0.23, 0.19], [0.30, 0.25, 0.19], [0.55, 0.22, 0.19], [0.80, 0.24, 0.19],
                    [0.15, 0.40, 0.20], [0.40, 0.39, 0.20], [0.65, 0.41, 0.20], [0.90, 0.40, 0.19],
                    [0.05, 0.56, 0.20], [0.30, 0.58, 0.21], [0.55, 0.55, 0.20], [0.80, 0.57, 0.20],
                    [0.15, 0.74, 0.21], [0.40, 0.72, 0.22], [0.65, 0.75, 0.21], [0.90, 0.73, 0.21],
                    [0.05, 0.91, 0.22], [0.30, 0.89, 0.22], [0.55, 0.92, 0.22], [0.80, 0.90, 0.22]
                ]
            ];
            const trees = [...treeLayouts[variant % 3]].sort((a, b) => a[1] - b[1]);

            const offsetX = (canvasW - s) / 2;
            const offsetY = canvasH - s;

            for (const [cxf, byf, szf] of trees) {
                const j1 = (Math.abs(Math.sin((cxf * 137 + variant * 11.3) * 43758.5453)) % 1 - 0.5) * s * 0.04;
                drawSingleTree(ictx, offsetX + cxf * s + j1, offsetY + byf * s, szf * s, isDarkMode);
            }

            ictx.restore();
        } else if (tName === 'Field') {
            drawGrassTexture(ictx, s, variant, isDarkMode, 14);
        } else if (tName === 'Brush') {
            ictx.font = `${Math.round(s * 0.35)}px monospace`;
            const brushColors = isDarkMode ? [
                "rgba(130, 110, 88, 0.18)", "rgba(128, 122, 86, 0.18)"
            ] : [
                "rgba(104, 62, 34, 0.18)", "rgba(112, 72, 44, 0.18)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.3, y: 0.3 }, { x: 0.7, y: 0.4 }, { x: 0.4, y: 0.7 }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = brushColors[(variant + i) % 2];
                ictx.fillText('*', pos.x * s, pos.y * s);
            }
        } else if (tName === 'City') {
            ictx.save();
            
            const stoneW = 8;
            const stoneH = 5;
            const gap = 1;
            
            // Draw a running bond (brick-like offset) cobblestone pattern
            for (let y = 0; y < s; y += stoneH + gap) {
                const rowIdx = Math.floor(y / (stoneH + gap));
                // Offset every second row horizontally by half stone width
                const xOffset = (rowIdx % 2 === 0) ? 0 : (stoneW + gap) / 2;
                
                for (let x = -stoneW; x < s + stoneW; x += stoneW + gap) {
                    const startX = x + xOffset;
                    if (startX + stoneW < 0 || startX > s) continue;
                    
                    // Pseudo-random variation per stone block
                    const seed = Math.sin(startX * 12.9898 + y * 78.233) * 43758.5453;
                    const rand = (Math.abs(seed) % 1);
                    
                    // Variegated shading: mix subtle light and dark highlights
                    const shade = (rand - 0.5) * 0.15; // -0.075 to +0.075
                    if (shade > 0) {
                        ictx.fillStyle = `rgba(255, 255, 255, ${shade})`;
                    } else {
                        ictx.fillStyle = `rgba(0, 0, 0, ${Math.abs(shade)})`;
                    }
                    ictx.fillRect(startX, y, stoneW, stoneH);
                    
                    // Dark grout lines between the stones
                    ictx.strokeStyle = isDarkMode ? "rgba(0, 0, 0, 0.20)" : "rgba(0, 0, 0, 0.10)";
                    ictx.lineWidth = 0.5;
                    ictx.strokeRect(startX, y, stoneW, stoneH);
                }
            }
            ictx.restore();
        } else if (tName === 'Water' || tName === 'Shallows' || tName === 'Rapids' || tName === 'Underwater') {
            ictx.font = `${Math.round(s * 0.45)}px monospace`;
            
            let waterColors: string[];
            if (tName === 'Shallows') {
                waterColors = isDarkMode ? ["rgba(100, 148, 155, 0.18)", "rgba(110, 148, 156, 0.18)"] : ["rgba(34, 124, 154, 0.18)", "rgba(28, 104, 136, 0.18)"];
            } else if (tName === 'Rapids') {
                waterColors = isDarkMode ? ["rgba(100, 148, 155, 0.18)", "rgba(108, 142, 150, 0.18)"] : ["rgba(0, 100, 140, 0.18)", "rgba(0, 88, 128, 0.18)"];
            } else if (tName === 'Underwater') {
                waterColors = isDarkMode ? ["rgba(90, 110, 148, 0.18)", "rgba(82, 104, 142, 0.18)"] : ["rgba(0, 50, 100, 0.18)", "rgba(0, 40, 86, 0.18)"];
            } else {
                waterColors = isDarkMode ? ["rgba(90, 120, 148, 0.18)", "rgba(82, 112, 140, 0.18)"] : ["rgba(31, 97, 141, 0.18)", "rgba(41, 110, 155, 0.18)"];
            }

            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillStyle = waterColors[variant % 2];
            ictx.fillText('~', cX, cY);
        } else if (tName === 'Cavern') {
            const caveColors = isDarkMode ? [
                "rgba(120, 120, 130, 0.18)", "rgba(100, 100, 110, 0.18)"
            ] : [
                "rgba(80, 80, 80, 0.18)", "rgba(50, 50, 50, 0.18)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            
            // Hanging stalactites (V) of different sizes
            ictx.fillStyle = caveColors[0];
            ictx.font = `${Math.round(s * 0.3)}px monospace`;
            ictx.fillText('V', s * 0.3, s * 0.2);
            
            ictx.fillStyle = caveColors[1];
            ictx.font = `${Math.round(s * 0.2)}px monospace`;
            ictx.fillText('V', s * 0.7, s * 0.18);
            
            // Rising stalagmite (^) further south
            ictx.fillStyle = caveColors[0];
            ictx.font = `${Math.round(s * 0.35)}px monospace`;
            ictx.fillText('^', s * 0.5, s * 0.9);
            
        } else if (tName === 'Tunnel') {
            ictx.font = `${Math.round(s * 0.4)}px monospace`;
            const tunnelColors = isDarkMode ? [
                "rgba(134, 122, 108, 0.18)", "rgba(118, 108, 98, 0.18)"
            ] : [
                "rgba(92, 76, 58, 0.18)", "rgba(72, 58, 44, 0.18)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.6 }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = tunnelColors[(variant + i) % 2];
                ictx.fillText('∩', pos.x * s, pos.y * s);
            }
        } else if (tName === 'Building') {
            ictx.save();
            // Dirt/gravel: scattered small specks, no geometric structure
            const speckCount = 22;
            for (let i = 0; i < speckCount; i++) {
                const s1 = Math.abs(Math.sin((i + variant * 5.3) * 127.1) * 43758.5453) % 1;
                const s2 = Math.abs(Math.sin((i + variant * 5.3) * 311.7 + 1.3) * 43758.5453) % 1;
                const s3 = Math.abs(Math.sin((i + variant * 5.3) * 191.9 + 2.7) * 43758.5453) % 1;
                const px = s1 * s;
                const py = s2 * s;
                const r = 0.7 + s3 * 1.4;
                // Mix of slightly darker and slightly lighter specks
                const isLight = i % 3 === 0;
                const alpha = 0.07 + s3 * 0.08;
                ictx.fillStyle = isLight
                    ? `rgba(255,255,255,${alpha})`
                    : `rgba(0,0,0,${alpha})`;
                ictx.beginPath();
                ictx.arc(px, py, r, 0, Math.PI * 2);
                ictx.fill();
            }
            ictx.restore();
        }
        processedIconsRef.current[key] = iconCanvas;
    }

     const cachedIcon = processedIconsRef.current[key];
     if (cachedIcon) {
         let offsetX = x - (cachedIcon.width - s) / 2;
         let offsetY = y - (cachedIcon.height - s);

         if (tName === 'Hills') {
             // Deterministic pseudo-random offset between -12% and +12% of tile size s
             const s1 = Math.abs(Math.sin(variant * 17.3) * 43758.5453) % 1;
             const s2 = Math.abs(Math.sin(variant * 29.7) * 43758.5453) % 1;
             offsetX += (s1 - 0.5) * s * 0.24;
             offsetY += (s2 - 0.5) * s * 0.16; // slightly less vertical jitter
         }

         ctx.drawImage(cachedIcon, offsetX, offsetY);
     }
};

const getSourceDirection = (vnum: string, rCtx: RenderContext): string | null => {
    const rData = rCtx.preloaded[vnum];
    if (!rData || !rData[4]) return null;
    const myExploredAt = rCtx.firstExploredAtRef.current[vnum] || Infinity;
    let sourceDir: string | null = null;
    let latestNeighborExploredAt = -1;
    for (const [dir, exit] of Object.entries(rData[4] as Record<string, any>)) {
        const neighborVnum = String(exit.target);
        const neighborExploredAt = rCtx.firstExploredAtRef.current[neighborVnum];
        if (neighborExploredAt && neighborExploredAt < myExploredAt) {
            if (neighborExploredAt > latestNeighborExploredAt) {
                latestNeighborExploredAt = neighborExploredAt;
                sourceDir = dir;
            }
        }
    }
    return sourceDir;
};

const getRevealSource = (vnum: string, rCtx: RenderContext): { time: number, dir: string } | null => {
    const rData = rCtx.preloaded[vnum];
    if (!rData || !rData[4]) return null;
    let earliestNeighborExploredAt = Infinity;
    let sourceDir: string | null = null;
    for (const [dir, exit] of Object.entries(rData[4] as Record<string, any>)) {
        const neighborVnum = String(exit.target);
        const neighborExploredAt = rCtx.firstExploredAtRef.current[neighborVnum];
        if (neighborExploredAt) {
            if (neighborExploredAt < earliestNeighborExploredAt) {
                earliestNeighborExploredAt = neighborExploredAt;
                sourceDir = dir;
            }
        }
    }
    if (sourceDir === null || earliestNeighborExploredAt === Infinity) return null;
    return { time: earliestNeighborExploredAt, dir: sourceDir };
};

export const applyRoomShading = (ctx: CanvasRenderingContext2D, r: any, s: number, alphaMul: number, rCtx: any) => {
    // baseMapExitsRef (from ardagmcp.xml) is keyed by server_id.
    // preloaded (mume_map_data.json) is keyed by internal sequential id, with server_id at index [6].
    const preloadedEntry = rCtx.preloaded[r.vnum];
    const serverId = preloadedEntry && Array.isArray(preloadedEntry) ? String(preloadedEntry[6]) : r.vnum;
    const masterData = rCtx.baseMapExitsRef?.current?.[serverId] || rCtx.baseMapExitsRef?.current?.[r.vnum];

    let light: any;
    let sundeath: any;

    if (masterData) {
        light = Array.isArray(masterData) ? masterData[10] : masterData.light;
        sundeath = Array.isArray(masterData) ? masterData[11] : masterData.sundeath;
    } else {
        // Fall back to local room or batch data when no ardagmcp master data is available
        const localRoom = rCtx.allRooms[`m_${r.vnum}`] || rCtx.allRooms[r.vnum];
        light = localRoom?.light !== undefined ? localRoom.light : r.light;
        sundeath = localRoom?.sundeath !== undefined ? localRoom.sundeath : r.sundeath;
    }

    let overlayAlpha = 0;
    // light=1 → DARK room (always dark in MM2 format, e.g. caves with no torch)
    if (light === 1 || light === '1') overlayAlpha += 0.13;
    // sundeath=0 → NO_SUNDEATH (indoor/cave, never killed by sun) → extra dark
    if (sundeath === 0 || sundeath === '0') overlayAlpha += 0.2;

    if (overlayAlpha > 0) {
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = overlayAlpha * alphaMul;
        fillTerrainTile(ctx, r.x, r.y, s);
        ctx.restore();
    }
};

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, imagesRef, isTracingMode, mapTileVisuals } = rCtx;
    const terrainColors = mapTileVisuals?.terrainColors;
    const tileOpacity = rCtx.mapTileOpacity ?? 1;
    const tileBacking = isDarkMode ? '#000000' : '#f2f2f7';
    const tileBackingAlpha = tileOpacity;
    const s = GRID_SIZE;

    const exploredBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number, isPermanentSnow?: boolean }[]> = {};
    const ring1Batches: Record<string, { x: number, y: number, terrain: string }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number, isPermanentSnow?: boolean }[]> = {};
    const peekedRooms: { tx: number, ty: number, terrain: string, color: string, vnum: string }[] = [];
    const ring1Animating: { x: number, y: number, terrain: string, vnum: string, revealInfo: { time: number, dir: string } }[] = [];
    if (!floorIndex) return;

    // Compute ring-1 revealed rooms: adjacent to explored, not explored themselves
    const ring1Revealed = new Set<string>();
    const ring2Peeked = new Set<string>();
    if (!unveilMap) {
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && explored.has(String(exit.target))) { ring1Revealed.add(vnum); break; }
                    }
                }
            }
        }
        for (let bx = bX1; bx <= bX2; bx++) {
            for (let by = bY1; by <= bY2; by++) {
                const bucket = floorIndex[`${bx},${by}`];
                if (!bucket) continue;
                for (let i = 0; i < bucket.length; i++) {
                    const vnum = bucket[i];
                    if (explored.has(vnum) || ring1Revealed.has(vnum)) continue;
                    const rData = preloaded[vnum];
                    if (!rData?.[4]) continue;
                    for (const dir of ['n', 's', 'e', 'w']) {
                        const exit = rData[4][dir];
                        if (exit && ring1Revealed.has(String(exit.target))) { ring2Peeked.add(vnum); break; }
                    }
                }
            }
        }
    }

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const isExplored = explored.has(vnum);
                const rData = preloaded[vnum];
                if (!rData) continue;
                
                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                const zoneName = localRoom?.zone || rData[9] || '';
                const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
                const mergedTerrainColors = {
                    ...terrainColors,
                    ...zoneVis.terrainColors
                };
                const color = getTerrainColor(terrain, isDarkMode, 0.62, mergedTerrainColors);
                const tx = Math.round(rx) * s;
                const ty = Math.round(ry) * s;

                const l = localRoom ? localRoom.light : rData[10];
                const sd = localRoom ? localRoom.sundeath : rData[11];

                const isPermanentSnow = !!(localRoom?.isPermanentSnow);

                if (isExplored) {
                     if (!exploredBatches[color]) exploredBatches[color] = [];
                     exploredBatches[color].push({ x: tx, y: ty, terrain, vnum, light: l, sundeath: sd, isPermanentSnow });
                } else if (ring1Revealed.has(vnum)) {
                     const revealInfo = getRevealSource(vnum, rCtx);
                     if (revealInfo && (rCtx.now - revealInfo.time < 400)) {
                         ring1Animating.push({ x: tx, y: ty, terrain, vnum, revealInfo });
                     } else {
                         if (!ring1Batches[color]) ring1Batches[color] = [];
                         ring1Batches[color].push({ x: tx, y: ty, terrain });
                     }
                } else if (ring2Peeked.has(vnum)) {
                     peekedRooms.push({ tx, ty, terrain, color, vnum });
                } else if (unveilMap) {
                     if (!revealedBatches[color]) revealedBatches[color] = [];
                     revealedBatches[color].push({ x: tx, y: ty, terrain, vnum, light: l, sundeath: sd, isPermanentSnow });
                }
            }
        }
    }

    if (rCtx.camera.zoom < FAR_ZOOM_TERRAIN_LOD && !isTracingMode) {
        const ring1GrayLod = isDarkMode ? '#383838' : '#b0b0b0';
        ctx.save();
        ctx.fillStyle = ring1GrayLod;
        ctx.globalAlpha = 0.45;
        for (const color in ring1Batches) {
            for (const r of ring1Batches[color]) fillTerrainTile(ctx, r.x, r.y, s);
        }
        ctx.restore();
        drawLodBatches(ctx, exploredBatches, s, tileBacking, tileOpacity);
        if (unveilMap) drawLodBatches(ctx, revealedBatches, s, tileBacking, tileOpacity);
        return;
    }

    // Draw ring-1 revealed rooms: flat medium-dark gray tile, no terrain color (made a tad bit darker by reducing opacity to 0.45)
    if (ring1Revealed.size > 0) {
        const ring1Gray = isDarkMode ? '#383838' : '#b0b0b0';
        ctx.save();
        ctx.fillStyle = ring1Gray;
        ctx.globalAlpha = 0.45;
        for (const color in ring1Batches) {
            const rooms = ring1Batches[color];
            for (let i = 0; i < rooms.length; i++) fillTerrainTile(ctx, rooms[i].x, rooms[i].y, s);
        }
        ctx.restore();
    }

    // Draw animating ring-1 revealed rooms: flat medium-dark gray tile, wipe reveal
    if (ring1Animating.length > 0) {
        const ring1Gray = isDarkMode ? '#383838' : '#b0b0b0';
        ctx.save();
        ctx.fillStyle = ring1Gray;
        for (let i = 0; i < ring1Animating.length; i++) {
            const r = ring1Animating[i];
            const elapsed = rCtx.now - r.revealInfo.time;
            const animDur = 400;
            const alphaMul = Math.min(1.0, elapsed / animDur);
            ctx.globalAlpha = 0.45 * alphaMul;
            rCtx.triggerRender?.(); // Force continue animation loop
            
            fillAnimatedTerrainTile(ctx, r.x, r.y, s, r.revealInfo.dir, alphaMul);
        }
        ctx.restore();
    }

    // Draw ring-2 peaked rooms: 25% terrain grayscale, fading to black (opacity 0)
    if (peekedRooms.length > 0) {
        const canvases = getTempCanvases(s);
        if (canvases) {
            const { contentCanvas, contentCtx, maskCanvas, maskCtx } = canvases;
            for (let i = 0; i < peekedRooms.length; i++) {
                const pr = peekedRooms[i];
                const rData = preloaded[pr.vnum];
                if (!rData) continue;
                const ghostExits = rData[4];
                if (!ghostExits) continue;

                const peekDirs: string[] = [];
                for (const dir of ['n', 's', 'e', 'w']) {
                    const exit = ghostExits[dir];
                    if (exit && ring1Revealed.has(String(exit.target))) {
                        peekDirs.push(dir);
                    }
                }
                if (peekDirs.length === 0) continue;

                // 1. Draw Content (Backing + terrain color)
                contentCtx.clearRect(0, 0, s, s);
                contentCtx.fillStyle = tileBacking;
                contentCtx.fillRect(0, 0, s, s);
                contentCtx.fillStyle = pr.color;
                contentCtx.fillRect(0, 0, s, s);

                // Draw terrain icon if zoom > 0.3
                if (rCtx.camera.zoom > 0.3) {
                    const gridX = Math.round(pr.tx / s), gridY = Math.round(pr.ty / s);
                    const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                    drawTerrainTileIcon(contentCtx, 0, 0, s, pr.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather);
                }

                // 2. Draw Mask
                maskCtx.clearRect(0, 0, s, s);
                for (const pd of peekDirs) {
                    let grad: CanvasGradient;
                    if (pd === 'n') {
                        grad = maskCtx.createLinearGradient(0, 0, 0, s * 0.25);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, 0, s, s * 0.25);
                    } else if (pd === 's') {
                        grad = maskCtx.createLinearGradient(0, s, 0, s - s * 0.25);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, s - s * 0.25, s, s * 0.25);
                    } else if (pd === 'e') {
                        grad = maskCtx.createLinearGradient(s, 0, s - s * 0.25, 0);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(s - s * 0.25, 0, s * 0.25, s);
                    } else if (pd === 'w') {
                        grad = maskCtx.createLinearGradient(0, 0, s * 0.25, 0);
                        grad.addColorStop(0, 'rgba(0,0,0,1)');
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, 0, s * 0.25, s);
                    }
                }

                // Apply mask
                contentCtx.save();
                contentCtx.globalCompositeOperation = 'destination-in';
                contentCtx.drawImage(maskCanvas, 0, 0);
                contentCtx.restore();

                // 3. Draw contentCanvas to main canvas (grayscale, alpha = 0.35)
                ctx.save();
                ctx.filter = 'grayscale(1)';
                ctx.globalAlpha = 0.35 * tileOpacity;
                ctx.drawImage(contentCanvas, pr.tx, pr.ty);
                ctx.restore();
            }
        }
    }

    // 1. Draw Explored Rooms
    ctx.save();
    for (const color in exploredBatches) {
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            let alphaMul = 1.0;
            const exploredAt = r.vnum ? rCtx.firstExploredAtRef.current[r.vnum] : 0;
            if (exploredAt) {
                const elapsed = rCtx.now - exploredAt;
                const animDur = 100;
                if (elapsed < animDur) {
                    alphaMul = elapsed / animDur;
                    rCtx.triggerRender?.(); // Keep animating
                    
                    const sourceDir = getSourceDirection(r.vnum, rCtx);
                    if (sourceDir) {
                        ctx.save();
                        if (sourceDir === 'n' || sourceDir === 's' || sourceDir === 'w' || sourceDir === 'e') {
                            // 1. Tile backing
                            ctx.fillStyle = tileBacking;
                            ctx.globalAlpha = tileBackingAlpha;
                            fillAnimatedTerrainTile(ctx, r.x, r.y, s, sourceDir, alphaMul);

                            // 2. Terrain color
                            ctx.fillStyle = color;
                            ctx.globalAlpha = tileOpacity;
                            fillAnimatedTerrainTile(ctx, r.x, r.y, s, sourceDir, alphaMul);

                            // 3. Snow overlay
                            if (r.isPermanentSnow || (rCtx.weather === 'snow' && Number(r.sundeath) !== 0)) {
                                ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
                                ctx.globalAlpha = tileOpacity;
                                fillAnimatedTerrainTile(ctx, r.x, r.y, s, sourceDir, alphaMul);
                            }
                        } else {
                            // 1. Tile backing
                            ctx.fillStyle = tileBacking;
                            ctx.globalAlpha = alphaMul;
                            fillTerrainTile(ctx, r.x, r.y, s);

                            // 2. Terrain color
                            ctx.fillStyle = color;
                            ctx.globalAlpha = alphaMul * tileOpacity;
                            fillTerrainTile(ctx, r.x, r.y, s);

                            // 3. Snow overlay
                            if (r.isPermanentSnow || (rCtx.weather === 'snow' && Number(r.sundeath) !== 0)) {
                                ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
                                ctx.globalAlpha = alphaMul * tileOpacity;
                                fillTerrainTile(ctx, r.x, r.y, s);
                            }
                        }
                        ctx.restore();
                        applyRoomShading(ctx, r, s, alphaMul, rCtx);
                        continue;
                    }
                }
            }
            
            // Draw base terrain
            ctx.save();
            // 1. Tile backing
            ctx.fillStyle = tileBacking;
            ctx.globalAlpha = tileBackingAlpha * alphaMul;
            fillTerrainTile(ctx, r.x, r.y, s);

            // 2. Terrain color
            ctx.fillStyle = color;
            ctx.globalAlpha = alphaMul * tileOpacity;
            fillTerrainTile(ctx, r.x, r.y, s);

            // 3. Snow overlay
            if (r.isPermanentSnow || (rCtx.weather === 'snow' && Number(r.sundeath) !== 0)) {
                ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
                ctx.globalAlpha = alphaMul * tileOpacity;
                fillTerrainTile(ctx, r.x, r.y, s);
            }
            ctx.restore();
            
            applyRoomShading(ctx, r, s, alphaMul, rCtx);
        }
    }
    ctx.restore();

    // 3. Draw Icons for fully explored rooms
    if (rCtx.camera.zoom > 0.3) {
        for (const color in exploredBatches) {
            const rooms = exploredBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                
                ctx.save();
                const exploredAt = r.vnum ? rCtx.firstExploredAtRef.current[r.vnum] : 0;
                if (exploredAt) {
                    const elapsed = rCtx.now - exploredAt;
                    const animDur = 100;
                    if (elapsed < animDur) {
                        const alphaMul = elapsed / animDur;
                        ctx.globalAlpha = alphaMul * tileOpacity;
                        rCtx.triggerRender?.();
                        
                        const sourceDir = getSourceDirection(r.vnum, rCtx);
                        if (sourceDir) {
                            ctx.beginPath();
                            if (sourceDir === 'n') ctx.rect(r.x, r.y, s, s * alphaMul);
                            else if (sourceDir === 's') ctx.rect(r.x, r.y + s * (1 - alphaMul), s, s * alphaMul);
                            else if (sourceDir === 'w') ctx.rect(r.x, r.y, s * alphaMul, s);
                            else if (sourceDir === 'e') ctx.rect(r.x + s * (1 - alphaMul), r.y, s * alphaMul, s);
                            else ctx.rect(r.x, r.y, s, s);
                            ctx.clip();
                        }
                    }
                }
                ctx.globalAlpha = tileOpacity;
                const isSnow = r.isPermanentSnow || rCtx.weather === 'snow';
                drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather);
                drawOutskirtTrees(ctx, r.x, r.y, r.vnum, s, r.terrain, preloaded, isDarkMode, tileOpacity, explored);
                ctx.restore();
            }
        }
    }

    // 3b. Draw Icons for ring-1 revealed rooms: grayscale, dim (made a tad bit darker by reducing opacity to 0.3)
    if (rCtx.camera.zoom > 0.3 && ring1Revealed.size > 0) {
        ctx.save();
        ctx.filter = 'grayscale(1)';
        ctx.globalAlpha = 0.3;
        for (const color in ring1Batches) {
            const rooms = ring1Batches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather);
            }
        }
        ctx.restore();
    }

    // Draw Icons for animating ring-1 revealed rooms: grayscale, dim, wipe reveal
    if (rCtx.camera.zoom > 0.3 && ring1Animating.length > 0) {
        ctx.save();
        ctx.filter = 'grayscale(1)';
        for (let i = 0; i < ring1Animating.length; i++) {
            const r = ring1Animating[i];
            const elapsed = rCtx.now - r.revealInfo.time;
            const animDur = 400;
            const alphaMul = Math.min(1.0, elapsed / animDur);
            
            ctx.save();
            ctx.globalAlpha = 0.3 * alphaMul;
            
            // Clip to wipe path
            ctx.beginPath();
            const inset = getTerrainTileInset(s);
            const ix = r.x + inset;
            const iy = r.y + inset;
            const is = s - inset * 2;
            const dir = r.revealInfo.dir;
            if (dir === 'n') ctx.rect(ix, iy, is, is * alphaMul);
            else if (dir === 's') ctx.rect(ix, iy + is * (1 - alphaMul), is, is * alphaMul);
            else if (dir === 'w') ctx.rect(ix, iy, is * alphaMul, is);
            else if (dir === 'e') ctx.rect(ix + is * (1 - alphaMul), iy, is * alphaMul, is);
            else ctx.rect(ix, iy, is, is);
            ctx.clip();
            
            const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
            const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
            drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather);
            ctx.restore();
        }
        ctx.restore();
    }

    // 4. Handle unveilMap (GM mode / Debug)
    if (unveilMap) {
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                
                // Paint backing to prevent blending with background
                ctx.save();
                ctx.fillStyle = tileBacking;
                ctx.globalAlpha = tileBackingAlpha;
                fillTerrainTile(ctx, r.x, r.y, s);
                ctx.restore();

                ctx.save();
                ctx.fillStyle = color;
                ctx.globalAlpha = tileOpacity;
                fillTerrainTile(ctx, r.x, r.y, s);

                // Snow overlay
                if (r.isPermanentSnow || (rCtx.weather === 'snow' && Number(r.sundeath) !== 0)) {
                    ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
                    fillTerrainTile(ctx, r.x, r.y, s);
                }
                ctx.restore();

                applyRoomShading(ctx, r, s, 1.0, rCtx);
            }
        }

        if (rCtx.camera.zoom > 0.3) {
            for (const color in revealedBatches) {
                const rooms = revealedBatches[color];
                for (let i = 0; i < rooms.length; i++) {
                    const r = rooms[i];
                    const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                    const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                    ctx.save();
                    ctx.globalAlpha = tileOpacity;
                    const isSnow = r.isPermanentSnow || rCtx.weather === 'snow';
                    drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather);
                    drawOutskirtTrees(ctx, r.x, r.y, r.vnum, s, r.terrain, preloaded, isDarkMode, tileOpacity, explored);
                    ctx.restore();
                }
            }
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, imagesRef, mapTileVisuals } = rCtx;
    const terrainColors = mapTileVisuals?.terrainColors;
    const tileOpacity = rCtx.mapTileOpacity ?? 1;
    const s = GRID_SIZE;

    ctx.save();
    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        const zoneName = room.zone || '';
        const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
        const mergedTerrainColors = {
            ...terrainColors,
            ...zoneVis.terrainColors
        };
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode, 0.62, mergedTerrainColors);
        ctx.globalAlpha = tileOpacity;
        fillTerrainTile(ctx, rx, ry, s);

        // Snow overlay
        if (room.isPermanentSnow || (rCtx.weather === 'snow' && Number(room.sundeath) !== 0)) {
            ctx.save();
            ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
            ctx.globalAlpha = tileOpacity;
            fillTerrainTile(ctx, rx, ry, s);
            ctx.restore();
        }
        applyRoomShading(ctx, { ...room, x: rx, y: ry, vnum: String(room.id).startsWith('m_') ? room.id.substring(2) : room.id }, s, 1.0, rCtx);
    }
    // Correctly restore once AFTER the loop
    ctx.restore();

    if (rCtx.camera.zoom > 0.3) {
        for (let i = 0; i < localRooms.length; i++) {
            const room = localRooms[i];
            if (room.id.startsWith('m_')) continue;
            const rz = room.z || 0;
            if (Math.abs(rz - currentZ) > 1.5) continue;
            
            const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
            const gridX = Math.round(room.x), gridY = Math.round(room.y);
            const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
            ctx.save();
            ctx.globalAlpha = tileOpacity;
            const isSnow = room.isPermanentSnow || rCtx.weather === 'snow';
            drawTerrainTileIcon(ctx, rx, ry, s, room.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather);
            ctx.restore();
        }
    }
};
