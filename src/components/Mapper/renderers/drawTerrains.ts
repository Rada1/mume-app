import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, getTerrainName, getGateState } from '../mapperUtils';
import { getZoneVisuals } from '../zoneFilters';
import { perfMonitor } from '../../../utils/perfMonitor';

const TERRAIN_TILE_INSET = 0;
const FAR_ZOOM_TERRAIN_LOD = 0.04;
const OVERVIEW_TERRAIN_ZOOM = 0.15;
export const RING_REVEAL_MS = 0;
export const RING_REVEAL_TOTAL_MS = RING_REVEAL_MS * 2;
export const RING_REVEAL_BAKE_MS = RING_REVEAL_TOTAL_MS;
const RING_REVEAL_OVERLAY_GRACE_MS = 0;
const OUTDOOR_TERRAINS = new Set(['City', 'Field', 'Grasslands', 'Forest', 'Hills', 'Mountains', 'Road', 'Brush', 'Water', 'Shallows', 'Rapids']);

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

const getOverviewTerrainColor = (terrain: string | number, isDarkMode: boolean) => {
    const terrainName = getTerrainName(terrain);
    const rawTerrain = String(terrain || '').toLowerCase();
    switch (terrainName) {
        case 'Water':
        case 'Shallows':
        case 'Rapids':
        case 'Underwater':
            return isDarkMode ? '#2f6f8e' : '#4fa9d8';
        case 'Mountains':
            return isDarkMode ? '#8f8175' : '#b6aaa0';
        case 'Road':
            return isDarkMode ? '#a48752' : '#b99755';
        case 'Forest':
            return isDarkMode ? '#42684a' : '#5f8f67';
        default:
            if (rawTerrain.includes('trail') || rawTerrain.includes('path')) {
                return isDarkMode ? '#a48752' : '#b99755';
            }
            return isDarkMode ? '#242628' : '#55585b';
    }
};

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
    const crownFill  = isDarkMode ? 'rgba(12, 32, 10, 1.0)' : 'rgba(8, 44, 12, 1.0)';
    const crownEdge  = isDarkMode ? 'rgba(4, 14, 4, 1.0)' : 'rgba(3, 20, 5, 1.0)';
    const hlColor    = isDarkMode ? 'rgba(55, 95, 40, 0.22)' : 'rgba(38, 90, 28, 0.22)';

    // Stable per-tree seed in [0,1) from position
    const seed = (Math.abs(Math.sin(cx * 127.1 + baseY * 311.7)) % 1);
    const s2   = (Math.abs(Math.sin(cx * 53.3  + baseY * 191.9)) % 1);

    const tH    = sz * 0.16;
    const tW    = Math.max(1.2, sz * 0.08);
    const cH    = sz * (0.80 + seed  * 0.14);   // height: 0.80–0.94
    const maxHW = sz * (0.26 + s2    * 0.09);   // half-width: 0.26–0.35

    // Slight lean offset (±4% of sz)
    const lean  = (seed - 0.5) * sz * 0.08;

    const trunkTop = baseY - tH;
    const apex     = trunkTop - cH;

    // Ground shadow
    ictx.fillStyle = isDarkMode ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.24)';
    ictx.beginPath();
    ictx.ellipse(cx + 1.2, baseY, maxHW * 0.80, tH * 0.36, 0, 0, Math.PI * 2);
    ictx.fill();

    // Trunk
    ictx.fillStyle = trunkColor;
    ictx.fillRect(cx - tW / 2, trunkTop, tW, tH);

    // Triangular tier with right-face darkening (no canvas shadow — too expensive per-tree).
    const drawTier = (tipY: number, botY: number, hw: number, leanFrac: number) => {
        const tipX = cx + lean * leanFrac;
        // Fill (clean colour)
        ictx.beginPath();
        ictx.moveTo(tipX, tipY);
        ictx.lineTo(cx + hw, botY);
        ictx.lineTo(cx - hw, botY);
        ictx.closePath();
        ictx.fillStyle = crownFill;
        ictx.fill();

        // Right-face darkening for a lit-from-left look
        const midY = (tipY + botY) / 2;
        const rightGrad = ictx.createLinearGradient(tipX, midY, cx + hw, botY);
        rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rightGrad.addColorStop(1, isDarkMode ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.40)');
        ictx.beginPath();
        ictx.moveTo(tipX, tipY);
        ictx.lineTo(cx + hw, botY);
        ictx.lineTo(cx - hw, botY);
        ictx.closePath();
        ictx.fillStyle = rightGrad;
        ictx.fill();

        // Outline
        ictx.strokeStyle = crownEdge;
        ictx.lineWidth = 0.7;
        ictx.beginPath();
        ictx.moveTo(tipX, tipY);
        ictx.lineTo(cx + hw, botY);
        ictx.lineTo(cx - hw, botY);
        ictx.closePath();
        ictx.stroke();
    };

    // Tier 3 — bottom: lean applied least (tilt increases toward apex)
    drawTier(apex + cH * 0.40, trunkTop, maxHW, 0.3);
    // Tier 2 — middle
    drawTier(apex + cH * 0.15, apex + cH * 0.50, maxHW * 0.66, 0.65);
    // Tier 1 — top: full lean at apex
    drawTier(apex, apex + cH * 0.26, maxHW * 0.38, 1.0);

    // Left-side highlight on top tier
    ictx.beginPath();
    ictx.moveTo(cx, apex);
    ictx.lineTo(cx - maxHW * 0.38, apex + cH * 0.26);
    ictx.lineTo(cx, apex + cH * 0.13);
    ictx.closePath();
    ictx.fillStyle = hlColor;
    ictx.fill();
};

// alphaMul < 1 makes specks subtler (e.g. 0.7 for cave floors)
const drawFloorSpeckTexture = (
    ictx: CanvasRenderingContext2D,
    s: number,
    variant: number,
    alphaMul: number = 1.0,
) => {
    const speckCount = 22;
    for (let i = 0; i < speckCount; i++) {
        const s1 = Math.abs(Math.sin((i + variant * 5.3) * 127.1) * 43758.5453) % 1;
        const s2 = Math.abs(Math.sin((i + variant * 5.3) * 311.7 + 1.3) * 43758.5453) % 1;
        const s3 = Math.abs(Math.sin((i + variant * 5.3) * 191.9 + 2.7) * 43758.5453) % 1;
        const px = s1 * s;
        const py = s2 * s;
        const r = 0.7 + s3 * 1.4;
        const isLight = i % 3 === 0;
        const alpha = (0.07 + s3 * 0.08) * alphaMul;
        ictx.fillStyle = isLight ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
        ictx.beginPath();
        ictx.arc(px, py, r, 0, Math.PI * 2);
        ictx.fill();
    }
};

