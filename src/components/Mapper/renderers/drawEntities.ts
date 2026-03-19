import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS } from '../mapperUtils';
import { getMemberColor } from '../../../utils/groupUtils';


export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    return; // Gridlines disabled for a cleaner look
};

export const drawEntities = (
    rCtx: RenderContext,
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>,
    characterName: string | null
) => {
    const { ctx, currentZ, activeId, allRooms, preloaded } = rCtx;
    const trail = playerTrailRef.current;

    // 1. Player Trail — teardrop streak that retracts tail-first toward the player
    const TRAIL_DURATION = 450; // ms, must match useMapAnimation
    const wallNow = rCtx.now;
    if (trail.length > 0 && playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.0) {
        const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2;
        const py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;

        for (let i = 0; i < trail.length; i++) {
            const t = trail[i] as any;
            if (Math.abs(t.z - currentZ) >= 1.0) continue;

            const elapsed = wallNow - (t.startTime ?? 0);
            const progress = Math.min(1, elapsed / TRAIL_DURATION);
            if (progress >= 1) continue;

            const originX = t.x * GRID_SIZE + GRID_SIZE / 2;
            const originY = t.y * GRID_SIZE + GRID_SIZE / 2;

            // Tail point slides from old room toward player over time (shrinks tail-first)
            const tailX = originX + (px - originX) * progress;
            const tailY = originY + (py - originY) * progress;

            const dx = px - tailX;
            const dy = py - tailY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) continue;

            const nx = -dy / len;
            const ny =  dx / len;
            const halfW = 4 / rCtx.camera.zoom;

            ctx.save();
            ctx.globalAlpha = 0.65;
            ctx.fillStyle = '#ef4444';

            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(px + nx * halfW, py + ny * halfW);
            ctx.lineTo(px - nx * halfW, py - ny * halfW);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // 2. Pulsing Player Orb (Authoritative Source)
    if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.0) {
        const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2, py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;
        const alpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ));
        
        const pulse = (Math.sin(rCtx.now / 300) + 1) / 2; // 0 to 1 pulse
        const orbRadius = 8 + (pulse * 2);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Wall-aware clipping: Only if zoomed in
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

        // Solid core for better visibility
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Glowing transparent orb: radial gradient
        const orbGradient = ctx.createRadialGradient(px, py, 0, px, py, orbRadius * 1.3);
        orbGradient.addColorStop(0,   `rgba(239, 68, 68, ${0.7 + pulse * 0.25})`);
        orbGradient.addColorStop(0.35, `rgba(239, 68, 68, ${0.45 + pulse * 0.15})`);
        orbGradient.addColorStop(0.7,  `rgba(239, 68, 68, ${0.2 + pulse * 0.1})`);
        orbGradient.addColorStop(1,    'rgba(239, 68, 68, 0)');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // 3. Client-side movement predictions (gray dots + tether lines)
        const predictions = rCtx.clientPredictionsRef?.current;
        if (predictions && predictions.length > 0) {
            let fromX = px, fromY = py;
            for (let i = 0; i < predictions.length; i++) {
                const pred = predictions[i];
                if (Math.abs(pred.toZ - currentZ) >= 1.0) { fromX = pred.toX * GRID_SIZE + GRID_SIZE / 2; fromY = pred.toY * GRID_SIZE + GRID_SIZE / 2; continue; }
                const toX = pred.toX * GRID_SIZE + GRID_SIZE / 2;
                const toY = pred.toY * GRID_SIZE + GRID_SIZE / 2;
                const alpha = Math.max(0.25, 0.85 - i * 0.18);

                // Dashed tether line
                ctx.save();
                ctx.globalAlpha = alpha * 0.7;
                ctx.strokeStyle = '#aaaaaa';
                ctx.lineWidth = 1.5 / rCtx.camera.zoom;
                ctx.setLineDash([4 / rCtx.camera.zoom, 4 / rCtx.camera.zoom]);
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Gray prediction dot
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#aaaaaa';
                ctx.beginPath();
                ctx.arc(toX, toY, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                fromX = toX;
                fromY = toY;
            }
        }

        // 4. Walk Target & Path Highlighting
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
                
                ctx.save();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3 / rCtx.camera.zoom;
                ctx.setLineDash([]);
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2 / rCtx.camera.zoom;
                ctx.setLineDash([5 / rCtx.camera.zoom, 5 / rCtx.camera.zoom]);
                
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
                    ctx.moveTo(px, py);
                    ctx.lineTo(targetX + GRID_SIZE / 2, targetY + GRID_SIZE / 2);
                }
                
                ctx.stroke();
                ctx.restore();
            }
        }
    }
};

