import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS } from '../mapperUtils';

// Pre-render glows for optimization
let playerGlowCanvas: HTMLCanvasElement | null = null;
let trailGlowCanvas: HTMLCanvasElement | null = null;

const getPlayerGlow = () => {
    if (playerGlowCanvas) return playerGlowCanvas;
    const canvas = document.createElement('canvas');
    const size = Math.round(GRID_SIZE * 2.5);
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    playerGlowCanvas = canvas;
    return canvas;
};

const getTrailGlow = () => {
    if (trailGlowCanvas) return trailGlowCanvas;
    const canvas = document.createElement('canvas');
    const size = Math.round(GRID_SIZE * 1.5);
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    trailGlowCanvas = canvas;
    return canvas;
};

export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    return; // Gridlines disabled for a cleaner look
    const { ctx, isDarkMode, camera, visitedAtCoord, unveilMap } = rCtx;
    const s = GRID_SIZE;

    if (camera.zoom < 0.15 || unveilMap) return; // Disable grid lines when map is revealed

    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1 / camera.zoom;
    
    // Optimize: Batch grid lines to reduce stroke calls
    for (let gx = gX1; gx <= gX2; gx++) {
        for (let gy = gY1; gy <= gY2; gy++) {
            if (!visitedAtCoord[`${gx},${gy}`]) {
                const x = gx * s, y = gy * s;
                ctx.moveTo(x, y); ctx.lineTo(x + s, y);
                ctx.moveTo(x, y); ctx.lineTo(x, y + s);
            }
        }
    }
    ctx.stroke();
};

export const drawEntities = (
    rCtx: RenderContext,
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>,
    characterName: string | null
) => {
    const { ctx, currentZ, activeId, allRooms, preloaded } = rCtx;
    const trail = playerTrailRef.current;
    const tGlow = getTrailGlow();

    // 1. Optimized Player Trail (No shadowBlur)
    if (trail.length > 0) {
        for (let i = 0; i < trail.length; i++) {
            const t = trail[i];
            const zDist = Math.abs(t.z - currentZ);
            if (zDist < 1.0) {
                const alpha = Math.max(0, t.alpha * (1 - zDist));
                ctx.globalAlpha = alpha;
                const size = (2.5 + (t.alpha * 4)) * 3; // Glow radius
                ctx.drawImage(tGlow, t.x * GRID_SIZE + GRID_SIZE / 2 - size, t.y * GRID_SIZE + GRID_SIZE / 2 - size, size * 2, size * 2);
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // 2. Optimized Player (No shadowBlur, selective clipping)
    if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.0) {
        const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
        const alpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ));
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Wall-aware clipping: Only if zoomed in (too expensive for wide view)
        if (rCtx.camera.zoom > 0.1) {
            const room = activeId ? (allRooms[activeId] || allRooms[`m_${activeId}`]) : null;
            let exits = room?.exits;
            if (!exits && activeId) {
                const rawId = activeId.startsWith('m_') ? activeId.substring(2) : activeId;
                if (preloaded[rawId]) exits = preloaded[rawId][4];
            }

            if (exits) {
                ctx.beginPath();
                ctx.rect(px - GRID_SIZE / 2 - 1, py - GRID_SIZE / 2 - 1, GRID_SIZE + 2, GRID_SIZE + 2);
                for (const dir in exits) {
                    const d = DIRS[dir];
                    if (d && (d.dx !== 0 || d.dy !== 0)) {
                        ctx.rect(px + d.dx * (GRID_SIZE / 2) - GRID_SIZE / 2 - 1, py + d.dy * (GRID_SIZE / 2) - GRID_SIZE / 2 - 1, GRID_SIZE + 2, GRID_SIZE + 2);
                    }
                }
                ctx.clip();
            }
        }

        const pGlow = getPlayerGlow();
        ctx.drawImage(pGlow, px - pGlow.width / 2, py - pGlow.height / 2);
        
        // Solid Player Dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. Walk Target & Path Highlighting
        const walkId = rCtx.walkTargetId;
        if (walkId) {
            const room = allRooms[walkId] || allRooms[`m_${walkId}`];
            let tx, ty, tz;
            if (room) {
                tx = room.x; ty = room.y; tz = room.z || 0;
            } else {
                const rawId = walkId.startsWith('m_') ? walkId.substring(2) : walkId;
                const pData = preloaded[rawId];
                if (pData) {
                    tx = pData[0]; ty = pData[1]; tz = pData[2] || 0;
                }
            }

            if (tx !== undefined && ty !== undefined && Math.abs(tz - currentZ) < 1.0) {
                const targetX = tx * GRID_SIZE, targetY = ty * GRID_SIZE;
                
                // Target Highlight (White Border)
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3 / rCtx.camera.zoom;
                ctx.setLineDash([]);
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                
                // White outer glow
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 15;
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                ctx.restore();

                // Path Line (Dashed White)
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2 / rCtx.camera.zoom;
                ctx.setLineDash([5 / rCtx.camera.zoom, 5 / rCtx.camera.zoom]);
                
                // If we have a full path, follow it
                if (rCtx.walkPath && rCtx.walkPath.length > 0) {
                    ctx.moveTo(px, py);
                    rCtx.walkPath.forEach((stepId) => {
                        const sRoom = allRooms[stepId] || allRooms[`m_${stepId}`];
                        let sx, sy;
                        if (sRoom) {
                            sx = sRoom.x; sy = sRoom.y;
                        } else {
                            const rsId = stepId.startsWith('m_') ? stepId.substring(2) : stepId;
                            const psData = preloaded[rsId];
                            if (psData) {
                                sx = psData[0]; sy = psData[1];
                            }
                        }
                        if (sx !== undefined && sy !== undefined) {
                            ctx.lineTo(sx * GRID_SIZE + GRID_SIZE / 2, sy * GRID_SIZE + GRID_SIZE / 2);
                        }
                    });
                } else {
                    // Fallback to direct line if no path but target exists
                    ctx.moveTo(px, py);
                    ctx.lineTo(targetX + GRID_SIZE / 2, targetY + GRID_SIZE / 2);
                }
                
                ctx.stroke();
                ctx.restore();
            }
        }
    }
};