const drawSingleStone = (
    ictx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    sz: number,
    isDarkMode: boolean
) => {
    const rw = sz * 0.52;
    const rh = sz * 0.32;

    // Ground shadow
    ictx.fillStyle = isDarkMode ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.25)';
    ictx.beginPath();
    ictx.ellipse(cx + sz * 0.08, cy + rh * 0.55, rw * 0.85, rh * 0.40, 0, 0, Math.PI * 2);
    ictx.fill();

    // Stone body
    const bodyGrad = ictx.createLinearGradient(cx - rw, cy - rh, cx + rw, cy + rh);
    bodyGrad.addColorStop(0, isDarkMode ? 'rgba(105,105,108,1)' : 'rgba(148,148,152,1)');
    bodyGrad.addColorStop(1, isDarkMode ? 'rgba(52,52,56,1)'  : 'rgba(88,88,92,1)');
    ictx.beginPath();
    ictx.ellipse(cx, cy, rw, rh, -0.15, 0, Math.PI * 2);
    ictx.fillStyle = bodyGrad;
    ictx.fill();

    // Edge outline
    ictx.strokeStyle = isDarkMode ? 'rgba(30,30,32,0.80)' : 'rgba(55,55,58,0.70)';
    ictx.lineWidth = 0.6;
    ictx.stroke();

    // Top-left highlight
    ictx.beginPath();
    ictx.ellipse(cx - rw * 0.22, cy - rh * 0.28, rw * 0.38, rh * 0.28, -0.3, 0, Math.PI * 2);
    ictx.fillStyle = isDarkMode ? 'rgba(180,180,185,0.18)' : 'rgba(220,220,225,0.30)';
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
    explored: Set<string>,
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>
) => {
    const transform = ctx.getTransform();
    const physicalSize = s * transform.a;
    if (physicalSize < 18) return;

    const tName = getTerrainName(terrain);
    if (tName === 'Forest') return;
    if (!OUTDOOR_TERRAINS.has(tName)) return;

    const rData = preloaded[vnum];
    if (!rData || !rData[4]) return;

    const gridX = Math.round(rx / s);
    const gridY = Math.round(ry / s);
    const exits = rData[4] as Record<string, any>;

    const trees1Img = imagesRef.current['trees1'];
    const trees2Img = imagesRef.current['trees2'];
    const trees3Img = imagesRef.current['trees3'];
    const treeImg = imagesRef.current['tree'];
    const treesImgReady = !!(
        trees1Img && trees1Img.complete && trees1Img.naturalWidth > 0 &&
        trees2Img && trees2Img.complete && trees2Img.naturalWidth > 0 &&
        trees3Img && trees3Img.complete && trees3Img.naturalWidth > 0
    );
    const singleTreeReady = !!(treeImg && treeImg.complete && treeImg.naturalWidth > 0);

    for (const dir of ['n', 's', 'e', 'w']) {
        const exit = exits[dir];
        if (exit) {
            const targetData = preloaded[String(exit.target)];
            if (targetData && getTerrainName(targetData[3]) === 'Forest') {
                ctx.save();
                // slightly dimmer if target forest is unexplored
                ctx.globalAlpha = tileOpacity * 0.82 * (explored.has(String(exit.target)) ? 1.0 : 0.45);

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

                    const tSize = s * 0.33;
                    ctx.save();
                    ctx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)';
                    ctx.shadowBlur = s * 0.03;
                    ctx.shadowOffsetX = s * 0.01;
                    ctx.shadowOffsetY = s * 0.015;

                    if (treesImgReady) {
                        const images = [trees1Img, trees2Img, trees3Img];
                        const imgIndex = Math.floor((treeSeed * 10 + j) % 3);
                        const img = images[imgIndex];
                        const sizeMultiplier = imgIndex === 2 ? 1.25 : 1.0;
                        const tW = tSize * sizeMultiplier;
                        const tH = tW * 1.15;
                        ctx.drawImage(img, tx - tW / 2, ty - tH, tW, tH);
                    } else if (singleTreeReady) {
                        const tW = tSize;
                        const tH = tW * 1.15;
                        ctx.drawImage(treeImg, tx - tW / 2, ty - tH, tW, tH);
                    } else {
                        drawSingleTree(ctx, tx, ty, tSize, isDarkMode);
                    }
                    ctx.restore();
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

// Returns a bitmask of which directions lead to a neighbouring Tunnel or Cavern room.
const getCaveConnects = (vnum: string, preloaded: any): number => {
    const rData = preloaded[vnum];
    if (!rData || !rData[4]) return 0;
    const exits = rData[4] as Record<string, any>;
    let bits = 0;
    for (const [dir, exit] of Object.entries(exits)) {
        if (!exit?.target) continue;
        const tData = preloaded[String(exit.target)];
        if (tData) {
            if (dir === 'n') bits |= 1;
            else if (dir === 's') bits |= 2;
            else if (dir === 'e') bits |= 4;
            else if (dir === 'w') bits |= 8;
        }
    }
    return bits;
};

export const getRoomWalls = (
    room: any,
    exits: any,
    allRooms: any,
    preloaded: any,
    explored: Set<string>,
    unveilMap: boolean
) => {
    const isExplored = (targetVnum: any) => targetVnum && explored.has(String(targetVnum));
    const exitN = exits?.['n'];
    const exitS = exits?.['s'];
    const exitE = exits?.['e'];
    const exitW = exits?.['w'];

    const wallN = !getGateState(room, exits, 'n', allRooms, preloaded).hasExit || (!unveilMap && exitN && !isExplored(exitN.target));
    const wallS = !getGateState(room, exits, 's', allRooms, preloaded).hasExit || (!unveilMap && exitS && !isExplored(exitS.target));
    const wallE = !getGateState(room, exits, 'e', allRooms, preloaded).hasExit || (!unveilMap && exitE && !isExplored(exitE.target));
    const wallW = !getGateState(room, exits, 'w', allRooms, preloaded).hasExit || (!unveilMap && exitW && !isExplored(exitW.target));

    return { n: wallN, s: wallS, e: wallE, w: wallW };
};

const getOutdoorSpillWalls = (
    terrain: any,
    exits: any,
    preloaded: any,
    walls: { n: boolean; s: boolean; e: boolean; w: boolean },
    gridX?: number,
    gridY?: number,
    roomAtCoord?: Record<string, any>
) => {
    const tName = getTerrainName(terrain);
    if (tName !== 'Forest' && tName !== 'Mountains') return walls;

    const blocksNonOutdoor = (dir: 'n' | 's' | 'e' | 'w') => {
        const target = exits?.[dir]?.target;
        if (!target) return true;
        const targetData = preloaded[String(target)];
        if (!targetData) return true;
        const targetTerrain = getTerrainName(targetData[3]);
        return !OUTDOOR_TERRAINS.has(targetTerrain);
    };

    const isNeighborForest = (dir: 'n' | 's' | 'e' | 'w') => {
        if (tName === 'Forest' && gridX !== undefined && gridY !== undefined && roomAtCoord) {
            let nx = gridX;
            let ny = gridY;
            if (dir === 'n') ny -= 1;
            else if (dir === 's') ny += 1;
            else if (dir === 'e') nx += 1;
            else if (dir === 'w') nx -= 1;
            
            const neighborTerrain = roomAtCoord[`${nx},${ny}`];
            if (neighborTerrain && getTerrainName(neighborTerrain) === 'Forest') {
                return true;
            }
        }
        return false;
    };

    return {
        n: isNeighborForest('n') ? false : (walls.n || blocksNonOutdoor('n')),
        s: isNeighborForest('s') ? false : (walls.s || blocksNonOutdoor('s')),
        e: isNeighborForest('e') ? false : (walls.e || blocksNonOutdoor('e')),
        w: isNeighborForest('w') ? false : (walls.w || blocksNonOutdoor('w')),
    };
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
    weather?: string,
    connects: number = 0,
    floorColor?: string,
    walls?: { n: boolean; s: boolean; e: boolean; w: boolean }
) => {
    const tName = getTerrainName(terrain);
    const inset = tName === 'Forest' ? 0 : getTerrainTileInset(s);
    drawTerrainIcon(
        ctx,
        x + inset,
        y + inset,
        s - inset * 2,
        terrain,
        isDarkMode,
        processedIconsRef,
        imagesRef,
        variant,
        weather,
        connects,
        floorColor,
        walls,
        x,
        y,
        s
    );
};

export const drawTerrainIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s_orig: number,
    terrain: any,
    isDarkMode: boolean,
    processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>,
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>,
    variant: number = 0,
    weather?: string,
    connects: number = 0,
    floorColor?: string,
    walls?: { n: boolean; s: boolean; e: boolean; w: boolean },
    tileX?: number,
    tileY?: number,
    tileS?: number
) => {
    const tName = getTerrainName(terrain);
    const transform = ctx.getTransform();
    const physicalSize = s_orig * transform.a;

    const trees1Img = imagesRef.current['trees1'];
    const trees2Img = imagesRef.current['trees2'];
    const trees3Img = imagesRef.current['trees3'];
    const treeImg = imagesRef.current['tree'];
    const treesImgReady = !!(
        trees1Img && trees1Img.complete && trees1Img.naturalWidth > 0 &&
        trees2Img && trees2Img.complete && trees2Img.naturalWidth > 0 &&
        trees3Img && trees3Img.complete && trees3Img.naturalWidth > 0
    );
    const singleTreeReady = !!(treeImg && treeImg.complete && treeImg.naturalWidth > 0);

    let lodScale = 1.0;
    if (physicalSize < 10) {
        lodScale = 0.33; // 8x8 icon resolution
    } else if (physicalSize < 18) {
        lodScale = 0.5;  // 12x12 icon resolution
    }

    const s = Math.max(4, Math.round(s_orig * lodScale));
    const variantSpecificTerrains = ['Hills', 'Forest', 'Brush', 'Mountains', 'Field', 'Cavern', 'Tunnel', 'Water', 'Shallows', 'Rapids', 'City', 'Underwater', 'Building', 'Road'];
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
            tName === 'Hills' ? `_h${hillImgReady ? 1 : 0}` :
            (tName === 'Tunnel' || tName === 'Cavern') ? `_c${connects}_f${floorColor || ''}` : ''
          }`
        : `${tName}_${isDarkMode}_s${iconSize}_w${weather || 'none'}_v66`;
    
    if (!processedIconsRef.current[key]) {
        let targetW = s;
        let targetH = s;
        if (tName === 'Mountains' && mountainImgReady) {
            const ratio = mountainImg!.naturalHeight / mountainImg!.naturalWidth;
            // Scale down all but 1 variant to create more organic size variance
            const scale = (variant % 3 === 0) ? 1.3 : (variant % 3 === 1 ? 0.85 : 0.98);
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

            const drawMountainTree = (cx: number, baseY: number, sz: number) => {
                ictx.save();
                ictx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)';
                ictx.shadowBlur = s * 0.03;
                ictx.shadowOffsetX = s * 0.01;
                ictx.shadowOffsetY = s * 0.015;
                ictx.globalAlpha = 0.82;

                if (treesImgReady) {
                    const imgIndex = Math.floor((Math.abs(Math.sin(cx * 17.3 + baseY * 29.7)) * 1000) % 3);
                    const img = [trees1Img, trees2Img, trees3Img][imgIndex];
                    const sizeMultiplier = imgIndex === 2 ? 1.25 : 1.0;
                    const tW = sz * sizeMultiplier;
                    const tH = tW * 1.15;
                    ictx.drawImage(img, cx - tW / 2, baseY - tH, tW, tH);
                } else if (singleTreeReady) {
                    const tW = sz;
                    const tH = sz * 1.15;
                    ictx.drawImage(treeImg, cx - tW / 2, baseY - tH, tW, tH);
                } else {
                    drawSingleTree(ictx, cx, baseY, sz, isDarkMode);
                }
                ictx.restore();
            };

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
                drawMountainTree(offsetX + targetW * 0.12, canvasH - targetH * 0.05, s * 0.40);
                drawMountainTree(offsetX + targetW * 0.88, canvasH - targetH * 0.07, s * 0.37);
                drawMountainTree(offsetX + targetW * 0.25, canvasH - targetH * 0.02, s * 0.33);

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
            drawMountainTree(s * 0.12, s * 0.90, s * 0.40);
            drawMountainTree(s * 0.88, s * 0.92, s * 0.37);
            drawMountainTree(s * 0.25, s * 0.95, s * 0.33);
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

            const trees1Img = imagesRef.current['trees1'];
            const trees2Img = imagesRef.current['trees2'];
            const trees3Img = imagesRef.current['trees3'];
            const treesImgReady = !!(
                trees1Img && trees1Img.complete && trees1Img.naturalWidth > 0 &&
                trees2Img && trees2Img.complete && trees2Img.naturalWidth > 0 &&
                trees3Img && trees3Img.complete && trees3Img.naturalWidth > 0
            );

            const offsetX = (canvasW - s) / 2;
            const offsetY = canvasH - s;

            if (treesImgReady) {
                // Draw a bit of grass background for texture depth
                drawGrassTexture(ictx, s, variant, isDarkMode, 4);

                // Stable grid coordinates for deterministic placement
                const gridX = tileX !== undefined ? Math.round(tileX / s_orig) : variant * 17;
                const gridY = tileY !== undefined ? Math.round(tileY / s_orig) : variant * 29;

                // Deterministic PRNG based on grid coordinates
                const tileSeed = gridX * 17.3 + gridY * 29.7;
                let rVal = Math.abs(Math.sin(tileSeed) * 43758.5453) % 1;
                const nextRand = () => {
                    rVal = Math.abs(Math.sin(rVal * 93.1 + 12.7) * 43758.5453) % 1;
                    return rVal;
                };

                const treesList: { xf: number; yf: number; scale: number }[] = [];
                
                // Distribute trees using a jittered 3x4 grid to ensure even, standardized coverage
                for (let row = 0; row < 4; row++) {
                    for (let col = 0; col < 3; col++) {
                        // 15% chance to skip a tree to add natural density variance (averages 10-11 trees per tile)
                        if (nextRand() < 0.15) continue;

                        // Nominal grid center
                        const nominalX = -0.05 + col * 0.55; // Spans -0.05 to 1.05
                        const nominalY = 0.10 + row * 0.26;  // Spans 0.10 to 0.88

                        // Apply random jitter to avoid a rigid appearance
                        const jitterX = (nextRand() - 0.5) * 0.22;
                        const jitterY = (nextRand() - 0.5) * 0.14;

                        treesList.push({
                            xf: nominalX + jitterX,
                            yf: nominalY + jitterY,
                            scale: 0.35 + nextRand() * 0.15 // Scale ranges 0.35 to 0.50
                        });
                    }
                }
                // Sort by baseline yf so they draw back-to-front correctly
                treesList.sort((a, b) => a.yf - b.yf);

                ictx.save();
                ictx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.45)';
                ictx.shadowBlur = s * 0.04;
                ictx.shadowOffsetX = s * 0.015;
                ictx.shadowOffsetY = s * 0.025;
                ictx.globalAlpha = 0.82;

                const images = [trees1Img, trees2Img, trees3Img];
                for (let i = 0; i < treesList.length; i++) {
                    const t = treesList[i];
                    // Cycle the image so each tile has variety
                    const imgIndex = Math.floor(nextRand() * 3);
                    const img = images[imgIndex];
                    const sizeMultiplier = imgIndex === 2 ? 1.25 : 1.0;
                    const drawW = s * (t.scale * sizeMultiplier);
                    const drawH = s * ((t.scale * sizeMultiplier) * 1.15); // slightly taller
                    const tx = offsetX + t.xf * s - drawW / 2;
                    const ty = offsetY + t.yf * s - drawH;
                    ictx.drawImage(img, tx, ty, drawW, drawH);
                }
                ictx.restore();
            } else {
                // Tree icons: visible trunk + vertically-elongated crown, sorted back-to-front.
                // [cx_frac, baseY_frac, size_frac]
                type TreeDef = [number, number, number];
                const treeLayouts: TreeDef[][] = [
                    [
                        [0.20, 0.12, 0.42], [0.72, 0.10, 0.58],
                        [0.10, 0.45, 0.62], [0.52, 0.48, 0.45], [0.88, 0.44, 0.55],
                        [0.35, 0.80, 0.50],
                    ],
                    [
                        [0.18, 0.10, 0.60], [0.65, 0.12, 0.44],
                        [0.40, 0.46, 0.55], [0.85, 0.42, 0.63],
                        [0.12, 0.78, 0.46], [0.60, 0.80, 0.57],
                    ],
                    [
                        [0.28, 0.10, 0.56], [0.80, 0.13, 0.43],
                        [0.08, 0.48, 0.64], [0.55, 0.44, 0.48],
                        [0.30, 0.78, 0.42], [0.82, 0.76, 0.59],
                    ]
                ];
                const trees = [...treeLayouts[variant % 3]].sort((a, b) => a[1] - b[1]);

                // [cx_frac, cy_frac, size_frac]
                type StoneDef = [number, number, number];
                const stoneLayouts: StoneDef[][] = [
                    [[0.62, 0.30, 0.10], [0.25, 0.65, 0.08]],
                    [[0.78, 0.58, 0.09], [0.45, 0.28, 0.10]],
                    [[0.50, 0.62, 0.09], [0.18, 0.38, 0.08]],
                ];
                const stones = stoneLayouts[variant % 3];

                // 1. Draw a dense background canopy using overlapping filled/stroked ellipses (very cheap)
                ictx.fillStyle = isDarkMode ? 'rgba(8, 20, 8, 0.95)' : 'rgba(5, 32, 8, 0.9)';
                ictx.beginPath();
                ictx.ellipse(offsetX + s * 0.3, offsetY + s * 0.32, s * 0.33, s * 0.28, 0, 0, Math.PI * 2);
                ictx.ellipse(offsetX + s * 0.72, offsetY + s * 0.28, s * 0.38, s * 0.32, 0, 0, Math.PI * 2);
                ictx.ellipse(offsetX + s * 0.52, offsetY + s * 0.44, s * 0.32, s * 0.26, 0, 0, Math.PI * 2);
                ictx.fill();

                // Stroke the canopy outline for the hand-drawn sketch style
                ictx.strokeStyle = isDarkMode ? 'rgba(3, 10, 3, 0.9)' : 'rgba(2, 16, 4, 0.85)';
                ictx.lineWidth = 0.8;
                ictx.stroke();

                // 2. Draw ground stones
                ictx.globalAlpha = 0.5;
                for (const [cxf, cyf, szf] of stones) {
                    drawSingleStone(ictx, offsetX + cxf * s, offsetY + cyf * s, szf * s, isDarkMode);
                }

                // 3. Render only the 2 foreground 'hero' trees to overlap the canopy
                const heroTrees = trees.slice(-2);
                for (const [cxf, byf, szf] of heroTrees) {
                    const j1 = (Math.abs(Math.sin((cxf * 137 + variant * 11.3) * 43758.5453)) % 1 - 0.5) * s * 0.04;
                    drawSingleTree(ictx, offsetX + cxf * s + j1, offsetY + byf * s, szf * s, isDarkMode);
                }
                ictx.globalAlpha = 1.0;
            }

            ictx.restore();
        } else if (tName === 'Field') {
            drawGrassTexture(ictx, s, variant, isDarkMode, 14);
        } else if (tName === 'Brush') {
            // Draw grass texture under the brush icons
            drawGrassTexture(ictx, s, variant, isDarkMode, 6);

            ictx.font = `${Math.round(s * 0.35)}px monospace`;
            const brushColors = isDarkMode ? [
                "rgba(141, 110, 80, 0.55)", "rgba(122, 95, 66, 0.55)"
            ] : [
                "rgba(101, 67, 33, 0.55)", "rgba(115, 82, 45, 0.55)"
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
        } else if (tName === 'Shallows') {
            ictx.save();
            // Draw a bit of sparse background grass
            drawGrassTexture(ictx, s, variant, isDarkMode, 3);

            // Draw tall swamp reed clusters
            ictx.save();
            const reedColor = isDarkMode ? 'rgba(110, 155, 90, 0.70)' : 'rgba(50, 110, 40, 0.65)';
            ictx.strokeStyle = reedColor;
            ictx.lineWidth = 0.8;
            ictx.lineCap = 'round';
            const reedCount = 5 + (variant % 3); // 5 to 7 reed clusters
            for (let i = 0; i < reedCount; i++) {
                const s1 = Math.abs(Math.sin((i * 12.3 + variant * 8.7) * 113.1)) % 1;
                const s2 = Math.abs(Math.sin((i * 5.7 + variant * 11.1) * 157.9)) % 1;
                const s3 = Math.abs(Math.sin((i * 9.1 + variant * 3.3) * 271.3)) % 1;
                
                const rx = s1 * s;
                const ry = s2 * s;
                
                // Draw a cluster of 3 reeds growing out of (rx, ry)
                // Center reed: tall
                const h1 = 5 + s3 * 4;
                ictx.beginPath();
                ictx.moveTo(rx, ry);
                ictx.quadraticCurveTo(rx - 0.5, ry - h1/2, rx - 1, ry - h1);
                ictx.stroke();
                
                // Left reed: slightly bent left
                const h2 = 4 + s3 * 3;
                ictx.beginPath();
                ictx.moveTo(rx, ry);
                ictx.quadraticCurveTo(rx - 1.5, ry - h2/2, rx - 3, ry - h2);
                ictx.stroke();
                
                // Right reed: slightly bent right
                const h3 = 3.5 + s3 * 3;
                ictx.beginPath();
                ictx.moveTo(rx, ry);
                ictx.quadraticCurveTo(rx + 1.5, ry - h3/2, rx + 2.5, ry - h3);
                ictx.stroke();
            }
            ictx.restore();

            // Murky water blotches (swamp puddles)
            const waterBlotchColor = isDarkMode ? 'rgba(38, 77, 89, 0.50)' : 'rgba(56, 116, 133, 0.45)';
            const blotchCount = 3 + (variant % 3); // 3 to 5 puddles
            for (let i = 0; i < blotchCount; i++) {
                const s1 = Math.abs(Math.sin((i * 4.7 + variant * 7.1) * 113.1)) % 1;
                const s2 = Math.abs(Math.sin((i * 6.3 + variant * 3.3) * 157.9)) % 1;
                const s3 = Math.abs(Math.sin((i * 2.9 + variant * 5.5) * 271.3)) % 1;
                
                const bx = s1 * s;
                const by = s2 * s;
                const rw = s * (0.07 + s3 * 0.08); // width (3.5 to 7.5 pixels)
                const rh = s * (0.04 + s3 * 0.05); // height (2.0 to 4.5 pixels)
                const rot = (s3 - 0.5) * Math.PI;  // rotation
                
                ictx.fillStyle = waterBlotchColor;
                ictx.beginPath();
                ictx.ellipse(bx, by, rw, rh, rot, 0, Math.PI * 2);
                ictx.fill();
            }
            ictx.restore();
        } else if (tName === 'Water' || tName === 'Rapids' || tName === 'Underwater') {
            ictx.font = `${Math.round(s * 0.45)}px monospace`;
            
            let waterColors: string[];
            if (tName === 'Rapids') {
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
            // Same as Tunnel but wider (hw = 0.44s) and gray-toned instead of brown.
            const cnoise = (i: number) => (Math.abs(Math.sin(variant * 31.7 + i * 127.1)) % 1);
            const ccx = s / 2, ccy = s / 2;
            const chw = s * 0.44; // wider than tunnel

            const cHasN = !!(connects & 1);
            const cHasS = !!(connects & 2);
            const cHasE = !!(connects & 4);
            const cHasW = !!(connects & 8);

            // Outer area: fixed dark so color picker doesn't affect it
            ictx.fillStyle = isDarkMode ? 'rgba(10, 9, 11, 1)' : 'rgba(18, 16, 20, 1)';
            ictx.fillRect(0, 0, s, s);

            ictx.save();
            ictx.beginPath();
            ictx.rect(ccx - chw, ccy - chw, chw * 2, chw * 2);
            if (cHasN) ictx.rect(ccx - chw, 0,        chw * 2, ccy - chw);
            if (cHasS) ictx.rect(ccx - chw, ccy + chw, chw * 2, s - (ccy + chw));
            if (cHasE) ictx.rect(ccx + chw, ccy - chw, s - (ccx + chw), chw * 2);
            if (cHasW) ictx.rect(0,         ccy - chw, ccx - chw, chw * 2);
            ictx.clip();

            // Floor — user-picked color, darkened slightly, + speck texture
            ictx.fillStyle = floorColor || 'rgba(14, 11, 12, 1)';
            ictx.fillRect(0, 0, s, s);
            drawFloorSpeckTexture(ictx, s, variant, 0.65);

            ictx.restore();

            // Jagged wall edges — all four sides closed (pocket room)
            const cwallW = Math.max(2, s * 0.055);
            const cjagAmp = s * 0.028;

            const drawCavWall = (x1: number, y1: number, x2: number, y2: number) => {
                const steps = 7;
                ictx.save();
                ictx.lineWidth = cwallW * 2.2;
                ictx.strokeStyle = 'rgba(6, 5, 6, 1)';
                ictx.lineCap = 'square';
                ictx.lineJoin = 'round';
                
                // Drop shadow for the inner wall edge
                ictx.shadowColor = 'rgba(0, 0, 0, 0.85)';
                ictx.shadowBlur = s * 0.14;
                ictx.shadowOffsetX = 0;
                ictx.shadowOffsetY = 0;
                
                ictx.beginPath();
                ictx.moveTo(x1, y1);
                for (let k = 1; k <= steps; k++) {
                    const t = k / steps;
                    const jitter = (cnoise(k * 7 + x1 * 0.1 + y1 * 0.1) - 0.5) * cjagAmp * 2;
                    const isV = Math.abs(x2 - x1) < 1;
                    ictx.lineTo(
                        x1 + (x2 - x1) * t + (isV ? jitter : 0),
                        y1 + (y2 - y1) * t + (isV ? 0 : jitter)
                    );
                }
                ictx.lineTo(x2, y2);
                ictx.stroke();
                
                // Disable shadow for the highlight stroke
                ictx.shadowColor = 'transparent';
                ictx.shadowBlur = 0;
                
                ictx.lineWidth = cwallW * 0.6;
                ictx.strokeStyle = isDarkMode ? 'rgba(68, 68, 76, 0.50)' : 'rgba(88, 88, 98, 0.55)';
                ictx.stroke();
                ictx.restore();
            };

            if (!cHasN) drawCavWall(ccx - chw, ccy - chw, ccx + chw, ccy - chw);
            if (!cHasS) drawCavWall(ccx - chw, ccy + chw, ccx + chw, ccy + chw);
            if (!cHasW) drawCavWall(ccx - chw, ccy - chw, ccx - chw, ccy + chw);
            if (!cHasE) drawCavWall(ccx + chw, ccy - chw, ccx + chw, ccy + chw);
        } else if (tName === 'Tunnel') {
            // Top-down cave trench: dark rocky floor, jagged wall edges running toward neighbouring tunnels.
            const hasN = !!(connects & 1);
            const hasS = !!(connects & 2);
            const hasE = !!(connects & 4);
            const hasW = !!(connects & 8);
            const cx2 = s / 2, cy2 = s / 2;
            const hw = s * 0.30; // half-width of trench

            // Stable per-tile noise helper
            const tnoise = (i: number) => (Math.abs(Math.sin(variant * 31.7 + i * 127.1 + connects * 53.3)) % 1);

            // --- Floor ---
            // Outer area (between tile edge and wall): fixed dark so color picker doesn't affect it
            ictx.fillStyle = isDarkMode ? 'rgba(10, 9, 11, 1)' : 'rgba(18, 16, 20, 1)';
            ictx.fillRect(0, 0, s, s);

            // Inner corridor: clipped to the footprint, colored by picker
            ictx.save();
            ictx.beginPath();
            ictx.rect(cx2 - hw, cy2 - hw, hw * 2, hw * 2);
            if (hasN) ictx.rect(cx2 - hw, 0,        hw * 2, cy2 - hw);
            if (hasS) ictx.rect(cx2 - hw, cy2 + hw, hw * 2, s - (cy2 + hw));
            if (hasE) ictx.rect(cx2 + hw, cy2 - hw, s - (cx2 + hw), hw * 2);
            if (hasW) ictx.rect(0,        cy2 - hw, cx2 - hw, hw * 2);
            ictx.clip();

            ictx.fillStyle = floorColor || 'rgba(14, 11, 9, 1)';
            ictx.fillRect(0, 0, s, s);
            drawFloorSpeckTexture(ictx, s, variant, 0.65);

            ictx.restore();

            // --- Jagged wall edges ---
            // Draw a thick dark stroke along each wall edge, then a jagged highlight on top
            const wallW = Math.max(2, s * 0.055);
            const jagAmp = s * 0.028; // jaggedness amplitude
            const jagSteps = 7;

            const drawJaggedWall = (x1: number, y1: number, x2: number, y2: number) => {
                // Dark wall fill (thick)
                ictx.save();
                ictx.lineWidth = wallW * 2.2;
                ictx.strokeStyle = 'rgba(6, 5, 4, 1)';
                ictx.lineCap = 'square';
                ictx.lineJoin = 'round';
                
                // Drop shadow for the inner wall edge
                ictx.shadowColor = 'rgba(0, 0, 0, 0.85)';
                ictx.shadowBlur = s * 0.14;
                ictx.shadowOffsetX = 0;
                ictx.shadowOffsetY = 0;
                
                ictx.beginPath();
                ictx.moveTo(x1, y1);
                for (let k = 1; k <= jagSteps; k++) {
                    const t = k / jagSteps;
                    const jitter = (tnoise(k * 7 + x1 * 0.1 + y1 * 0.1) - 0.5) * jagAmp * 2;
                    const isV = Math.abs(x2 - x1) < 1; // vertical line
                    ictx.lineTo(
                        x1 + (x2 - x1) * t + (isV ? jitter : 0),
                        y1 + (y2 - y1) * t + (isV ? 0 : jitter)
                    );
                }
                ictx.lineTo(x2, y2);
                ictx.stroke();
                
                // Disable shadow for the highlight stroke
                ictx.shadowColor = 'transparent';
                ictx.shadowBlur = 0;
                
                // Lighter crumbled-edge highlight
                ictx.lineWidth = wallW * 0.6;
                ictx.strokeStyle = isDarkMode ? 'rgba(55, 45, 32, 0.55)' : 'rgba(80, 65, 44, 0.60)';
                ictx.stroke();
                ictx.restore();
            };

            if (hasN) {
                drawJaggedWall(cx2 - hw, 0,        cx2 - hw, cy2 - hw);
                drawJaggedWall(cx2 + hw, 0,        cx2 + hw, cy2 - hw);
            }
            if (hasS) {
                drawJaggedWall(cx2 - hw, cy2 + hw, cx2 - hw, s);
                drawJaggedWall(cx2 + hw, cy2 + hw, cx2 + hw, s);
            }
            if (hasE) {
                drawJaggedWall(cx2 + hw, cy2 - hw, s,        cy2 - hw);
                drawJaggedWall(cx2 + hw, cy2 + hw, s,        cy2 + hw);
            }
            if (hasW) {
                drawJaggedWall(0,        cy2 - hw, cx2 - hw, cy2 - hw);
                drawJaggedWall(0,        cy2 + hw, cx2 - hw, cy2 + hw);
            }
            // Closed-end wall caps
            if (!hasN) {
                drawJaggedWall(cx2 - hw, cy2 - hw, cx2 + hw, cy2 - hw);
            }
            if (!hasS) {
                drawJaggedWall(cx2 - hw, cy2 + hw, cx2 + hw, cy2 + hw);
            }
            if (!hasE) {
                drawJaggedWall(cx2 + hw, cy2 - hw, cx2 + hw, cy2 + hw);
            }
            if (!hasW) {
                drawJaggedWall(cx2 - hw, cy2 - hw, cx2 - hw, cy2 + hw);
            }
        } else if (tName === 'Building') {
            drawFloorSpeckTexture(ictx, s, variant, 1.0);
        } else if (tName === 'Road') {
            const roadStoneLayouts = [
                [[0.20, 0.20, 0.09], [0.80, 0.80, 0.07], [0.25, 0.75, 0.06]],
                [[0.80, 0.20, 0.08], [0.20, 0.80, 0.10], [0.75, 0.75, 0.05]],
                [[0.18, 0.22, 0.07], [0.82, 0.22, 0.09], [0.20, 0.78, 0.08]],
                [[0.22, 0.78, 0.10], [0.78, 0.78, 0.07], [0.80, 0.20, 0.06]],
                [[0.18, 0.18, 0.06], [0.82, 0.18, 0.07], [0.82, 0.82, 0.05], [0.18, 0.82, 0.08]],
                [[0.25, 0.18, 0.07], [0.78, 0.25, 0.09], [0.18, 0.75, 0.06], [0.75, 0.80, 0.08]],
            ];
            const stones = roadStoneLayouts[variant % roadStoneLayouts.length];
            ictx.save();
            drawGrassTexture(ictx, s, variant, isDarkMode, 3); // subtle sparse grass around the road
            for (const [cxf, cyf, szf] of stones) {
                drawSingleStone(ictx, cxf * s, cyf * s, szf * s, isDarkMode);
            }
            ictx.restore();
        }
        processedIconsRef.current[key] = iconCanvas;
    }

      const cachedIcon = processedIconsRef.current[key];
      if (cachedIcon) {
          const drawW = cachedIcon.width / lodScale;
          const drawH = cachedIcon.height / lodScale;
          let offsetX = x - (drawW - s_orig) / 2;
          let offsetY = y - (drawH - s_orig);

          if (tName === 'Hills') {
              // Deterministic pseudo-random offset between -12% and +12% of tile size s_orig
              const s1 = Math.abs(Math.sin(variant * 17.3) * 43758.5453) % 1;
              const s2 = Math.abs(Math.sin(variant * 29.7) * 43758.5453) % 1;
              offsetX += (s1 - 0.5) * s_orig * 0.34;
              offsetY += (s2 - 0.5) * s_orig * 0.30;
          } else if (tName === 'Mountains') {
              const s1 = Math.abs(Math.sin(variant * 29.7) * 43758.5453) % 1;
              const s2 = Math.abs(Math.sin(variant * 17.3) * 43758.5453) % 1;
              offsetX += (s2 - 0.5) * s_orig * 0.24;
              offsetY += (s1 - 0.5) * s_orig * 0.42;
          }

          let clipped = false;
          if (lodScale === 1.0 && walls && tileX !== undefined && tileY !== undefined && tileS !== undefined) {
              const clipLeft = walls.w ? tileX : tileX - tileS * 1.5;
              const clipRight = walls.e ? tileX + tileS : tileX + tileS * 2.5;
              const clipTop = walls.n ? tileY : tileY - tileS * 1.5;
              const clipBottom = walls.s ? tileY + tileS : tileY + tileS * 2.5;

              ctx.save();
              ctx.beginPath();
              ctx.rect(clipLeft, clipTop, clipRight - clipLeft, clipBottom - clipTop);
              ctx.clip();
              clipped = true;
          }

          ctx.drawImage(cachedIcon, offsetX, offsetY, drawW, drawH);

          if (clipped) {
              ctx.restore();
          }
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

const buildRevealRings = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { explored, preloaded, unveilMap } = rCtx;
    const ring1Revealed = new Set<string>();
    const ring2Peeked = new Set<string>();
    if (unveilMap) return { ring1Revealed, ring2Peeked };

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
                    if (exit && explored.has(String(exit.target))) {
                        ring1Revealed.add(vnum);
                        break;
                    }
                }
            }
        }
    }

    return { ring1Revealed, ring2Peeked };
};

export const drawExplorationRevealOverlay = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    if (!floorIndex || rCtx.unveilMap) return;
    const latest = rCtx.firstExploredAtRef.current['_latest'] || 0;
    if (!latest) return;

    const { ctx, preloaded, lighting, isDarkMode, allRooms, explored, unveilMap, imagesRef, isMobile } = rCtx;
    const s = GRID_SIZE;
    const ringRevealGray = lighting === 'dark'
        ? (isDarkMode ? '#2e2e2e' : '#767676')
        : (isDarkMode ? '#202020' : '#5c5c5c');
    const ring1Revealed = rCtx.ring1Revealed || buildRevealRings(rCtx, bX1, bY1, bX2, bY2, floorIndex).ring1Revealed;
    const ring2Peeked = rCtx.ring2Peeked || buildRevealRings(rCtx, bX1, bY1, bX2, bY2, floorIndex).ring2Peeked;

    ctx.save();
    ctx.fillStyle = ringRevealGray;
    for (const vnum of ring1Revealed) {
        const revealInfo = getRevealSource(vnum, rCtx);
        if (!revealInfo) continue;
        const elapsed = rCtx.now - revealInfo.time;
        if (elapsed < 0) continue;
        const rData = preloaded[vnum];
        if (!rData) continue;
        const tx = Math.round(rData[0]) * s;
        const ty = Math.round(rData[1]) * s;
        const alphaMul = 1;
        ctx.globalAlpha = 1;
        fillTerrainTile(ctx, tx, ty, s);

        if (!isMobile && (rCtx.showTerrainIcons || rCtx.lowEffects) && rCtx.camera.zoom > 0.05) {
            const terrain = allRooms[`m_${vnum}`]?.terrain || allRooms[vnum]?.terrain || rData[3];
            const gridX = Math.round(tx / s), gridY = Math.round(ty / s);
            const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
            const exits = rData[4];
            const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
            const walls = getOutdoorSpillWalls(terrain, exits, preloaded, getRoomWalls(localRoom, exits, allRooms, preloaded, explored, unveilMap), gridX, gridY, rCtx.roomAtCoord);

            ctx.save();
            ctx.filter = 'grayscale(1)';
            ctx.globalAlpha = alphaMul;
            drawTerrainTileIcon(ctx, tx, ty, s, terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather, 0, undefined, walls);
            ctx.restore();
        }
    }
    ctx.restore();

    if (isMobile) {
        ctx.save();
        ctx.fillStyle = ringRevealGray;
        ctx.globalAlpha = (rCtx.mapTileOpacity ?? 1) * 0.25;
        for (const vnum of ring2Peeked) {
            const rData = preloaded[vnum];
            if (!rData) continue;
            fillTerrainTile(ctx, Math.round(rData[0]) * s, Math.round(rData[1]) * s, s);
        }
        ctx.restore();
        return;
    }

    const canvases = getTempCanvases(s);
    if (!canvases) return;
    const { contentCanvas, contentCtx, maskCanvas, maskCtx } = canvases;
    for (const vnum of ring2Peeked) {
        const rData = preloaded[vnum];
        if (!rData?.[4]) continue;

        const peekDirs: { dir: string, alpha: number }[] = [];
        for (const dir of ['n', 's', 'e', 'w']) {
            const exit = rData[4][dir];
            if (exit && ring1Revealed.has(String(exit.target))) {
                const revealInfo = getRevealSource(String(exit.target), rCtx);
                const alpha = 1;
                if (revealInfo || ring1Revealed.has(String(exit.target))) peekDirs.push({ dir, alpha });
            }
        }
        if (peekDirs.length === 0) continue;

        contentCtx.clearRect(0, 0, s, s);
        contentCtx.fillStyle = ringRevealGray;
        contentCtx.fillRect(0, 0, s, s);

        maskCtx.clearRect(0, 0, s, s);
        const peekDepth = 0.65;
        for (const peek of peekDirs) {
            let grad: CanvasGradient;
            if (peek.dir === 'n') {
                grad = maskCtx.createLinearGradient(0, 0, 0, s * peekDepth);
            } else if (peek.dir === 's') {
                grad = maskCtx.createLinearGradient(0, s, 0, s - s * peekDepth);
            } else if (peek.dir === 'e') {
                grad = maskCtx.createLinearGradient(s, 0, s - s * peekDepth, 0);
            } else {
                grad = maskCtx.createLinearGradient(0, 0, s * peekDepth, 0);
            }
            grad.addColorStop(0, `rgba(0,0,0,${peek.alpha})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            maskCtx.fillStyle = grad;
            if (peek.dir === 'n') maskCtx.fillRect(0, 0, s, s * peekDepth);
            else if (peek.dir === 's') maskCtx.fillRect(0, s - s * peekDepth, s, s * peekDepth);
            else if (peek.dir === 'e') maskCtx.fillRect(s - s * peekDepth, 0, s * peekDepth, s);
            else maskCtx.fillRect(0, 0, s * peekDepth, s);
        }

        contentCtx.save();
        contentCtx.globalCompositeOperation = 'destination-in';
        contentCtx.drawImage(maskCanvas, 0, 0);
        contentCtx.restore();

        ctx.save();
        ctx.globalAlpha = rCtx.mapTileOpacity ?? 1;
        ctx.drawImage(contentCanvas, Math.round(rData[0]) * s, Math.round(rData[1]) * s);
        ctx.restore();
    }
};

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, imagesRef, isTracingMode, mapTileVisuals, lighting } = rCtx;
    const terrainColors = mapTileVisuals?.terrainColors;
    const tileOpacity = rCtx.mapTileOpacity ?? 1;
    const tileBacking = isDarkMode ? '#000000' : '#f2f2f7';
    const tileBackingAlpha = tileOpacity;
    const s = GRID_SIZE;
    const useOverviewTerrainColors = false;
    const ringRevealGray = lighting === 'dark'
        ? (isDarkMode ? '#2e2e2e' : '#767676')
        : (isDarkMode ? '#202020' : '#5c5c5c');

    const exploredBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number, isPermanentSnow?: boolean }[]> = {};
    const ring1Batches: Record<string, { x: number, y: number, terrain: string, vnum: string }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number, isPermanentSnow?: boolean }[]> = {};
    const peekedRooms: { tx: number, ty: number, terrain: string, color: string, vnum: string }[] = [];
    const ring1Animating: { x: number, y: number, terrain: string, vnum: string, revealInfo: { time: number, dir: string } }[] = [];
    const ringRevealMs = RING_REVEAL_MS;
    if (!floorIndex) return;

    // Compute ring-1 revealed rooms: adjacent to explored, not explored themselves
    const ring1Revealed = rCtx.ring1Revealed || new Set<string>();
    const ring2Peeked = rCtx.ring2Peeked || new Set<string>();
    if (!rCtx.ring1Revealed && !unveilMap) {
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
                const color = useOverviewTerrainColors
                    ? getOverviewTerrainColor(terrain, isDarkMode)
                    : getTerrainColor(terrain, isDarkMode, 0.62, mergedTerrainColors);
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
                     if (ringRevealMs > 0 && revealInfo && (rCtx.now - revealInfo.time < ringRevealMs)) {
                         ring1Animating.push({ x: tx, y: ty, terrain, vnum, revealInfo });
                     } else {
                         if (!ring1Batches[color]) ring1Batches[color] = [];
                         ring1Batches[color].push({ x: tx, y: ty, terrain, vnum });
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
        const ring1GrayLod = ringRevealGray;
        ctx.save();
        ctx.fillStyle = ring1GrayLod;
        ctx.globalAlpha = 1.0;
        for (const color in ring1Batches) {
            for (const r of ring1Batches[color]) fillTerrainTile(ctx, r.x, r.y, s);
        }
        ctx.restore();
        drawLodBatches(ctx, exploredBatches, s, tileBacking, tileOpacity);
        if (unveilMap) drawLodBatches(ctx, revealedBatches, s, tileBacking, tileOpacity);
        return;
    }

    // Draw ring-1 revealed rooms: flat medium-dark gray tile, no terrain color
    if (ring1Revealed.size > 0) {
        const ring1Gray = ringRevealGray;
        ctx.save();
        ctx.fillStyle = ring1Gray;
        ctx.globalAlpha = 1.0;
        for (const color in ring1Batches) {
            const rooms = ring1Batches[color];
            for (let i = 0; i < rooms.length; i++) fillTerrainTile(ctx, rooms[i].x, rooms[i].y, s);
        }
        ctx.restore();
    }

    // Draw animating ring-1 revealed rooms: flat medium-dark gray tile, wipe reveal
    if (!rCtx.suppressExplorationAnimation && ring1Animating.length > 0) {
        const ring1Gray = ringRevealGray;
        ctx.save();
        ctx.fillStyle = ring1Gray;
        for (let i = 0; i < ring1Animating.length; i++) {
            const r = ring1Animating[i];
            const elapsed = rCtx.now - r.revealInfo.time;
            const animDur = ringRevealMs;
            const alphaMul = Math.min(1.0, elapsed / animDur);
            ctx.globalAlpha = 1.0 * alphaMul;
            rCtx.triggerRender?.(); // Force continue animation loop
            
            fillAnimatedTerrainTile(ctx, r.x, r.y, s, r.revealInfo.dir, alphaMul);
        }
        ctx.restore();
    }

    // Draw ring-2 peaked rooms: 25% terrain grayscale, fading to black (opacity 0)
    if (!rCtx.suppressExplorationAnimation && peekedRooms.length > 0) {
        const canvases = getTempCanvases(s);
        if (canvases) {
            const { contentCanvas, contentCtx, maskCanvas, maskCtx } = canvases;
            for (let i = 0; i < peekedRooms.length; i++) {
                const pr = peekedRooms[i];
                const rData = preloaded[pr.vnum];
                if (!rData) continue;
                const ghostExits = rData[4];
                if (!ghostExits) continue;

                const peekDirs: { dir: string, alpha: number }[] = [];
                for (const dir of ['n', 's', 'e', 'w']) {
                    const exit = ghostExits[dir];
                    if (exit && ring1Revealed.has(String(exit.target))) {
                        const revealInfo = getRevealSource(String(exit.target), rCtx);
                        const alpha = ringRevealMs > 0 && revealInfo
                            ? Math.max(0, Math.min(1, (rCtx.now - (revealInfo.time + ringRevealMs)) / ringRevealMs))
                            : 1;
                        if (alpha > 0) peekDirs.push({ dir, alpha });
                        if (ringRevealMs > 0 && alpha < 1) rCtx.triggerRender?.();
                    }
                }
                if (peekDirs.length === 0) continue;

                // 1. Draw Content (same flat gray as ring-1)
                const ring2Gray = ringRevealGray;
                contentCtx.clearRect(0, 0, s, s);
                contentCtx.fillStyle = ring2Gray;
                contentCtx.fillRect(0, 0, s, s);

                // 2. Draw Mask
                maskCtx.clearRect(0, 0, s, s);
                const peekDepth = 0.65;
                for (const peek of peekDirs) {
                    let grad: CanvasGradient;
                    const pd = peek.dir;
                    if (pd === 'n') {
                        grad = maskCtx.createLinearGradient(0, 0, 0, s * peekDepth);
                        grad.addColorStop(0, `rgba(0,0,0,${peek.alpha})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, 0, s, s * peekDepth);
                    } else if (pd === 's') {
                        grad = maskCtx.createLinearGradient(0, s, 0, s - s * peekDepth);
                        grad.addColorStop(0, `rgba(0,0,0,${peek.alpha})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, s - s * peekDepth, s, s * peekDepth);
                    } else if (pd === 'e') {
                        grad = maskCtx.createLinearGradient(s, 0, s - s * peekDepth, 0);
                        grad.addColorStop(0, `rgba(0,0,0,${peek.alpha})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(s - s * peekDepth, 0, s * peekDepth, s);
                    } else if (pd === 'w') {
                        grad = maskCtx.createLinearGradient(0, 0, s * peekDepth, 0);
                        grad.addColorStop(0, `rgba(0,0,0,${peek.alpha})`);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');
                        maskCtx.fillStyle = grad;
                        maskCtx.fillRect(0, 0, s * peekDepth, s);
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
                ctx.globalAlpha = tileOpacity;
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
            
            // Draw base terrain
            ctx.save();
            // 1. Tile backing
            ctx.fillStyle = tileBacking;
            ctx.globalAlpha = tileBackingAlpha;
            fillTerrainTile(ctx, r.x, r.y, s);

            // 2. Terrain color
            ctx.fillStyle = color;
            ctx.globalAlpha = tileOpacity;
            fillTerrainTile(ctx, r.x, r.y, s);

            // 3. Snow overlay
            if (r.isPermanentSnow || (rCtx.weather === 'snow' && Number(r.sundeath) !== 0)) {
                ctx.fillStyle = 'rgba(245, 250, 255, 0.45)';
                ctx.globalAlpha = tileOpacity;
                fillTerrainTile(ctx, r.x, r.y, s);
            }
            ctx.restore();
            
            applyRoomShading(ctx, r, s, 1.0, rCtx);
        }
    }
    ctx.restore();

    // 3. Draw Icons for fully explored rooms
    if (rCtx.showTerrainIcons) {
        for (const color in exploredBatches) {
            const rooms = exploredBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                
                ctx.save();
                ctx.globalAlpha = tileOpacity;
                const isSnow = r.isPermanentSnow || rCtx.weather === 'snow';
                const tWallStart = perfMonitor.enabled ? performance.now() : 0;
                const tConnects = (() => { const t = getTerrainName(r.terrain); return (t === 'Tunnel' || t === 'Cavern') ? getCaveConnects(r.vnum, preloaded) : 0; })();
                const tFloor = (getTerrainName(r.terrain) === 'Tunnel' || getTerrainName(r.terrain) === 'Cavern') ? color : undefined;

                const exits = preloaded[r.vnum]?.[4];
                const localRoom = allRooms[`m_${r.vnum}`] || allRooms[r.vnum];
                const walls = getOutdoorSpillWalls(r.terrain, exits, preloaded, getRoomWalls(localRoom, exits, allRooms, preloaded, explored, unveilMap), gridX, gridY, rCtx.roomAtCoord);
                if (perfMonitor.enabled) perfMonitor.addWallMs(performance.now() - tWallStart);

                const tIconStart = perfMonitor.enabled ? performance.now() : 0;
                drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather, tConnects, tFloor, walls);
                drawOutskirtTrees(ctx, r.x, r.y, r.vnum, s, r.terrain, preloaded, isDarkMode, tileOpacity, explored, imagesRef);
                if (perfMonitor.enabled) perfMonitor.addIconMs(performance.now() - tIconStart);
                ctx.restore();
            }
        }
    }

    // 3b. Draw Icons for ring-1 revealed rooms: grayscale, dim (made a tad bit darker by reducing opacity to 0.3)
    if (rCtx.showTerrainIcons && ring1Revealed.size > 0) {
        ctx.save();
        ctx.filter = 'grayscale(1)';
        ctx.globalAlpha = 1.0;
        for (const color in ring1Batches) {
            const rooms = ring1Batches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                
                const exits = preloaded[r.vnum]?.[4];
                const localRoom = allRooms[`m_${r.vnum}`] || allRooms[r.vnum];
                const walls = getOutdoorSpillWalls(r.terrain, exits, preloaded, getRoomWalls(localRoom, exits, allRooms, preloaded, explored, unveilMap), gridX, gridY, rCtx.roomAtCoord);

                drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather, 0, undefined, walls);
            }
        }
        ctx.restore();
    }

    // Draw Icons for animating ring-1 revealed rooms: grayscale, dim, wipe reveal
    if (rCtx.showTerrainIcons && ring1Animating.length > 0) {
        ctx.save();
        ctx.filter = 'grayscale(1)';
        for (let i = 0; i < ring1Animating.length; i++) {
            const r = ring1Animating[i];
            const elapsed = rCtx.now - r.revealInfo.time;
            const animDur = ringRevealMs;
            const alphaMul = Math.min(1.0, elapsed / animDur);
            
            ctx.save();
            ctx.globalAlpha = 1.0 * alphaMul;
            
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
            
            const exits = preloaded[r.vnum]?.[4];
            const localRoom = allRooms[`m_${r.vnum}`] || allRooms[r.vnum];
            const walls = getOutdoorSpillWalls(r.terrain, exits, preloaded, getRoomWalls(localRoom, exits, allRooms, preloaded, explored, unveilMap), gridX, gridY, rCtx.roomAtCoord);

            drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, rCtx.weather, 0, undefined, walls);
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

        if (rCtx.showTerrainIcons) {
            for (const color in revealedBatches) {
                const rooms = revealedBatches[color];
                for (let i = 0; i < rooms.length; i++) {
                    const r = rooms[i];
                    const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                    const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                    ctx.save();
                    ctx.globalAlpha = tileOpacity;
                    const isSnow = r.isPermanentSnow || rCtx.weather === 'snow';
                    const tConnects3 = (() => { const t = getTerrainName(r.terrain); return (t === 'Tunnel' || t === 'Cavern') ? getCaveConnects(r.vnum, preloaded) : 0; })();
                    const tFloor3 = (getTerrainName(r.terrain) === 'Tunnel' || getTerrainName(r.terrain) === 'Cavern') ? color : undefined;
                    
                    const exits = preloaded[r.vnum]?.[4];
                    const localRoom = allRooms[`m_${r.vnum}`] || allRooms[r.vnum];
                    const walls = getOutdoorSpillWalls(r.terrain, exits, preloaded, getRoomWalls(localRoom, exits, allRooms, preloaded, explored, unveilMap), gridX, gridY, rCtx.roomAtCoord);

                    drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather, tConnects3, tFloor3, walls);
                    drawOutskirtTrees(ctx, r.x, r.y, r.vnum, s, r.terrain, preloaded, isDarkMode, tileOpacity, explored, imagesRef);
                    ctx.restore();
                }
            }
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, imagesRef, mapTileVisuals, allRooms, preloaded } = rCtx;
    const terrainColors = mapTileVisuals?.terrainColors;
    const tileOpacity = rCtx.mapTileOpacity ?? 1;
    const s = GRID_SIZE;
    const useOverviewTerrainColors = false;

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
        ctx.fillStyle = useOverviewTerrainColors
            ? getOverviewTerrainColor(room.terrain, isDarkMode)
            : getTerrainColor(room.terrain, isDarkMode, 0.62, mergedTerrainColors);
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

    if (rCtx.showTerrainIcons) {
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
            const tConnectsLocal = (getTerrainName(room.terrain) === 'Tunnel' || getTerrainName(room.terrain) === 'Cavern') ? getCaveConnects(room.id, preloaded) : 0;
            const zoneName = room.zone || '';
            const zoneVis = getZoneVisuals(zoneName, isDarkMode, rCtx.zoneFilters);
            const mergedTerrainColors = {
                ...terrainColors,
                ...zoneVis.terrainColors
            };
            const localColor = getTerrainColor(room.terrain, isDarkMode, 0.62, mergedTerrainColors);
            const tFloorLocal = (getTerrainName(room.terrain) === 'Tunnel' || getTerrainName(room.terrain) === 'Cavern') ? localColor : undefined;
            
            const rId = String(room.id).startsWith('m_') ? room.id.substring(2) : room.id;
            const exits = preloaded[rId]?.[4];
            const walls = getOutdoorSpillWalls(room.terrain, exits, preloaded, getRoomWalls(room, exits, allRooms, preloaded, rCtx.explored, rCtx.unveilMap), gridX, gridY, rCtx.roomAtCoord);

            drawTerrainTileIcon(ctx, rx, ry, s, room.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant, isSnow ? 'snow' : rCtx.weather, tConnectsLocal, tFloorLocal, walls);
            ctx.restore();
        }
    }
};