// --- Group Member Orbs ---

/**
 * Draws a green friend-orb for each group member that has a known map room (via mapid).
 * Resolves mapid -> room coordinates using the preloaded base map and local rooms.
 * Includes teardrop trail animation identical to the player orb (but green).
 */
export const drawGroupMembers = (rCtx: RenderContext) => {
    const { ctx, currentZ, allRooms, preloaded, now, groupMembers, camera, serverIdIndexRef } = rCtx;
    if (!groupMembers || groupMembers.length === 0) return;

    // --- Persistent trail state per group member (same 450ms as player trail) ---
    if (!(drawGroupMembers as any)._trails) (drawGroupMembers as any)._trails = new Map();
    if (!(drawGroupMembers as any)._lastPos) (drawGroupMembers as any)._lastPos = new Map();
    const trails = (drawGroupMembers as any)._trails as Map<string, any[]>;
    const lastPos = (drawGroupMembers as any)._lastPos as Map<string, { x: number, y: number, z: number }>;
    const TRAIL_DURATION = 450;

    const pulse = (Math.sin(now / 350) + 1) / 2;
    const ORB_RADIUS = 7;

    // --- Resolve & Group positions for petal layout ---
    const roomOccupancy = new Map<string, any[]>();
    const resolvedMembers: any[] = [];

    groupMembers.forEach(member => {
        if (!member.mapid) return;
        const memberKey = String(member.id ?? member.name ?? member.mapid);
        const serverVnum = String(member.mapid);

        let rx: number | undefined, ry: number | undefined, rz: number | undefined;

        // Step 1: serverIdIndexRef lookup
        let localVnum: string | undefined;
        if (serverIdIndexRef?.current) localVnum = serverIdIndexRef.current[serverVnum];

        // Step 2 & 3: preloaded base map
        if (localVnum && preloaded[localVnum]) {
            const p = preloaded[localVnum]; rx = p[0]; ry = p[1]; rz = p[2] || 0;
        } else if (preloaded[serverVnum]) {
            const p = preloaded[serverVnum]; rx = p[0]; ry = p[1]; rz = p[2] || 0;
        }

        // Step 4 & 5: local rooms
        if (rx === undefined) {
            const localRoom = allRooms[`m_${localVnum ?? serverVnum}`] || allRooms[localVnum ?? ''] || allRooms[serverVnum] || Object.values(allRooms).find(r => String(r.gmcpId) === serverVnum);
            if (localRoom) { rx = localRoom.x; ry = localRoom.y; rz = localRoom.z || 0; }
        }

        if (rx === undefined || ry === undefined) return;
        if (rz === undefined) rz = 0;
        
        const pos = { rx, ry, rz };
        resolvedMembers.push({ member, memberKey, ...pos });

        const roomKey = `${rx},${ry},${rz}`;
        if (!roomOccupancy.has(roomKey)) roomOccupancy.set(roomKey, []);
        roomOccupancy.get(roomKey)!.push(memberKey);
    });

    // We also need to know if the player is in the room for offset calculations
    const playerRoomKey = (rCtx as any)._playerRoomKey; // We'll infer this or pass it in Rctx later if needed, for now use currentRoomId/ref

    resolvedMembers.forEach(({ member, memberKey, rx, ry, rz }) => {
        const roomKey = `${rx},${ry},${rz}`;
        const occupants = roomOccupancy.get(roomKey) || [];
        
        // CONSISTENT COLOR FIX: Use the original index from the groupMembers list 
        // to ensure it matches the group tab, regardless of map resolution order.
        const originalIndex = groupMembers.findIndex(m => m.id === member.id);
        const color = getMemberColor(originalIndex !== -1 ? originalIndex : 0);
        
        // Track trail
        const prev = lastPos.get(memberKey);
        if (prev && (prev.x !== rx || prev.y !== ry)) {
            if (!trails.has(memberKey)) trails.set(memberKey, []);
            trails.get(memberKey)!.push({ x: prev.x, y: prev.y, z: prev.z, startTime: now, color: color.core });
        }
        lastPos.set(memberKey, { x: rx, y: ry, z: rz });

        if (trails.has(memberKey)) {
            trails.set(memberKey, trails.get(memberKey)!.filter((t: any) => now - t.startTime < TRAIL_DURATION));
        }

        if (Math.abs(rz - currentZ) >= 1.0) return;

        // --- Calculate Petal Offset ---
        let offsetX = 0, offsetY = 0;
        const index = occupants.indexOf(memberKey);
        const count = occupants.length;
        
        const PETAL_RADIUS = 4.2 / (camera.zoom > 1.5 ? 1 : Math.sqrt(camera.zoom));
        const angle = (index / count) * Math.PI * 2;
        offsetX = Math.cos(angle) * PETAL_RADIUS;
        offsetY = Math.sin(angle) * PETAL_RADIUS;

        const px = rx * GRID_SIZE + GRID_SIZE / 2 + offsetX;
        const py = ry * GRID_SIZE + GRID_SIZE / 2 + offsetY;
        const alpha = Math.max(0, 1 - Math.abs(rz - currentZ));

        // --- Trail (Draw toward the offset point using individual member color) ---
        const memberTrail = trails.get(memberKey) ?? [];
        memberTrail.forEach(t => {
            if (Math.abs(t.z - currentZ) >= 1.0) return;
            const elapsed = now - t.startTime;
            const progress = Math.min(1, elapsed / TRAIL_DURATION);
            if (progress >= 1) return;
            const originX = t.x * GRID_SIZE + GRID_SIZE / 2;
            const originY = t.y * GRID_SIZE + GRID_SIZE / 2;
            const tailX = originX + (px - originX) * progress;
            const tailY = originY + (py - originY) * progress;
            const dx = px - tailX, dy = py - tailY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1) return;
            const nx = -dy / len, ny = dx / len;
            const halfW = 4 / camera.zoom;
            ctx.save();
            ctx.globalAlpha = 0.65 * alpha;
            ctx.fillStyle = t.color || color.core;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(px + nx * halfW, py + ny * halfW);
            ctx.lineTo(px - nx * halfW, py - ny * halfW);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        // --- Orb ---
        const orbRadius = ORB_RADIUS;
        ctx.save();
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = color.core;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

    });
};


export const drawMarkers = (
    rCtx: RenderContext,
    stableMarkersRef: React.MutableRefObject<Record<string, any>>,
    selectedMarkerId: string | null,
    vX1: number, vY1: number, vX2: number, vY2: number
) => {
    const { ctx, now, ANIM_DUR, currentZ, unveilMap, exploredMarkers } = rCtx;

    Object.values(stableMarkersRef.current).forEach((marker: any) => {
        const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE; 
        if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE || (marker.z || 0) !== currentZ) return;
        
        // FOW Check: Hide markers unless unveiled or the marker has been discovered (exploredMarkers)
        if (!unveilMap && !exploredMarkers.has(marker.id)) return;

        const isSelected = selectedMarkerId === marker.id;
        const dotSize = marker.dotSize || 8;
        const mSeed = marker.x * 1.5 + marker.y * 2.5;
        const mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
        
        ctx.save();
        if (mP < 1) {
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
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const jitter = (getSeed(mSeed + i, 0) - 0.5) * (dotSize * 0.4);
                ctx.lineTo(mx + Math.cos(angle) * (dotSize + jitter), my + Math.sin(angle) * (dotSize + jitter));
            }
        } else {
            ctx.arc(mx, my, dotSize, 0, Math.PI * 2);
        }
        ctx.closePath(); 
        ctx.fill(); 

        if (marker.text) { 
            const fontSize = marker.fontSize || 16;
            ctx.font = `${fontSize}px Aniron`; 
            
            const metrics = ctx.measureText(marker.text);
            const textWidth = metrics.width;
            const textHeight = fontSize;
            
            // Define the center of the text area for the glow
            const centerX = mx;
            const centerY = my - dotSize - 4 - (textHeight / 2);
            
            // Draw diffuse background glow - Rectangular with soft edges
            const paddingX = 16;
            const paddingY = 6;
            const rectW = textWidth + paddingX * 2;
            const rectH = textHeight + paddingY * 2;
            const rectX = mx - rectW / 2;
            const rectY = my - dotSize - 4 - textHeight - paddingY;

            ctx.save();
            // Use shadowBlur for soft edges
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            
            // Draw rounded rectangle
            const r = 4; // subtle corner radius
            ctx.beginPath();
            ctx.moveTo(rectX + r, rectY);
            ctx.lineTo(rectX + rectW - r, rectY);
            ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + r);
            ctx.lineTo(rectX + rectW, rectY + rectH - r);
            ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - r, rectY + rectH);
            ctx.lineTo(rectX + r, rectY + rectH);
            ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - r);
            ctx.lineTo(rectX, rectY + r);
            ctx.quadraticCurveTo(rectX, rectY, rectX + r, rectY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#8b0000'; // Deep red
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
