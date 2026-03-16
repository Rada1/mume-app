import { RenderContext } from './rendererUtils';
import { GRID_SIZE, getTerrainColor, WALL_COLOR, getTerrainName } from '../mapperUtils';

const drawTerrainIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, terrain: any, isDarkMode: boolean, processedIconsRef: React.MutableRefObject<Record<string, HTMLCanvasElement>>) => {
    const tName = getTerrainName(terrain);
    const key = `${tName}_${isDarkMode}`;
    
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
            ictx.beginPath();
            ictx.moveTo(cX - s * 0.3, cY + s * 0.2);
            ictx.lineTo(cX, cY - s * 0.3);
            ictx.lineTo(cX + s * 0.3, cY + s * 0.2);
            ictx.stroke();
        } else if (tName === 'Hills') {
            ictx.beginPath();
            ictx.moveTo(cX - s * 0.25, cY + s * 0.1);
            ictx.lineTo(cX, cY - s * 0.15);
            ictx.lineTo(cX + s * 0.25, cY + s * 0.1);
            ictx.stroke();
        } else if (tName === 'Forest') {
            ictx.beginPath();
            ictx.moveTo(cX, cY - s * 0.25);
            ictx.lineTo(cX - s * 0.2, cY + s * 0.1);
            ictx.lineTo(cX + s * 0.2, cY + s * 0.1);
            ictx.closePath();
            ictx.stroke();
            ictx.beginPath();
            ictx.moveTo(cX, cY + s * 0.1);
            ictx.lineTo(cX, cY + s * 0.25);
            ictx.stroke();
        } else if (tName === 'Cavern' || tName === 'Tunnel') {
            ictx.strokeStyle = WALL_COLOR;
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
    const { ctx, isDarkMode, explored, unveilMap, allRooms, preloaded } = rCtx;
    const s = GRID_SIZE;

    // Batch by color for backgrounds
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

    // Pass 1: Explored Background Colors & Icons
    for (const color in exploredBatches) {
        ctx.fillStyle = color;
        const rooms = exploredBatches[color];
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i];
            ctx.fillRect(r.x, r.y, s, s);
            drawTerrainIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef);
        }
    }

    // Pass 2: Revealed Background Colors
    if (unveilMap) {
        ctx.globalAlpha = 1.0; 
        for (const color in revealedBatches) {
            const rooms = revealedBatches[color];
            ctx.fillStyle = color;
            for (let i = 0; i < rooms.length; i++) {
                const r = rooms[i];
                ctx.fillRect(r.x, r.y, s, s);
                drawTerrainIcon(ctx, r.x, r.y, s, r.terrain, isDarkMode, rCtx.processedIconsRef);
            }
        }
    }
};

export const drawLocalTerrains = (rCtx: RenderContext, localRooms: any[]) => {
    const { ctx, isDarkMode, currentZ } = rCtx;
    const s = GRID_SIZE;

    for (let i = 0; i < localRooms.length; i++) {
        const room = localRooms[i];
        if (room.id.startsWith('m_')) continue;
        const rz = room.z || 0;
        if (Math.abs(rz - currentZ) > 1.5) continue;
        
        const rx = Math.round(room.x) * s, ry = Math.round(room.y) * s;
        ctx.fillStyle = getTerrainColor(room.terrain, isDarkMode);
        ctx.fillRect(rx, ry, s, s);
        drawTerrainIcon(ctx, rx, ry, s, room.terrain, isDarkMode, rCtx.processedIconsRef);
    }
};
