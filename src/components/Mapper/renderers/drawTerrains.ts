import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, WALL_COLOR, getTerrainName } from '../mapperUtils';

const drawTerrainIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, terrain: any, isDarkMode: boolean, processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>, imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>, variant: number = 0) => {
    const tName = getTerrainName(terrain);
    const variantSpecificTerrains = ['Hills', 'Forest', 'Brush', 'Mountains', 'Field', 'Cavern', 'Tunnel', 'Water', 'Shallows', 'Rapids', 'City', 'Underwater'];
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
                "rgba(200, 200, 200, 0.7)", "rgba(140, 140, 140, 0.7)"
            ] : [
                "rgba(80, 80, 80, 0.8)", "rgba(120, 120, 120, 0.8)"
            ];
            ictx.textAlign = 'center';
            ictx.textBaseline = 'middle';
            ictx.fillStyle = cityColors[variant % 2];
            ictx.fillText('#', cX, cY);
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

export const drawTerrains = (
    rCtx: RenderContext,
    bX1: number, bY1: number, bX2: number, bY2: number,
    floorIndex: Record<string, string[]>
) => {
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded, imagesRef } = rCtx;
    const s = GRID_SIZE;

    const exploredBatches: Record<string, { x: number, y: number, terrain: string }[]> = {};
    const revealedBatches: Record<string, { x: number, y: number, terrain: string }[]> = {};

    if (!floorIndex) return;

    for (let bx = bX1; bx <= bX2; bx++) {
        for (let by = bY1; by <= bY2; by++) {
            const bucket = floorIndex[`${bx},${by}`];
            if (!bucket) continue;
            
            for (let i = 0; i < bucket.length; i++) {
                const vnum = bucket[i];
                const isExplored = explored.has(vnum);
                if (!isExplored && !unveilMap) continue;

                const rData = preloaded[vnum];
                if (!rData) continue;
                
                const rx = rData[0], ry = rData[1], tSector = rData[3];
                const localRoom = allRooms[`m_${vnum}`] || allRooms[vnum];
                const terrain = localRoom ? localRoom.terrain : tSector;
                
                const color = getTerrainColor(terrain, isDarkMode);
                const tx = Math.round(rx) * s;
                const ty = Math.round(ry) * s;

                if (isExplored) {
                    if (!exploredBatches[color]) exploredBatches[color] = [];
                    exploredBatches[color].push({ x: tx, y: ty, terrain });
                } else {
                    if (!revealedBatches[color]) revealedBatches[color] = [];
                    revealedBatches[color].push({ x: tx, y: ty, terrain });
                }
            }
        }
    }

    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const color in exploredBatches) {
        ctx.fillStyle = color;
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            ctx.fillRect(rooms[i].x, rooms[i].y, s, s);
        }
    }
    ctx.restore();

    for (const color in exploredBatches) {
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            const gridX = Math.round(r.x / s), gridY = Math.round(r.y / s);
            const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
            drawTerrainIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef, imagesRef, variant);
        }
    }

    if (unveilMap) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                ctx.fillRect(rooms[i].x, rooms[i].y, s, s);
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
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
        ctx.fillRect(rx, ry, s, s);
    }
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
