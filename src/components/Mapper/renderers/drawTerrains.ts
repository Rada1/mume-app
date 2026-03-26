import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, WALL_COLOR, getTerrainName } from '../mapperUtils';

const drawTerrainIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, terrain: any, isDarkMode: boolean, processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>, imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>, variant: number = 0) => {
    const tName = getTerrainName(terrain);
    const variantSpecificTerrains = ['Hills', 'Forest', 'Brush', 'Mountains', 'Field', 'Cavern', 'Tunnel', 'Water', 'Shallows', 'Rapids', 'City', 'Underwater', 'Building'];
    const key = variantSpecificTerrains.includes(tName) ? `${tName}_v${variant}_${isDarkMode}` : `${tName}_${isDarkMode}`;
    
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
            ictx.font = `bold ${Math.round(s * 0.45)}px monospace`;
            const mountainColors = isDarkMode ? [
                "rgba(160, 160, 160, 0.8)", // Grey
                "rgba(100, 100, 100, 0.8)"  // Darker Grey
            ] : [
                "rgba(120, 120, 120, 0.8)", // Medium Grey
                "rgba(70, 70, 70, 0.8)"     // Darker Grey
            ];
            ictx.fillStyle = mountainColors[variant % 2];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillText('/\\', cX, cY - s * 0.1);
            ictx.fillText('/__\\', cX, cY + s * 0.2);
        } else if (tName === 'Hills') {
            ictx.font = `bold ${Math.round(s * 0.5)}px monospace`;
            const hillColor = (variant % 2) === 0 
                ? (isDarkMode ? "rgba(139, 115, 85, 0.7)" : "rgba(101, 84, 62, 0.8)") // brown
                : (isDarkMode ? "rgba(107, 142, 35, 0.7)" : "rgba(85, 107, 47, 0.8)"); // green
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
                "rgba(107, 142, 35, 0.75)", // OliveDrab
                "rgba(0, 100, 0, 0.75)"      // DarkGreen
            ] : [
                "rgba(85, 107, 47, 0.85)",  // DarkOliveGreen
                "rgba(0, 80, 0, 0.85)"      // Darker green
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
                "rgba(154, 205, 50, 0.5)", "rgba(85, 107, 47, 0.5)"
            ] : [
                "rgba(100, 120, 100, 0.6)", "rgba(120, 140, 80, 0.6)"
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
                "rgba(139, 69, 19, 0.7)", "rgba(210, 180, 140, 0.7)"
            ] : [
                "rgba(101, 67, 33, 0.8)", "rgba(189, 153, 114, 0.8)"
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
            ictx.font = `bold ${Math.round(s * 0.5)}px monospace`;
            const cityColors = isDarkMode ? [
                "rgba(90, 90, 90, 0.6)", "rgba(90, 90, 90, 0.6)"
            ] : [
                "rgba(50, 50, 50, 0.6)", "rgba(50, 50, 50, 0.6)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillStyle = cityColors[variant % 2];
            ictx.fillText('#', cX, cY);
        } else if (tName === 'Building') {
            const buildingColors = isDarkMode ? [
                "rgba(180, 180, 180, 0.8)", "rgba(140, 140, 140, 0.8)", "rgba(100, 100, 100, 0.8)"
            ] : [
                "rgba(100, 100, 100, 0.9)", "rgba(130, 130, 130, 0.9)", "rgba(160, 160, 160, 0.9)"
            ];
            ictx.strokeStyle = buildingColors[variant % buildingColors.length];
            ictx.lineWidth = Math.max(1, s * 0.05);
            ictx.lineCap = 'round';
            ictx.lineJoin = 'round';
            
            const padding = s * 0.15;
            const len = s * 0.2;

            // Top-Left
            ictx.beginPath();
            ictx.moveTo(padding + len, padding);
            ictx.lineTo(padding, padding);
            ictx.lineTo(padding, padding + len);
            ictx.stroke();

            // Top-Right
            ictx.beginPath();
            ictx.moveTo(s - padding - len, padding);
            ictx.lineTo(s - padding, padding);
            ictx.lineTo(s - padding, padding + len);
            ictx.stroke();

            // Bottom-Left
            ictx.beginPath();
            ictx.moveTo(padding + len, s - padding);
            ictx.lineTo(padding, s - padding);
            ictx.lineTo(padding, s - padding - len);
            ictx.stroke();

            // Bottom-Right
            ictx.beginPath();
            ictx.moveTo(s - padding - len, s - padding);
            ictx.lineTo(s - padding, s - padding);
            ictx.lineTo(s - padding, s - padding - len);
            ictx.stroke();
        } else if (tName === 'Water' || tName === 'Shallows' || tName === 'Rapids' || tName === 'Underwater') {
            ictx.font = `${Math.round(s * 0.45)}px monospace`;
            
            let waterColors: string[];
            if (tName === 'Shallows' || tName === 'Rapids') {
                waterColors = isDarkMode ? ["rgba(116, 199, 236, 0.6)", "rgba(137, 220, 235, 0.6)"] : ["rgba(174, 214, 241, 0.7)", "rgba(133, 193, 233, 0.7)"];
            } else if (tName === 'Underwater') {
                waterColors = isDarkMode ? ["rgba(30, 30, 46, 0.6)", "rgba(49, 50, 68, 0.6)"] : ["rgba(40, 116, 166, 0.7)", "rgba(33, 97, 140, 0.7)"];
            } else {
                waterColors = isDarkMode ? ["rgba(0, 191, 255, 0.6)", "rgba(135, 206, 250, 0.6)"] : ["rgba(70, 130, 180, 0.7)", "rgba(100, 149, 237, 0.7)"];
            }

            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillStyle = waterColors[variant % 2];
            ictx.fillText('~', cX, cY);
        } else if (tName === 'Cavern') {
            ictx.font = `${Math.round(s * 0.3)}px monospace`;
            const caveColors = isDarkMode ? [
                "rgba(148, 158, 174, 0.5)", "rgba(107, 114, 128, 0.5)"
            ] : [
                "rgba(100, 100, 100, 0.6)", "rgba(150, 150, 150, 0.6)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.3, y: 0.3, char: '.' }, { x: 0.7, y: 0.4, char: 'o' }, { x: 0.5, y: 0.7, char: '.' }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = caveColors[(variant + i) % 2];
                ictx.fillText(pos.char, pos.x * s, pos.y * s);
            }
            ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
            ictx.lineWidth = 1;
            ictx.strokeRect(0, 0, s, s);
        } else if (tName === 'Tunnel') {
            ictx.font = `${Math.round(s * 0.4)}px monospace`;
            const tunnelColors = isDarkMode ? [
                "rgba(210, 180, 140, 0.6)", "rgba(180, 150, 120, 0.6)"
            ] : [
                "rgba(139, 115, 85, 0.7)", "rgba(101, 84, 62, 0.7)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            const positions = [{ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.6 }];
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                ictx.fillStyle = tunnelColors[(variant + i) % 2];
                ictx.fillText('∩', pos.x * s, pos.y * s);
            }
            ictx.strokeStyle = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
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

const applyRoomShading = (ctx: CanvasRenderingContext2D, r: any, s: number, alphaMul: number, rCtx: RenderContext) => {
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
        ctx.fillRect(r.x, r.y, s, s);
        ctx.restore();
    }
};

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, imagesRef } = rCtx;
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
        ctx.fillStyle = color;
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
                        ctx.globalAlpha = 0.5;
                        if (sourceDir === 'n') ctx.fillRect(r.x, r.y, s, s * alphaMul);
                        else if (sourceDir === 's') ctx.fillRect(r.x, r.y + s * (1 - alphaMul), s, s * alphaMul);
                        else if (sourceDir === 'w') ctx.fillRect(r.x, r.y, s * alphaMul, s);
                        else if (sourceDir === 'e') ctx.fillRect(r.x + s * (1 - alphaMul), r.y, s * alphaMul, s);
                        else { ctx.globalAlpha = 0.5 * alphaMul; ctx.fillRect(r.x, r.y, s, s); }
                        ctx.restore();
                        applyRoomShading(ctx, r, s, alphaMul, rCtx);
                        continue;
                    }
                }
            }
            
            // Draw base terrain
            ctx.globalAlpha = 0.5 * alphaMul;
            ctx.fillRect(r.x, r.y, s, s);
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

                if (grad) {
                    ctx.save();
                    grad.addColorStop(0, color);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.globalAlpha = 0.45 * peekAlphaMul; // Start just below explored (0.5)
                    ctx.fillRect(r.x, r.y, s, s);
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
            drawTerrainIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
            ctx.restore();
        }
    }

    // 4. Handle unveilMap (GM mode / Debug)
    if (unveilMap) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x, r.y, s, s);
                applyRoomShading(ctx, r, s, 1.0, rCtx);
            }
        }
        ctx.restore();

        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
                const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
                drawTerrainIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
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
        ctx.fillRect(rx, ry, s, s);
        applyRoomShading(ctx, { ...room, vnum: String(room.id).startsWith('m_') ? room.id.substring(2) : room.id }, s, 1.0, rCtx);
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
        drawTerrainIcon(ctx, rx, ry, s, room.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
    }
};
