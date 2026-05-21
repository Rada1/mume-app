import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, WALL_COLOR, getTerrainName } from '../mapperUtils';

const TERRAIN_TILE_INSET = 0;

const getTerrainTileInset = (s: number) => Math.min(TERRAIN_TILE_INSET, Math.max(1, s * 0.06));

const fillTerrainTile = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    const inset = getTerrainTileInset(s);
    ctx.fillRect(x + inset, y + inset, s - inset * 2, s - inset * 2);
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

const drawTerrainTileIcon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
    terrain: any,
    isDarkMode: boolean,
    processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>,
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>,
    variant: number
) => {
    const inset = getTerrainTileInset(s);
    drawTerrainIcon(ctx, x + inset, y + inset, s - inset * 2, terrain, isDarkMode, processedIconsRef, imagesRef, variant);
};

export const drawTerrainIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, terrain: any, isDarkMode: boolean, processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>, imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>, variant: number = 0) => {
    const tName = getTerrainName(terrain);
    const variantSpecificTerrains = ['Hills', 'Forest', 'Brush', 'Mountains', 'Field', 'Cavern', 'Tunnel', 'Water', 'Shallows', 'Rapids', 'City', 'Underwater', 'Building'];
    const iconSize = Math.round(s);
    const key = variantSpecificTerrains.includes(tName) ? `${tName}_v${variant}_${isDarkMode}_s${iconSize}_v15` : `${tName}_${isDarkMode}_s${iconSize}_v15`;
    
    if (!processedIconsRef.current[key]) {
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = s;
        iconCanvas.height = s;
        const ictx = iconCanvas.getContext('2d')!;
        
        const cX = s / 2;
        const cY = s / 2;
        ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
        ictx.lineWidth = 2;
        ictx.lineJoin = 'round';
        ictx.lineCap = 'round';

        if (tName === 'Mountains') {
            ictx.font = `bold ${Math.round(s * 0.3)}px monospace`;
            const mountainColors = isDarkMode ? [
                "rgba(150, 154, 158, 0.62)",
                "rgba(120, 124, 128, 0.58)"
            ] : [
                "rgba(52, 54, 56, 0.72)",
                "rgba(34, 36, 38, 0.68)"
            ];
            ictx.fillStyle = mountainColors[variant % 2];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillText('/\\', cX, cY - s * 0.07);
            ictx.fillText('/__\\', cX, cY + s * 0.13);
        } else if (tName === 'Hills') {
            ictx.font = `bold ${Math.round(s * 0.5)}px monospace`;
            const hillColor = (variant % 2) === 0 
                ? (isDarkMode ? "rgba(150, 126, 98, 0.62)" : "rgba(86, 62, 42, 0.7)")
                : (isDarkMode ? "rgba(96, 139, 92, 0.6)" : "rgba(42, 94, 38, 0.68)");
            ictx.fillStyle = hillColor;
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.save();
            ictx.translate(cX, cY);
            ictx.rotate(Math.PI / 2);
            ictx.fillText('(', 0, 0);
            ictx.restore();
        } else if (tName === 'Forest') {
            ictx.font = `bold ${Math.round(s * 0.45)}px monospace`;
            const forestColors = isDarkMode ? [
                "rgba(104, 150, 78, 0.62)",
                "rgba(68, 134, 76, 0.6)"
            ] : [
                "rgba(28, 86, 36, 0.74)",
                "rgba(42, 104, 48, 0.72)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [
                { x: 0.5, y: 0.4 }, { x: 0.25, y: 0.25 }, { x: 0.75, y: 0.3 }, { x: 0.35, y: 0.7 }, { x: 0.65, y: 0.65 }
            ];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = forestColors[(variant + i) % 2];
                ictx.fillText('^', pos.x * s, pos.y * s);
            }
        } else if (tName === 'Field') {
            ictx.font = `${Math.round(s * 0.3)}px monospace`;
            const fieldColors = isDarkMode ? [
                "rgba(110, 148, 88, 0.58)", "rgba(140, 152, 94, 0.54)"
            ] : [
                "rgba(54, 112, 58, 0.66)", "rgba(88, 106, 48, 0.62)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.3, y: 0.3 }, { x: 0.7, y: 0.7 }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = fieldColors[(variant + i) % 2];
                ictx.fillText('`', pos.x * s, pos.y * s);
            }
        } else if (tName === 'Brush') {
            ictx.font = `${Math.round(s * 0.35)}px monospace`;
            const brushColors = isDarkMode ? [
                "rgba(150, 92, 48, 0.58)", "rgba(148, 124, 54, 0.54)"
            ] : [
                "rgba(104, 62, 34, 0.66)", "rgba(112, 72, 44, 0.62)"
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
            const charColor = isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.15)";
            ictx.fillStyle = charColor;
            ictx.font = `bold ${Math.round(s * 0.22)}px monospace`;
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            
            // Uniform 2x2 grid of small # characters
            ictx.fillText('#', s * 0.3, s * 0.3);
            ictx.fillText('#', s * 0.7, s * 0.3);
            ictx.fillText('#', s * 0.3, s * 0.7);
            ictx.fillText('#', s * 0.7, s * 0.7);
        } else if (tName === 'Building') {
            ictx.save();
            ictx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.15)";
            ictx.beginPath();
            const m = s * 0.2;
            const len = s * 0.2;
            
            // Top-Left
            ictx.moveTo(m, m + len);
            ictx.lineTo(m, m);
            ictx.lineTo(m + len, m);
            
            // Top-Right
            ictx.moveTo(s - m, m + len);
            ictx.lineTo(s - m, m);
            ictx.lineTo(s - m - len, m);
            
            // Bottom-Left
            ictx.moveTo(m, s - m - len);
            ictx.lineTo(m, s - m);
            ictx.lineTo(m + len, s - m);
            
            // Bottom-Right
            ictx.moveTo(s - m, s - m - len);
            ictx.lineTo(s - m, s - m);
            ictx.lineTo(s - m - len, s - m);
            
            ictx.stroke();
            ictx.restore();
        } else if (tName === 'Water' || tName === 'Shallows' || tName === 'Rapids' || tName === 'Underwater') {
            ictx.font = `${Math.round(s * 0.45)}px monospace`;
            
            let waterColors: string[];
            if (tName === 'Shallows') {
                waterColors = isDarkMode ? ["rgba(74, 178, 188, 0.72)", "rgba(112, 178, 190, 0.68)"] : ["rgba(34, 124, 154, 0.78)", "rgba(28, 104, 136, 0.74)"];
            } else if (tName === 'Rapids') {
                waterColors = isDarkMode ? ["rgba(0, 255, 255, 1.0)", "rgba(137, 220, 235, 1.0)"] : ["rgba(0, 150, 200, 1.0)", "rgba(0, 120, 180, 1.0)"];
            } else if (tName === 'Underwater') {
                waterColors = isDarkMode ? ["rgba(100, 149, 237, 1.0)", "rgba(30, 144, 255, 1.0)"] : ["rgba(0, 70, 150, 1.0)", "rgba(0, 50, 120, 1.0)"];
            } else {
                waterColors = isDarkMode ? ["rgba(0, 191, 255, 1.0)", "rgba(30, 144, 255, 1.0)"] : ["rgba(31, 97, 141, 1.0)", "rgba(41, 128, 185, 1.0)"];
            }

            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillStyle = waterColors[variant % 2];
            ictx.fillText('~', cX, cY);
        } else if (tName === 'Cavern') {
            const caveColors = isDarkMode ? [
                "rgba(120, 120, 130, 0.75)", "rgba(100, 100, 110, 0.65)"
            ] : [
                "rgba(80, 80, 80, 0.75)", "rgba(50, 50, 50, 0.65)"
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
            
            ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
            ictx.lineWidth = 1;
            ictx.strokeRect(0, 0, s, s);
        } else if (tName === 'Tunnel') {
            ictx.font = `${Math.round(s * 0.4)}px monospace`;
            const tunnelColors = isDarkMode ? [
                "rgba(154, 124, 94, 0.58)", "rgba(136, 104, 78, 0.54)"
            ] : [
                "rgba(92, 76, 58, 0.66)", "rgba(72, 58, 44, 0.62)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.6 }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = tunnelColors[(variant + i) % 2];
                ictx.fillText('∩', pos.x * s, pos.y * s);
            }
            ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
            ictx.lineWidth = 1;
            ictx.strokeRect(0, 0, s, s);
        }
        processedIconsRef.current[key] = iconCanvas;
    }

    const cachedIcon = processedIconsRef.current[key];
    if (cachedIcon) {
        ctx.drawImage(cachedIcon, x, y);
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
    if (light === 1 || light === '1') overlayAlpha += 0.2;
    // sundeath=0 → NO_SUNDEATH (indoor/cave, never killed by sun) → extra dark
    if (sundeath === 0 || sundeath === '0') overlayAlpha += 0.3;

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
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, imagesRef } = rCtx;
    const tileBacking = isDarkMode ? '#000000' : '#f2f2f7';
    const s = GRID_SIZE;

    const exploredBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, light?: number, sundeath?: number }[]> = {};
    const peekBatches: Record<string, { x: number, y: number, terrain: string, vnum: string, peekDirs: string[], light?: number, sundeath?: number }[]> = {};

    if (!floorIndex) return;

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
                const color = getTerrainColor(terrain, isDarkMode);
                const tx = Math.round(rx) * s;
                const ty = Math.round(ry) * s;

                const l = localRoom ? localRoom.light : rData[10];
                const sd = localRoom ? localRoom.sundeath : rData[11];

                if (isExplored) {
                    if (!exploredBatches[color]) exploredBatches[color] = [];
                    exploredBatches[color].push({ x: tx, y: ty, terrain, vnum, light: l, sundeath: sd });
                } else if (unveilMap) {
                    if (!revealedBatches[color]) revealedBatches[color] = [];
                    revealedBatches[color].push({ x: tx, y: ty, terrain, vnum, light: l, sundeath: sd });
                } else {
                    // Peek Logic: Check neighbors
                    const ghostExits = rData[4];
                    if (ghostExits) {
                        const peekDirs: string[] = [];
                        for (const dir of ['n', 's', 'e', 'w']) {
                            const exit = ghostExits[dir];
                            if (exit && explored.has(String(exit.target))) {
                                peekDirs.push(dir);
                            }
                        }
                        if (peekDirs.length > 0) {
                            if (!peekBatches[color]) peekBatches[color] = [];
                            peekBatches[color].push({ x: tx, y: ty, terrain, vnum, peekDirs, light: l, sundeath: sd });
                        }
                    }
                }
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
                            ctx.globalAlpha = 1.0;
                            fillAnimatedTerrainTile(ctx, r.x, r.y, s, sourceDir, alphaMul);

                            // 2. Terrain color
                            ctx.fillStyle = color;
                            ctx.globalAlpha = 0.5;
                            fillAnimatedTerrainTile(ctx, r.x, r.y, s, sourceDir, alphaMul);
                        } else {
                            // 1. Tile backing
                            ctx.fillStyle = tileBacking;
                            ctx.globalAlpha = alphaMul;
                            fillTerrainTile(ctx, r.x, r.y, s);

                            // 2. Terrain color
                            ctx.fillStyle = color;
                            ctx.globalAlpha = 0.5 * alphaMul;
                            fillTerrainTile(ctx, r.x, r.y, s);
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
            ctx.globalAlpha = alphaMul;
            fillTerrainTile(ctx, r.x, r.y, s);

            // 2. Terrain color
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5 * alphaMul;
            fillTerrainTile(ctx, r.x, r.y, s);
            ctx.restore();
            
            applyRoomShading(ctx, r, s, alphaMul, rCtx);
        }
    }
    ctx.restore();

    // 2. Draw Peek Gradients (Gradual fade)
    for (const color in peekBatches) {
        const rooms = peekBatches[color];
        for (const r of rooms) {
            // Need rData to find neighbor vnums for peek animation
            const rData = rCtx.preloaded[r.vnum];
            const ghostExits = rData ? rData[4] : null;

            for (const dir of r.peekDirs) {
                let peekAlphaMul = 0;
                const animDur = 100;
                const startDelay = 100;

                if (ghostExits && ghostExits[dir]) {
                    const neighborVnum = String(ghostExits[dir].target);
                    const exploredAt = rCtx.firstExploredAtRef.current[neighborVnum];
                    if (exploredAt) {
                        const elapsed = rCtx.now - exploredAt;
                        if (elapsed > startDelay) {
                            peekAlphaMul = Math.min(1.0, (elapsed - startDelay) / animDur);
                            if (elapsed < startDelay + animDur) rCtx.triggerRender?.();
                        } else {
                            rCtx.triggerRender?.(); // Wait for delay
                        }
                    }
                }

                if (peekAlphaMul <= 0) continue;

                let grad;
                if (dir === 'n') grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + s * 0.7);
                else if (dir === 's') grad = ctx.createLinearGradient(r.x, r.y + s, r.x, r.y + s * 0.3);
                else if (dir === 'e') grad = ctx.createLinearGradient(r.x + s, r.y, r.x + s * 0.3, r.y);
                else if (dir === 'w') grad = ctx.createLinearGradient(r.x, r.y, r.x + s * 0.7, r.y);

                let blackGrad;
                if (dir === 'n') blackGrad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + s * 0.7);
                else if (dir === 's') blackGrad = ctx.createLinearGradient(r.x, r.y + s, r.x, r.y + s * 0.3);
                else if (dir === 'e') blackGrad = ctx.createLinearGradient(r.x + s, r.y, r.x + s * 0.3, r.y);
                else if (dir === 'w') blackGrad = ctx.createLinearGradient(r.x, r.y, r.x + s * 0.7, r.y);

                if (grad && blackGrad) {
                    // 1. Tile backing gradient
                    ctx.save();
                    blackGrad.addColorStop(0, tileBacking);
                    blackGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = blackGrad;
                    ctx.globalAlpha = 1.0;
                    fillTerrainTile(ctx, r.x, r.y, s);
                    ctx.restore();

                    // 2. Terrain color gradient
                    ctx.save();
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.globalAlpha = 0.45 * peekAlphaMul; // Start just below explored (0.5)
                    fillTerrainTile(ctx, r.x, r.y, s);
                    ctx.restore();
                    applyRoomShading(ctx, r, s, peekAlphaMul, rCtx);
                }
            }
        }
    }

    // 3. Draw Icons for fully explored rooms
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
                    ctx.globalAlpha = alphaMul;
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
            drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
            ctx.restore();
        }
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
                ctx.globalAlpha = 1.0;
                fillTerrainTile(ctx, r.x, r.y, s);
                ctx.restore();

                ctx.save();
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.25;
                fillTerrainTile(ctx, r.x, r.y, s);
                ctx.restore();

                applyRoomShading(ctx, r, s, 1.0, rCtx);
            }
        }

        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                drawTerrainTileIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
            }
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ, imagesRef } = rCtx;
    const s = GRID_SIZE;

    ctx.save();
    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
        fillTerrainTile(ctx, rx, ry, s);
        applyRoomShading(ctx, { ...room, x: rx, y: ry, vnum: String(room.id).startsWith('m_') ? room.id.substring(2) : room.id }, s, 1.0, rCtx);
    }
    // Correctly restore once AFTER the loop
    ctx.restore();

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        const gridX = Math.round(room.x), gridY = Math.round(room.y);
        const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
        drawTerrainTileIcon(ctx, rx, ry, s, room.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
    }
};