export const drawMarkers = (
    rCtx: RenderContext,
    stableMarkersRef: React.MutableRefObject<Record<string, any>>,
    selectedMarkerId: string | null,
    vX1: number, vY1: number, vX2: number, vY2: number
) => {
    const { ctx, now, ANIM_DUR, currentZ } = rCtx;

    Object.values(stableMarkersRef.current).forEach((marker: any) => {
        const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE; 
        if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE || (marker.z || 0) !== currentZ) return;
        
        const isSelected = selectedMarkerId === marker.id;
        const dotSize = marker.dotSize || 8;
        const mSeed = marker.x * 1.5 + marker.y * 2.5;
        const mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
        
        ctx.save();
        if (mP < 1) {
            // Animation phase: still uses some math but restricted
            const mR = dotSize * 6 * mP; 
            ctx.beginPath(); 
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const jitter = (getSeed(mSeed + i, mSeed) - 0.5) * dotSize * 2 * (1 - mP);
                ctx.lineTo(mx + Math.cos(angle) * (mR + jitter), my + Math.sin(angle) * (mR + jitter));
            }
            ctx.closePath(); 
            ctx.clip(); 
            ctx.translate((getSeed(mSeed, now * 0.01) - 0.5) * 2 * (1 - mP), (getSeed(mSeed + 1, now * 0.012) - 0.5) * 2 * (1 - mP));
        }

        ctx.fillStyle = isSelected ? '#ef4444' : '#000000'; 
        ctx.beginPath();
        if (mP < 1) {
            // Animated irregular shape
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const jitter = (getSeed(mSeed + i, 0) - 0.5) * (dotSize * 0.4);
                ctx.lineTo(mx + Math.cos(angle) * (dotSize + jitter), my + Math.sin(angle) * (dotSize + jitter));
            }
        } else {
            // Optimized static circle for established markers
            ctx.arc(mx, my, dotSize, 0, Math.PI * 2);
        }
        ctx.closePath(); 
        ctx.fill(); 

        if (marker.text) { 
            ctx.font = `${marker.fontSize || 16}px Aniron`; 
            ctx.fillStyle = '#8b0000'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'bottom'; 
            ctx.fillText(marker.text, mx, my - dotSize - 4); 
        }
        ctx.restore();
    });
};

export const drawMarquee = (rCtx: RenderContext, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
    const { ctx, dpr } = rCtx;
    if (marquee && marquee.start && marquee.end) {
        const x1 = marquee.start.x / dpr, y1 = marquee.start.y / dpr, x2 = marquee.end.x / dpr, y2 = marquee.end.y / dpr;
        ctx.save(); ctx.scale(dpr, dpr); ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.restore();
    }
};
