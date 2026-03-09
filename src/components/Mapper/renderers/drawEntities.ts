import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS } from '../mapperUtils';

// Pre-render glow for optimization
let glowCanvas: HTMLCanvasElement | null = null;
const getGlowCanvas = () => {
    if (glowCanvas) return glowCanvas;
    const canvas = document.createElement('canvas');
    const size = Math.round(GRID_SIZE * 2.2);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const glowRadius = GRID_SIZE * 1.1;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    glowCanvas = canvas;
    return canvas;
};

export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    const { ctx, isDarkMode, camera, visitedAtCoord } = rCtx;
    const s = GRID_SIZE;

    // Skip drawing grid if too zoomed out
    if (camera.zoom < 0.1) return;

    ctx.beginPath();
    // Darker grid for grey background in light mode
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1 / camera.zoom;
    
    for (let gx = gX1; gx <= gX2; gx++) {
        for (let gy = gY1; gy <= gY2; gy++) {
            // Speed up: seulement dessiner la grille si la cellule n'est PAS visitée (fog of war)
            if (!visitedAtCoord[`${gx},${gy}`]) {
                const x = gx * s, y = gy * s;
                ctx.moveTo(x, y); ctx.lineTo(x + s, y);
                ctx.moveTo(x, y); ctx.lineTo(x, y + s);
                if (!visitedAtCoord[`${gx + 1},${gy}`]) { ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); }
                if (!visitedAtCoord[`${gx},${gy + 1}`]) { ctx.moveTo(x, y + s); ctx.lineTo(x + s, y + s); }
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
    const { ctx, currentZ } = rCtx;

    // Player Trail
    const trail = playerTrailRef.current;
    if (trail.length > 0) {
        ctx.save(); 
        ctx.shadowBlur = 10; 
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)'; // Red glow for the trail
        const trailLen = trail.length;
        for (let i = 0; i < trailLen; i++) {
            const t = trail[i];
            const zDist = Math.abs(t.z - currentZ);
            if (zDist < 1.5) {
                ctx.globalAlpha = Math.max(0, t.alpha * (1 - zDist)); 
                ctx.fillStyle = '#ef4444'; 
                ctx.beginPath();
                // Increased trail dot size
                ctx.arc(t.x * GRID_SIZE + GRID_SIZE / 2, t.y * GRID_SIZE + GRID_SIZE / 2, 2.5 + (t.alpha * 4), 0, Math.PI * 2); 
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // Player
    if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.5) {
        const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
        const alpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ));
        
        // Player glow (static, no pulse)
        // Wall-aware clipping: restrict light to current room and adjacent rooms with exits
        const activeId = rCtx.activeId;
        const allRooms = rCtx.allRooms;
        const preloaded = rCtx.preloaded;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Find best source of exits for the current room
        const room = activeId ? allRooms[activeId] : null;
        let exits = room?.exits;
        
        // Fallback: If no exits in local room, try preloaded data (strip 'm_' prefix if needed)
        if (!exits && activeId) {
            const rawId = activeId.startsWith('m_') ? activeId.substring(2) : activeId;
            if (preloaded[rawId]) {
                exits = preloaded[rawId][4];
            }
        }

        if (room || exits) {
            ctx.beginPath();
            // Current room (slightly larger to ensure no gaps)
            ctx.rect(px - GRID_SIZE / 2 - 2, py - GRID_SIZE / 2 - 2, GRID_SIZE + 4, GRID_SIZE + 4);
            
            // Neighbor rooms reachable via exits
            if (exits) {
                for (const dir in exits) {
                    const d = DIRS[dir];
                    // Skip 'u' (up) and 'd' (down) as they don't have x/y displacement
                    if (d && (d.dx !== 0 || d.dy !== 0)) {
                        const halfG = GRID_SIZE / 2;
                        if (d.dx !== 0 && d.dy !== 0) {
                            // Diagonal: Add a small connecting square
                            ctx.rect(px + d.dx * halfG - halfG/2 - 1, py + d.dy * halfG - halfG/2 - 1, halfG + 2, halfG + 2);
                        } else {
                            // Cardinal: Extend halfway into next room
                            ctx.rect(px + d.dx * halfG - halfG - 1, py + d.dy * halfG - halfG - 1, GRID_SIZE + 2, GRID_SIZE + 2);
                        }
                    }
                }
            }
            ctx.clip();
        }

        const gCanvas = getGlowCanvas();
        ctx.drawImage(gCanvas, px - gCanvas.width/2, py - gCanvas.height/2);
        ctx.restore();

        // Static, semi-transparent player dot
        const dotSize = 10;
        
        ctx.save(); 
        ctx.globalAlpha = alpha * 0.8; 
        ctx.shadowBlur = 12; 
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'; 
        ctx.fillStyle = '#ef4444'; 
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE; if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE || (marker.z || 0) !== currentZ) return;
        const isSelected = selectedMarkerId === marker.id, dotSize = marker.dotSize || 8, mSeed = marker.x * 1.5 + marker.y * 2.5, mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
        if (mP < 1) {
            ctx.save(); const mR = dotSize * 6 * mP; ctx.beginPath(); for (let i = 0; i < 10; i++) ctx.lineTo(mx + Math.cos((i/10)*Math.PI*2) * (mR+(getSeed(mSeed+i,mSeed)-0.5)*dotSize*2*(1-mP)), my + Math.sin((i/10)*Math.PI*2)*(mR+(getSeed(mSeed+i,mSeed)-0.5)*dotSize*2*(1-mP)));
            ctx.closePath(); ctx.clip(); ctx.translate((getSeed(mSeed,now*0.01)-0.5)*2*(1-mP), (getSeed(mSeed+1,now*0.012)-0.5)*2*(1-mP));
        }
        ctx.fillStyle = isSelected ? '#ef4444' : '#000000'; ctx.beginPath(); for (let i = 0; i < 8; i++) ctx.lineTo(mx + Math.cos((i/8)*Math.PI*2)*(dotSize+(getSeed(mSeed+i,0)-0.5)*(dotSize*0.4)), my + Math.sin((i/8)*Math.PI*2)*(dotSize+(getSeed(mSeed+i,0)-0.5)*(dotSize*0.4)));
        ctx.closePath(); ctx.fill(); if (marker.text) { ctx.font = `${marker.fontSize || 16}px Aniron`; ctx.fillStyle = '#8b0000'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(marker.text, mx, my - dotSize - 4); }
        if (mP < 1) ctx.restore();
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