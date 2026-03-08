import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE } from '../mapperUtils';

export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    const { ctx, isDarkMode, camera, visitedAtCoord } = rCtx;
    const s = GRID_SIZE;
    ctx.beginPath();
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
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
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
        const trailLen = trail.length;
        for (let i = 0; i < trailLen; i++) {
            const t = trail[i];
            const zDist = Math.abs(t.z - currentZ);
            if (zDist < 1.5) {
                ctx.globalAlpha = Math.max(0, t.alpha * (1 - zDist)); ctx.fillStyle = '#ef4444'; ctx.beginPath();
                ctx.arc(t.x * GRID_SIZE + GRID_SIZE / 2, t.y * GRID_SIZE + GRID_SIZE / 2, 1 + (t.alpha * 4), 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
    }

    // Player
    if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.5) {
        const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ)); ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#ef4444'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2, jit = (getSeed(i, 999) - 0.5) * 1.5; ctx.lineTo(px + Math.cos(ang) * (7 + jit), py + Math.sin(ang) * (7 + jit)); }
        ctx.closePath(); ctx.fill();
        if (characterName) {
            const clean = characterName.replace(/\x1b\[[0-9;]*m/g, '').replace(/^\{FULLNAME:/i, '').replace(/\}$/g, '').split(' ')[0].replace(/[{}"']/g, '').split(':').pop()?.trim() || "";
            ctx.font = 'bold 13px "Aniron"'; ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.fillText(clean, px, py - 18);
        }
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