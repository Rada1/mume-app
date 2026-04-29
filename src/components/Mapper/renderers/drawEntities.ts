import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS } from '../mapperUtils';
import { getMemberColor } from '../../../utils/groupUtils';
import { COLOR_NPC, COLOR_PLAYER, COLOR_OBJ } from '../../../utils/categorizationUtils';
import { occupantAnims, OCCUPANT_ANIM_DURATION, getOccupantKey } from '../occupantAnimStore';
import { getMapOccupantTargets } from '../occupantTargets';

type RoomAnchor = { x: number, y: number, z: number };
type RoomLike = { x: number, y: number, z?: number, gmcpId?: string | number };
const getRawRoomId = (id: string) => id.startsWith('m_') ? id.substring(2) : id;

const resolveActiveRoomAnchor = (
    rCtx: RenderContext,
    playerPosRef: React.MutableRefObject<RoomAnchor | null>
): RoomAnchor | null => {
    if (rCtx.centerOverride) return rCtx.centerOverride;
    if (playerPosRef.current) return playerPosRef.current;
    if (!rCtx.activeId) return null;

    const rawId = getRawRoomId(rCtx.activeId);
    const localId = rCtx.serverIdIndexRef?.current?.[rawId];
    const room = rCtx.allRooms[rCtx.activeId] ||
        rCtx.allRooms[`m_${rawId}`] ||
        (localId ? rCtx.allRooms[`m_${localId}`] || rCtx.allRooms[localId] : undefined) ||
        Object.values(rCtx.allRooms).find((candidate: RoomLike) => String(candidate.gmcpId) === rawId);

    if (room) return { x: room.x, y: room.y, z: room.z || 0 };

    const preloadedRoom = rCtx.preloaded[rawId] || (localId ? rCtx.preloaded[localId] : undefined);
    return preloadedRoom ? { x: preloadedRoom[0], y: preloadedRoom[1], z: preloadedRoom[2] || 0 } : null;
};

export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    return; // Gridlines disabled for a cleaner look
};

// --- Room Occupants (NPCs / Non-group Players) ---
// Global tracker for "last known positioning" to ensure smooth exit animations
const lastPetalPositions = new Map<string, { dx: number, dy: number, isPlayer: boolean }>();

/**
 * Draws small colored orbs for NPCs and players in the current room.
 * Group members are positioned in an inner petal ring, while everyone else is in an outer ring.
 */
export const drawRoomOccupants = (
    rCtx: RenderContext,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>,
    characterName: string | null = null
) => {
    const { ctx, currentZ, now, roomChars, roomPlayers, roomNpcs, roomItems, groupMembers, camera, playerColor, npcColor, objectColor, opponentId, opponentName, triggerRender } = rCtx;

    // Resolve through live rooms, server-id mappings, and preloaded rooms so the
    // current-room dots survive when the player position ref has not caught up.
    const anchor = resolveActiveRoomAnchor(rCtx, playerPosRef);
    if (!anchor || Math.abs(anchor.z - currentZ) >= 1.0) return;

    const px = anchor.x * GRID_SIZE + GRID_SIZE / 2;
    const py = anchor.y * GRID_SIZE + GRID_SIZE / 2;

    const occupantTargets = getMapOccupantTargets({
        anchor,
        cameraZoom: camera.zoom,
        roomChars,
        roomPlayers,
        roomNpcs,
        groupMembers,
        characterName,
        inlineCategories: rCtx.inlineCategories,
        playerColor: playerColor || 'rgba(125, 211, 252, 1)',
        npcColor: npcColor || COLOR_NPC
    });

    const otherOccupants = occupantTargets.filter(target => target.ring === 'outer');
    const groupOccupants = occupantTargets.filter(target => target.ring === 'inner');

    // 3. Clean expired anim entries; collect exit-animating occupants
    const exitAnims: { key: string }[] = [];
    for (const [key, anim] of occupantAnims.entries()) {
        if (now - anim.startTime >= OCCUPANT_ANIM_DURATION) {
            occupantAnims.delete(key);
            continue;
        }
        if (anim.type === 'exit') {
            const stillPresent = occupantTargets.some(o =>
                getOccupantKey(o.id, o.name) === key ||
                ('name:' + o.name.toLowerCase()) === key
            );
            if (!stillPresent) {
                exitAnims.push({ key });
            }
        }
    }

    const zoomFactor = (camera.zoom > 1.5 ? 1 : Math.sqrt(camera.zoom));
    const pulse = (Math.sin(now / 400) + 1) / 2;

    const drawDot = (orbX: number, orbY: number, color: string, alpha: number) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.shadowBlur = 5 / camera.zoom;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(orbX, orbY, Math.max(2.25, 3.15 / Math.sqrt(camera.zoom)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const drawRing = (occupants: typeof occupantTargets) => {
        occupants.forEach(occ => {
            const petalX = occ.x;
            const petalY = occ.y;
            const key = getOccupantKey(occ.id, occ.name);
            const pos = { dx: petalX - px, dy: petalY - py, isPlayer: occ.kind === 'player' };
            lastPetalPositions.set(key, pos);
            lastPetalPositions.set('name:' + occ.name.toLowerCase(), pos);

            const anim = occupantAnims.get(key) ?? occupantAnims.get('name:' + occ.name.toLowerCase());
            let orbX = petalX, orbY = petalY, alpha = 0.85;

            if (anim && anim.type === 'enter' && DIRS[anim.dir]) {
                const { dx, dy } = DIRS[anim.dir];
                const t = Math.min((now - anim.startTime) / OCCUPANT_ANIM_DURATION, 1.0);
                const eased = 1 - Math.pow(1 - t, 3);
                const startX = px + dx * GRID_SIZE;
                const startY = py + dy * GRID_SIZE;
                orbX = startX + (petalX - startX) * eased;
                orbY = startY + (petalY - startY) * eased;
                alpha = 0.2 + 0.65 * eased;
                if (t < 1.0) triggerRender?.();
            }

            drawDot(orbX, orbY, occ.color, alpha);

            // Opponent tether
            let isOpponent = false;
            if (opponentId != null && occ.id != null) {
                isOpponent = String(opponentId) === String(occ.id);
            } else if (opponentName) {
                const ol = opponentName.toLowerCase(), nl = occ.name.toLowerCase();
                isOpponent = ol === nl || ol.includes(nl) || nl.includes(ol);
            }
            if (isOpponent) {
                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.lineWidth = 2.0 / zoomFactor;
                ctx.setLineDash([4, 4]);
                ctx.moveTo(px, py);
                ctx.lineTo(orbX, orbY);
                ctx.stroke();
                ctx.restore();
            }
        });
    };

    // 4. Draw Rings
    drawRing(otherOccupants);
    drawRing(groupOccupants);

    // 4.5 Draw room items as squares in a line at the bottom
    if (roomItems && roomItems.length > 0) {
        const itemSize = 4 / camera.zoom;
        const itemGap = 2 / camera.zoom;
        const totalWidth = roomItems.length * (itemSize + itemGap) - itemGap;
        let startX = px - totalWidth / 2;
        const itemY = py + (GRID_SIZE / 2) - 6;

        roomItems.forEach(item => {
            ctx.save();
            ctx.fillStyle = objectColor || COLOR_OBJ;
            ctx.shadowBlur = 4 + pulse * 2;
            ctx.shadowColor = objectColor || COLOR_OBJ;
            ctx.fillRect(startX, itemY, itemSize, itemSize);
            ctx.restore();
            startX += itemSize + itemGap;
        });
    }

    // 5. Draw exit-animating occupants
    for (const { key } of exitAnims) {
        const anim = occupantAnims.get(key);
        if (!anim || !DIRS[anim.dir]) continue;
        const { dx, dy } = DIRS[anim.dir];
        const t = Math.min((now - anim.startTime) / OCCUPANT_ANIM_DURATION, 1.0);
        const eased = t * t;

        if (!anim.startOffset) {
            let offset = lastPetalPositions.get(key);
            if (!offset && anim.name) {
                offset = lastPetalPositions.get('name:' + anim.name.toLowerCase());
            }
            anim.startOffset = offset || { dx: 0, dy: 0 };
        }
        
        const isActuallyPlayer = anim.isPlayer || (lastPetalPositions.get(key)?.isPlayer) || (anim.name ? lastPetalPositions.get('name:' + anim.name.toLowerCase())?.isPlayer : false);
        const color = isActuallyPlayer ? (playerColor || COLOR_PLAYER) : (npcColor || COLOR_NPC);

        const startX = px + anim.startOffset.dx;
        const startY = py + anim.startOffset.dy;
        const targetX = px + dx * GRID_SIZE;
        const targetY = py + dy * GRID_SIZE;
        const orbX = startX + (targetX - startX) * eased;
        const orbY = startY + (targetY - startY) * eased;
        const alpha = 0.85 * (1 - t);
        drawDot(orbX, orbY, color, alpha);
        triggerRender?.();
    }
};

export const drawEntities = (
    rCtx: RenderContext,
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>,
    characterName: string | null
) => {
    const { ctx, currentZ, activeId, allRooms, preloaded } = rCtx;
    
    const anchor = resolveActiveRoomAnchor(rCtx, playerPosRef);
    const trail = playerTrailRef.current;

    // 1. Player Trail — teardrop streak that retracts tail-first toward the player
    const TRAIL_DURATION = 450; // ms, must match useMapAnimation
    const wallNow = rCtx.now;
    if (trail.length > 0 && anchor && Math.abs(anchor.z - currentZ) < 1.0) {
        const px = anchor.x * GRID_SIZE + GRID_SIZE / 2;
        const py = anchor.y * GRID_SIZE + GRID_SIZE / 2;

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
            ctx.fillStyle = '#ffffff';

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
    if (anchor && Math.abs(anchor.z - currentZ) < 1.0) {
        const px = anchor.x * GRID_SIZE + GRID_SIZE / 2, py = anchor.y * GRID_SIZE + GRID_SIZE / 2;
        const alpha = Math.max(0, 1 - Math.abs(anchor.z - currentZ));
        
        const pulse = (Math.sin(rCtx.now / 300) + 1) / 2; // 0 to 1 pulse
        const orbRadius = 5.5 + (pulse * 1.5);
        
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
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Glowing transparent orb: radial gradient
        const orbGradient = ctx.createRadialGradient(px, py, 0, px, py, orbRadius * 1.3);
        orbGradient.addColorStop(0,   `rgba(255, 255, 255, ${0.7 + pulse * 0.25})`);
        orbGradient.addColorStop(0.35, `rgba(255, 255, 255, ${0.45 + pulse * 0.15})`);
        orbGradient.addColorStop(0.7,  `rgba(255, 255, 255, ${0.2 + pulse * 0.1})`);
        orbGradient.addColorStop(1,    'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = alpha;
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // 3. Client-side movement predictions (red dots + tether lines)
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
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5 / rCtx.camera.zoom;
                ctx.setLineDash([4 / rCtx.camera.zoom, 4 / rCtx.camera.zoom]);
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // White prediction arrow pointing in the direction of travel
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ffffff';
                ctx.translate(toX, toY);
                const angle = Math.atan2(toY - fromY, toX - fromX);
                ctx.rotate(angle);
                
                const arrowSize = 6;
                ctx.beginPath();
                ctx.moveTo(arrowSize * 1.5, 0);
                ctx.lineTo(-arrowSize, -arrowSize);
                ctx.lineTo(-arrowSize * 0.4, 0);
                ctx.lineTo(-arrowSize, arrowSize);
                ctx.closePath();
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
                ctx.strokeStyle = rCtx.isDarkMode ? '#ffffff' : '#000000';
                ctx.lineWidth = 3 / rCtx.camera.zoom;
                ctx.setLineDash([]);
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                
                ctx.strokeRect(targetX - 2, targetY - 2, GRID_SIZE + 4, GRID_SIZE + 4);
                ctx.restore();

                ctx.save();
                ctx.beginPath();
                ctx.strokeStyle = rCtx.isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)';
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

    // 5. Room Occupants (NPCs & Players, now partitioned by Group status)
    drawRoomOccupants(rCtx, playerPosRef, characterName);
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
    const ORB_RADIUS = 4;

    // --- Resolve Player Position once ---
    let prx: number | undefined, pry: number | undefined, prz = 0;
    if (rCtx.activeId) {
        const pLocalRoom = allRooms[`m_${rCtx.activeId}`] || allRooms[rCtx.activeId];
        if (pLocalRoom) {
            prx = pLocalRoom.x; pry = pLocalRoom.y; prz = pLocalRoom.z || 0;
        } else {
            const rawId = rCtx.activeId.startsWith('m_') ? rCtx.activeId.substring(2) : rCtx.activeId;
            const p = preloaded[rawId];
            if (p) { prx = p[0]; pry = p[1]; prz = p[2] || 0; }
        }
    }

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
        const index = occupants.indexOf(memberKey);
        const count = occupants.length;
        let offsetX = 0, offsetY = 0;
        const zoomFactor = (camera.zoom > 1.5 ? 1 : Math.sqrt(camera.zoom));
        const PETAL_RADIUS = 9.0 / zoomFactor;
        const angle = (index / count) * Math.PI * 2;
        offsetX = Math.cos(angle) * PETAL_RADIUS;
        offsetY = Math.sin(angle) * PETAL_RADIUS;

        const px = rx * GRID_SIZE + GRID_SIZE / 2 + offsetX;
        const py = ry * GRID_SIZE + GRID_SIZE / 2 + offsetY;
        const alpha = Math.max(0, 1 - Math.abs(rz - currentZ));

        // --- Off-Screen Indicators ---
        // If the group member is off-camera, draw a directional arrow at the edge of the map
        const viewX1 = camera.x, viewY1 = camera.y;
        const viewW = ctx.canvas.width / (rCtx.dpr * camera.zoom);
        const viewH = ctx.canvas.height / (rCtx.dpr * camera.zoom);
        const viewX2 = viewX1 + viewW, viewY2 = viewY1 + viewH;

        const isOffScreen = px < viewX1 || px > viewX2 || py < viewY1 || py > viewY2;
        if (isOffScreen && alpha > 0.1) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Use screen coordinates for the indicator

            // Calculate direction vector from camera center to member
            const centerX = viewX1 + viewW / 2;
            const centerY = viewY1 + viewH / 2;
            const dx = px - centerX;
            const dy = py - centerY;
            const angleToMember = Math.atan2(dy, dx);

            // Determine intersection with the screen edge
            const aspect = viewW / viewH;
            const tanAngle = Math.abs(Math.tan(angleToMember));
            let edgeX, edgeY;

            if (tanAngle < 1 / aspect) {
                // Intersects Left or Right edge
                edgeX = Math.sign(dx) * (viewW / 2 - 10);
                edgeY = edgeX * Math.tan(angleToMember);
            } else {
                // Intersects Top or Bottom edge
                edgeY = Math.sign(dy) * (viewH / 2 - 10);
                edgeX = edgeY / Math.tan(angleToMember);
            }

            // Convert to screen pixels
            const screenX = (viewW / 2 + edgeX) * rCtx.dpr * camera.zoom;
            const screenY = (viewH / 2 + edgeY) * rCtx.dpr * camera.zoom;

            ctx.translate(screenX, screenY);
            ctx.rotate(angleToMember);

            // Draw arrow (scaled up from 8/-6/-2 to 12/-9/-3)
            ctx.fillStyle = color.core;
            ctx.globalAlpha = 0.85 * alpha;
            ctx.beginPath();
            ctx.moveTo(12, 0);   // Tip
            ctx.lineTo(-9, -9);  // Back-left
            ctx.lineTo(-3, 0);   // Back-center (indent)
            ctx.lineTo(-9, 9);   // Back-right
            ctx.closePath();
            ctx.fill();

            // Subtle glow
            ctx.shadowBlur = 8;
            ctx.shadowColor = color.core;
            ctx.fill();

            const isSameRoom = prx !== undefined && prx === rx && pry === ry && prz === rz;
            if (!isSameRoom) {
                // Name plate below arrow
                ctx.rotate(-angleToMember);
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = color.core;
                ctx.textAlign = 'center';
                ctx.shadowBlur = 4;
                ctx.shadowColor = 'black';
                ctx.fillText(member.name, 0, 18);
            }

            ctx.restore();
        }

        if (isOffScreen) return;

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

        const orbRadius = ORB_RADIUS;
        ctx.save();
        ctx.globalAlpha = alpha * 0.92;
        ctx.fillStyle = color.core;
        ctx.beginPath();
        ctx.arc(px, py, orbRadius * 0.75, 0, Math.PI * 2);
        ctx.fill();

        const isSameRoom = prx !== undefined && prx === rx && pry === ry && prz === rz;
        if (!isSameRoom) {
            ctx.font = `bold ${8 / camera.zoom}px Inter`;
            ctx.fillStyle = color.core;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'black';
            ctx.fillText(member.name, px, py - (orbRadius + 2) / camera.zoom);
        }

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

export const drawDeathIndicator = (rCtx: RenderContext) => {
    const { ctx, deathRoomId, allRooms, preloaded, currentZ, camera, now, dpr } = rCtx;
    if (!deathRoomId) return;

    let rx: number | undefined, ry: number | undefined, rz: number | undefined;

    // Resolve death room coordinates
    const localRoom = allRooms[`m_${deathRoomId}`] || allRooms[deathRoomId] || Object.values(allRooms).find(r => String(r.gmcpId) === deathRoomId);
    if (localRoom) {
        rx = localRoom.x; ry = localRoom.y; rz = localRoom.z || 0;
    } else if (preloaded[deathRoomId]) {
        const p = preloaded[deathRoomId];
        rx = p[0]; ry = p[1]; rz = p[2] || 0;
    }

    if (rx === undefined || ry === undefined) return;
    if (rz === undefined) rz = 0;

    const px = rx * GRID_SIZE + GRID_SIZE / 2;
    const py = ry * GRID_SIZE + GRID_SIZE / 2;
    const alpha = Math.max(0, 1 - Math.abs(rz - currentZ));

    // Pulse effect
    const pulse = (Math.sin(now / 350) + 1) / 2;

    // --- Off-Screen Indicators ---
    const viewX1 = camera.x, viewY1 = camera.y;
    const viewW = ctx.canvas.width / (rCtx.dpr * camera.zoom);
    const viewH = ctx.canvas.height / (rCtx.dpr * camera.zoom);
    const viewX2 = viewX1 + viewW, viewY2 = viewY1 + viewH;

    const isOffScreen = px < viewX1 || px > viewX2 || py < viewY1 || py > viewY2;

    if (isOffScreen) {
        // Draw directional arrow at screen edge
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const centerX = viewX1 + viewW / 2;
        const centerY = viewY1 + viewH / 2;
        const dx = px - centerX;
        const dy = py - centerY;
        const angleToMember = Math.atan2(dy, dx);

        const aspect = viewW / viewH;
        const tanAngle = Math.abs(Math.tan(angleToMember));
        let edgeX, edgeY;

        if (tanAngle < 1 / aspect) {
            edgeX = Math.sign(dx) * (viewW / 2 - 15);
            edgeY = edgeX * Math.tan(angleToMember);
        } else {
            edgeY = Math.sign(dy) * (viewH / 2 - 15);
            edgeX = edgeY / Math.tan(angleToMember);
        }

        const screenX = (viewW / 2 + edgeX) * rCtx.dpr * camera.zoom;
        const screenY = (viewH / 2 + edgeY) * rCtx.dpr * camera.zoom;

        // Draw Arrow
        ctx.translate(screenX, screenY);
        ctx.rotate(angleToMember);
        
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-8, -6);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 6);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.rotate(-angleToMember); // Reset rotation for text
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DEATH', 0, 18);

        ctx.restore();
    } else if (alpha > 0.1) {
        // On-screen pulsing red highlight
        ctx.save();
        ctx.globalAlpha = alpha * (0.3 + pulse * 0.4);
        ctx.fillStyle = '#ef4444';
        
        ctx.beginPath();
        ctx.arc(px, py, GRID_SIZE * 0.45 + (pulse * 4), 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
};

export const drawMarquee = (rCtx: RenderContext, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
    const { ctx, dpr } = rCtx;
    if (marquee && marquee.start && marquee.end) {
        const x1 = marquee.start.x / dpr, y1 = marquee.start.y / dpr, x2 = marquee.end.x / dpr, y2 = marquee.end.y / dpr;
        ctx.save(); ctx.scale(dpr, dpr); ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.restore();
    }
};
