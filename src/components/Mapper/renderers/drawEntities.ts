/**
 * @file Draws player, NPC, object, and trail entities on the mapper canvas.
 */
import { RenderContext, getSeed } from './rendererUtils';
import { GRID_SIZE, DIRS, WALL_COLOR, getGateState } from '../mapperUtils';
import { getMemberColor } from '../../../utils/groupUtils';
import { COLOR_NPC, COLOR_PLAYER, COLOR_OBJ } from '../../../utils/categorizationUtils';
import { occupantAnims, OCCUPANT_ANIM_DURATION, getOccupantKey } from '../occupantAnimStore';
import { getMapOccupantTargets } from '../occupantTargets';
import { isOpponentOccupant } from '../mapperOpponentUtils';
import { isObjectSelected } from '../../../utils/selectionUtils';
import type { GmcpOccupant, GroupMember } from '../../../types';

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

const getActiveRoomKeys = (rCtx: RenderContext): Set<string> => {
    const keys = new Set<string>();
    if (!rCtx.activeId) return keys;

    const rawId = getRawRoomId(rCtx.activeId);
    const localId = rCtx.serverIdIndexRef?.current?.[rawId] || rawId;
    keys.add(String(rawId));
    keys.add(String(localId));

    const activeRoom = rCtx.allRooms[rCtx.activeId] ||
        rCtx.allRooms[`m_${rawId}`] ||
        rCtx.allRooms[`m_${localId}`] ||
        rCtx.allRooms[localId];
    if (activeRoom?.gmcpId !== undefined && activeRoom.gmcpId !== null) {
        keys.add(String(activeRoom.gmcpId));
    }

    return keys;
};

const groupMemberIsInActiveRoom = (member: GroupMember, activeRoomKeys: Set<string>, rCtx: RenderContext): boolean => {
    if (member.mapid === undefined || member.mapid === null) return false;
    const mapid = String(member.mapid);
    if (activeRoomKeys.has(mapid)) return true;

    const localVnum = rCtx.serverIdIndexRef?.current?.[mapid];
    return !!localVnum && activeRoomKeys.has(String(localVnum));
};

const getGroupMemberDisplayName = (member: GroupMember): string | undefined => member.name || member.label;

const occupantMatchesGroupMember = (occupant: GmcpOccupant, member: GroupMember): boolean => {
    if (member.id !== undefined && occupant.id !== undefined && String(occupant.id) === String(member.id)) return true;
    const occupantName = (occupant.name || occupant.short || occupant.shortdesc || occupant.keyword || '').toLowerCase();
    const memberName = (getGroupMemberDisplayName(member) || '').toLowerCase();
    return !!occupantName && !!memberName && (
        occupantName === memberName ||
        occupantName.startsWith(`${memberName} `) ||
        occupantName.endsWith(` ${memberName}`)
    );
};

const addMissingCurrentRoomGroupMembers = (
    roomChars: Record<number, GmcpOccupant> | undefined,
    groupMembers: GroupMember[] | undefined,
    rCtx: RenderContext
): Record<number, GmcpOccupant> | undefined => {
    if (!groupMembers?.length) return roomChars;

    const activeRoomKeys = getActiveRoomKeys(rCtx);
    if (activeRoomKeys.size === 0) return roomChars;

    const next: Record<number, GmcpOccupant> = { ...(roomChars || {}) };
    let didAdd = false;

    groupMembers.forEach(member => {
        const memberName = getGroupMemberDisplayName(member);
        if (member.type === 'you' || !memberName) return;
        if (!groupMemberIsInActiveRoom(member, activeRoomKeys, rCtx)) return;
        if (Object.values(next).some(occupant => occupantMatchesGroupMember(occupant, member))) return;

        const syntheticKey = -Math.abs(Number(member.id) || hashGroupMemberName(memberName));
        next[syntheticKey] = {
            id: `group:${member.id ?? memberName}`,
            name: memberName,
            short: memberName,
            keyword: memberName,
            type: 'player',
            pc: true,
            mapid: member.mapid
        } as GmcpOccupant;
        didAdd = true;
    });

    return didAdd ? next : roomChars;
};

const hashGroupMemberName = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return hash || 1;
};

const getOccupantInitial = (name?: string) => {
    const cleanName = name?.trim().replace(/^(a|an|the)\s+/i, '');
    return cleanName ? cleanName.charAt(0).toUpperCase() : '';
};

const getMarkerTextColor = (color: string) => {
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgbMatch) return 'rgba(15, 15, 15, 0.92)';

    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
    return luminance > 130 ? 'rgba(15, 15, 15, 0.92)' : 'rgba(248, 250, 252, 0.95)';
};

export const drawGrid = (rCtx: RenderContext, gX1: number, gY1: number, gX2: number, gY2: number) => {
    const { ctx, isDarkMode, camera } = rCtx;
    return;
    if (camera && camera.zoom <= 0.35) return;

    ctx.strokeStyle = isDarkMode ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();

    // Vertical lines
    for (let x = gX1; x <= gX2; x++) {
        ctx.moveTo(x * GRID_SIZE, gY1 * GRID_SIZE);
        ctx.lineTo(x * GRID_SIZE, gY2 * GRID_SIZE);
    }

    // Horizontal lines
    for (let y = gY1; y <= gY2; y++) {
        ctx.moveTo(gX1 * GRID_SIZE, y * GRID_SIZE);
        ctx.lineTo(gX2 * GRID_SIZE, y * GRID_SIZE);
    }
    ctx.stroke();
};

// --- Shared Occupant Dot Renderer ---
const GROUP_DOT_BORDER = '#22c55e';

const drawOccupantDot = (
    rCtx: RenderContext,
    orbX: number, orbY: number,
    color: string, alpha: number,
    name?: string,
    radius = GRID_SIZE * 0.09,
    anim?: import('../occupantAnimStore').OccupantAnimEntry,
    isTarget = false, isActive = false, isCombatant = false, isGroupMember = false,
    isHeldActive = false,
) => {
    const { ctx, now, camera, triggerRender } = rCtx;
    const targetColor = rCtx.targetColor || '#facc15';
    const initial = getOccupantInitial(name);
    let extraGlow = 0;
    const combatPulse = (Math.sin(now / 240) + 1) / 2;

    if (anim && anim.type === 'tap') {
        const t = Math.min((now - anim.startTime) / 250, 1.0);
        const pop = Math.sin(t * Math.PI);
        extraGlow = pop * radius * 1.2;
        if (t < 1.0) triggerRender?.();
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Soft-cornered square body
    const size = radius * 2;
    const corner = Math.max(1.5, radius * 0.35);
    ctx.fillStyle = 'rgba(15, 15, 15, 0.95)';
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(4, 10 / camera.zoom) + extraGlow;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(orbX - radius, orbY - radius, size, size, corner);
    } else {
        ctx.rect(orbX - radius, orbY - radius, size, size);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Border
    const borderColor = isCombatant ? '#ef4444' : isTarget ? targetColor : isGroupMember ? GROUP_DOT_BORDER : (isHeldActive || isActive) ? color : 'rgba(255, 255, 255, 0.2)';
    ctx.globalAlpha = isCombatant ? alpha : isTarget ? alpha : isHeldActive ? alpha * 0.7 : isActive ? alpha * 0.55 : alpha;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isCombatant ? Math.max(1.1, 1.7 / camera.zoom) : isTarget ? Math.max(0.8, 1.2 / camera.zoom) : isGroupMember ? Math.max(0.55, 0.9 / camera.zoom) : (isHeldActive || isActive) ? Math.max(0.55, 0.9 / camera.zoom) : 0.5;
    ctx.shadowBlur = isCombatant ? (radius * (1.05 + combatPulse * 0.7)) + extraGlow : isTarget ? (radius * 0.8) + extraGlow : isGroupMember ? 3 : isHeldActive ? (radius * 0.6) + extraGlow : isActive ? (radius * 0.45) + extraGlow : 0;
    ctx.shadowColor = borderColor;
    ctx.stroke();
    ctx.restore();

    // 3. Layered bloom initial
    if (initial) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${radius * 1.4}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.max(2.5, 6 / camera.zoom);
        ctx.fillText(initial, orbX, orbY);
        ctx.shadowBlur = Math.max(5, 14 / camera.zoom);
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillText(initial, orbX, orbY);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 0;
        ctx.fillText(initial, orbX, orbY);
        ctx.restore();
    }
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
    const { ctx, currentZ, now, roomChars, roomPlayers, roomNpcs, roomItems, groupMembers, camera, playerColor, npcColor, enemyColor, neutralColor, objectColor, opponentId, opponentName, triggerRender } = rCtx;

    // Resolve through live rooms, server-id mappings, and preloaded rooms so the
    // current-room dots survive when the player position ref has not caught up.
    const anchor = resolveActiveRoomAnchor(rCtx, playerPosRef);
    if (!anchor || Math.abs(anchor.z - currentZ) >= 1.0) return;

    const px = anchor.x * GRID_SIZE + GRID_SIZE / 2;
    const py = anchor.y * GRID_SIZE + GRID_SIZE / 2;
    const roomCharsWithGroupFallbacks = addMissingCurrentRoomGroupMembers(roomChars, groupMembers, rCtx);

    const occupantTargets = getMapOccupantTargets({
        anchor,
        cameraZoom: camera.zoom,
        roomChars: roomCharsWithGroupFallbacks,
        roomPlayers,
        roomNpcs,
        groupMembers,
        characterName,
        inlineCategories: rCtx.inlineCategories,
        playerColor: playerColor || 'rgba(125, 211, 252, 1)',
        npcColor: npcColor || COLOR_NPC,
        enemyColor: enemyColor || '#ef4444',
        neutralColor: neutralColor || '#eab308'
    });

    const otherOccupants = occupantTargets.filter(target => target.ring === 'outer');
    const groupOccupants = occupantTargets.filter(target => target.ring === 'inner');
    const allOccupants = [...otherOccupants, ...groupOccupants];

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
    const activeEntityIds = new Set(rCtx.selectedObjectIds || []);
    if (rCtx.activeInlineEntityId) activeEntityIds.add(rCtx.activeInlineEntityId);

    const isOccupantActive = (occ: (typeof occupantTargets)[number]) => {
        const ids = [
            occ.id !== undefined ? String(occ.id) : '',
            occ.id !== undefined ? `roomchars:${occ.id}` : '',
            `map-${occ.kind}:${occ.name.toLowerCase()}`
        ].filter(Boolean);
        return ids.some(id => isObjectSelected(activeEntityIds, id, occ.category));
    };

    const isHeldActive = !!(rCtx.heldButton && !rCtx.heldButton.didFire && !rCtx.heldButton.id?.startsWith('log-inline-'));

    const combatantIds = new Set<string>();
    allOccupants.forEach(occ => {
        if (occ.id == null || occ.fighting == null || occ.fighting === 'Someone') return;
        if (occ.fighting === 'you' && !rCtx.inCombat) return;
        combatantIds.add(String(occ.id));
        if (occ.fighting !== 'you') combatantIds.add(String(occ.fighting));
    });

    const drawCombatTether = (fromX: number, fromY: number, toX: number, toY: number, alpha = 1, includePulses = false) => {
        const zoom = camera.zoom || 1;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.hypot(dx, dy);
        if (len < 1) return;
        const ux = dx / len;
        const uy = dy / len;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineCap = 'round';

        ctx.shadowBlur = 10 / zoom;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.strokeStyle = 'rgba(127, 29, 29, 0.92)';
        ctx.lineWidth = Math.max(1.1, 2.1 / zoomFactor);
        ctx.setLineDash([Math.max(2, 4 / zoom), Math.max(2, 5 / zoom)]);
        ctx.lineDashOffset = -now / 70;
        ctx.stroke();
        ctx.restore();

        if (!includePulses || !rCtx.combatPulsesRef?.current.length) return;

        const pulseDuration = 340;
        const pulses = rCtx.combatPulsesRef.current.filter(pulse => now - pulse.time < pulseDuration);
        if (pulses.length !== rCtx.combatPulsesRef.current.length) {
            rCtx.combatPulsesRef.current = pulses;
        }

        pulses.forEach(pulse => {
            const progress = Math.max(0, Math.min(1, (now - pulse.time) / pulseDuration));
            const directedProgress = pulse.direction === 'outgoing' ? progress : 1 - progress;
            const pulseLen = Math.min(len * 0.45, Math.max(8 / zoom, 14));
            const centerX = fromX + dx * directedProgress;
            const centerY = fromY + dy * directedProgress;
            const tailX = centerX - ux * pulseLen * 0.5;
            const tailY = centerY - uy * pulseLen * 0.5;
            const headX = centerX + ux * pulseLen * 0.5;
            const headY = centerY + uy * pulseLen * 0.5;
            const color = pulse.direction === 'outgoing' ? 'rgba(34, 211, 238, 0.95)' : 'rgba(248, 113, 113, 0.95)';

            ctx.save();
            ctx.globalAlpha = alpha * Math.sin(progress * Math.PI);
            ctx.lineCap = 'round';
            ctx.shadowBlur = 12 / zoom;
            ctx.shadowColor = pulse.direction === 'outgoing' ? '#22d3ee' : '#ef4444';
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1.6, 3.2 / zoomFactor);
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(headX, headY);
            ctx.stroke();
            ctx.restore();
        });
    };

    const drawDot = (orbX: number, orbY: number, color: string, alpha: number, name?: string, radius = GRID_SIZE * 0.09, anim?: import('../occupantAnimStore').OccupantAnimEntry, isTarget = false, isActive = false, isCombatant = false, isGroupMember = false) => {
        drawOccupantDot(rCtx, orbX, orbY, color, alpha, name, radius, anim, isTarget, isActive, isCombatant, isGroupMember, isHeldActive);
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

            const isOpponent = !!rCtx.inCombat && isOpponentOccupant(occ, allOccupants, opponentId, opponentName);
            const isCombatant = isOpponent || (occ.id != null && combatantIds.has(String(occ.id)));
            const isGroupOcc = occ.ring === 'inner';
            drawDot(orbX, orbY, occ.color, alpha, occ.name, occ.radius, anim, isOpponent, isOccupantActive(occ), isCombatant, isGroupOcc);

            // Opponent tether. Name fallback is allowed only when it resolves to
            // exactly one visible occupant; duplicate names require GMCP ID.
            if (isOpponent) {
                drawCombatTether(px, py, orbX, orbY, alpha, true);
            }
        });
    };

    // 4. Draw Rings
    drawRing(otherOccupants);
    drawRing(groupOccupants);

    // 4.1 Draw NPC-vs-NPC combat tethers using GMCP fighting IDs
    const drawnPairs = new Set<string>();
    allOccupants.forEach(occ => {
        if (occ.fighting == null || occ.fighting === 'you' || occ.fighting === 'Someone') return;
        if (occ.id == null) return;
        const target = allOccupants.find(t => t.id != null && String(t.id) === String(occ.fighting));
        if (!target) return;
        const pairKey = [String(occ.id), String(target.id)].sort().join('-');
        if (drawnPairs.has(pairKey)) return;
        drawnPairs.add(pairKey);
        drawCombatTether(occ.x, occ.y, target.x, target.y, 0.78);
    });

    // 4.5 Draw room items as squares in a line at the bottom
    if (roomItems && roomItems.length > 0) {
        const itemSize = 4 / camera.zoom;
        const itemGap = 2 / camera.zoom;
        const totalWidth = roomItems.length * (itemSize + itemGap) - itemGap;
        let startX = px - totalWidth / 2;
        const itemY = py + (GRID_SIZE / 2) - 2;

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
        drawDot(orbX, orbY, color, alpha, anim.name, undefined, anim);
        triggerRender?.();
    }
};

export const drawEntities = (
    rCtx: RenderContext,
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>,
    characterName: string | null
) => {
    const { ctx, currentZ, activeId, allRooms, preloaded, now, triggerRender } = rCtx;
    
    const anchor = resolveActiveRoomAnchor(rCtx, playerPosRef);
    const trail = playerTrailRef.current;

    // 1. Player Trail — teardrop streak that retracts tail-first toward the player
    const TRAIL_DURATION = 450; // ms, must match useMapAnimation
    const wallNow = now;
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
            ctx.fillStyle = '#fab387';

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

        // 1. Current Room Highlight
        ctx.save();

        const breath = (Math.sin(now / 350) + 1) / 2; // Breathing pulse

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = alpha * (0.45 + breath * 0.5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = Math.max(0.8, 1.5 / rCtx.camera.zoom);
        
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = (4 + breath * 8) / rCtx.camera.zoom;

        const inset = 1;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(px - GRID_SIZE/2 + inset, py - GRID_SIZE/2 + inset, GRID_SIZE - inset*2, GRID_SIZE - inset*2, 4);
        } else {
            ctx.rect(px - GRID_SIZE/2 + inset, py - GRID_SIZE/2 + inset, GRID_SIZE - inset*2, GRID_SIZE - inset*2);
        }
        ctx.stroke();
        ctx.restore();

        // 3. Client-side movement predictions (Target Room Glow)
        const predictions = rCtx.clientPredictionsRef?.current;
        if (predictions && predictions.length > 0) {
            for (let i = 0; i < predictions.length; i++) {
                const pred = predictions[i];
                if (Math.abs(pred.toZ - currentZ) >= 1.0) continue;
                const toX = pred.toX * GRID_SIZE + GRID_SIZE / 2;
                const toY = pred.toY * GRID_SIZE + GRID_SIZE / 2;
                const alpha = Math.max(0.25, 0.85 - i * 0.18);

                // 1. Target Room Glow (White highlight)
                ctx.save();
                ctx.globalAlpha = alpha * 0.45;
                ctx.shadowBlur = 20 * (rCtx.camera.zoom > 1 ? 1 : rCtx.camera.zoom);
                ctx.shadowColor = '#ffffff';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                
                // Draw a slightly inset rectangle for the room glow
                const inset = 1;
                ctx.beginPath();
                if (typeof (ctx as any).roundRect === 'function') {
                    (ctx as any).roundRect(toX - GRID_SIZE/2 + inset, toY - GRID_SIZE/2 + inset, GRID_SIZE - inset*2, GRID_SIZE - inset*2, 4);
                } else {
                    ctx.rect(toX - GRID_SIZE/2 + inset, toY - GRID_SIZE/2 + inset, GRID_SIZE - inset*2, GRID_SIZE - inset*2);
                }
                ctx.fill();
                ctx.restore();
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
    const { ctx, currentZ, allRooms, preloaded, now, groupMembers, camera, serverIdIndexRef, playerColor } = rCtx;
    const MEMBER_COLOR = playerColor || '#89CFF0';
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
        const memberName = getGroupMemberDisplayName(member);
        const memberKey = String(member.id ?? memberName ?? member.mapid);
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
        const memberName = getGroupMemberDisplayName(member);
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

        // Skip — drawRoomOccupants handles group members in the player's current room
        if (prx !== undefined && rx === prx && ry === pry && rz === prz) return;

        // --- Calculate Petal Offset ---
        const index = occupants.indexOf(memberKey);
        const count = occupants.length;
        let offsetX = 0, offsetY = 0;
        const zoomFactor = (camera.zoom > 1.5 ? 1 : Math.sqrt(camera.zoom));
        const PETAL_RADIUS = 9.0 / zoomFactor;
        const angle = (index / count) * Math.PI * 2;
        const cx = Math.cos(angle);
        const cy = Math.sin(angle);
        const maxComp = Math.max(Math.abs(cx), Math.abs(cy)) || 1;
        offsetX = (cx / maxComp) * PETAL_RADIUS;
        offsetY = (cy / maxComp) * PETAL_RADIUS;

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
                if (memberName) ctx.fillText(memberName, 0, 18);
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

        const anim = occupantAnims.get(memberKey);
        const isTarget = isOpponentOccupant(member, groupMembers, rCtx.opponentId, rCtx.opponentName);
        const isHeldActive = !!(rCtx.heldButton && !rCtx.heldButton.didFire && !rCtx.heldButton.id?.startsWith('log-inline-'));

        drawOccupantDot(rCtx, px, py, MEMBER_COLOR, alpha * 0.92, memberName, ORB_RADIUS, anim, isTarget, false, false, true, isHeldActive);

        const isSameRoom = prx !== undefined && prx === rx && pry === ry && prz === rz;
        if (!isSameRoom) {
            ctx.save();
            ctx.font = `bold ${8 / camera.zoom}px Inter`;
            ctx.fillStyle = MEMBER_COLOR;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'black';
            if (memberName) ctx.fillText(memberName, px, py - (ORB_RADIUS + 2) / camera.zoom);
            ctx.restore();
        }

    });
};


export const drawMarkers = (
    rCtx: RenderContext,
    stableMarkersRef: React.MutableRefObject<Record<string, any>>,
    selectedMarkerId: string | null,
    vX1: number, vY1: number, vX2: number, vY2: number
) => {
    const { ctx, now, ANIM_DUR, currentZ, unveilMap, exploredMarkers, invZoom } = rCtx;

    if (invZoom > 3) return; // too zoomed out — skip markers

    const allMarkers = Object.values(stableMarkersRef.current);

    allMarkers.forEach((marker: any) => {
        const mx = marker.x * GRID_SIZE, my = marker.y * GRID_SIZE;
        if (mx < vX1 - GRID_SIZE || mx > vX2 + GRID_SIZE || my < vY1 - GRID_SIZE || my > vY2 + GRID_SIZE || (marker.z || 0) !== currentZ) return;

        // FOW Check: Hide markers unless unveiled or the marker has been discovered (exploredMarkers)
        if (!unveilMap && !exploredMarkers.has(marker.id)) return;

        const isSelected = selectedMarkerId === marker.id;
        // Scale dot/text inversely with zoom so they remain readable at any zoom level.
        // Clamp invZoom so things don't get absurdly huge when zoomed way in.
        const sizeScale = Math.min(invZoom, 4);
        const dotSize = (marker.dotSize || 8) * sizeScale;
        const mSeed = marker.x * 1.5 + marker.y * 2.5;
        const mP = Math.min(1, (now - (marker.createdAt || 0)) / ANIM_DUR);
        
        ctx.save();
        ctx.globalAlpha = 0.5;
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

        ctx.fillStyle = isSelected ? '#ef4444' : 'rgba(15, 15, 15, 1.0)'; 
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
            const fontSize = (marker.fontSize || 10) * sizeScale;
            ctx.font = `${fontSize}px Aniron, "Cinzel", serif`;
            const labelY = my - dotSize - 4 * sizeScale;

            const metrics = ctx.measureText(marker.text);
            const textWidth = metrics.width;
            const textHeight = fontSize;

            // Draw diffuse background glow - Rectangular with soft edges
            const paddingX = 16 * sizeScale;
            const paddingY = 6 * sizeScale;
            const rectW = textWidth + paddingX * 2;
            const rectH = textHeight + paddingY * 2;
            const rectX = mx - rectW / 2;
            const rectY = labelY - textHeight - paddingY;

            ctx.save();
            ctx.globalAlpha = 1.0;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10 * sizeScale;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';

            const r = 4 * sizeScale;
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

            ctx.globalAlpha = 1.0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
            ctx.shadowBlur = Math.max(3, 6 * sizeScale);
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(marker.text, mx, labelY);

            ctx.shadowColor = 'rgba(255, 204, 0, 0.65)';
            ctx.shadowBlur = Math.max(4, 8 * sizeScale);
            ctx.fillStyle = 'rgba(255, 204, 0, 0.92)';
            ctx.fillText(marker.text, mx, labelY);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffcc00';
            ctx.fillText(marker.text, mx, labelY);
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

export const drawDoorHighlights = (
    rCtx: RenderContext,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>
) => {
    if (!rCtx.heldButton || rCtx.heldButton.didFire || rCtx.heldButton.id?.startsWith('log-inline-')) return;

    const { ctx, activeId, allRooms, preloaded, camera, currentZ, triggerRender } = rCtx;

    const anchor = resolveActiveRoomAnchor(rCtx, playerPosRef);
    if (!anchor || Math.abs(anchor.z - currentZ) >= 1.0) return;

    const room = activeId ? (allRooms[activeId] || allRooms[`m_${activeId}`]) : null;
    if (!room) return;

    const rawId = activeId ? (activeId.startsWith('m_') ? activeId.substring(2) : activeId) : '';
    const s = GRID_SIZE;
    const wx = Math.round(anchor.x) * s;
    const wy = Math.round(anchor.y) * s;
    const cOff = 12;
    // vPad: half-width of border rect perpendicular to the wall (encompasses the 4px bar + gap)
    const vPad = 4.5;
    // hPad: extra padding along the wall beyond the bar's 25%/75% endpoints
    const hPad = 2;
    const corner = Math.max(2, 4 / camera.zoom);
    const DOOR_COLOR = '#ffcc00';

    // [dir, rectX, rectY, rectW, rectH] in world space — each rect wraps around the door bar
    const doorRects: [string, number, number, number, number][] = [
        ['n', wx + s * 0.25 - hPad,  wy - vPad,               s * 0.5 + hPad * 2, vPad * 2],
        ['s', wx + s * 0.25 - hPad,  wy + s - vPad,           s * 0.5 + hPad * 2, vPad * 2],
        ['e', wx + s - vPad,         wy + s * 0.25 - hPad,    vPad * 2, s * 0.5 + hPad * 2],
        ['w', wx - vPad,             wy + s * 0.25 - hPad,    vPad * 2, s * 0.5 + hPad * 2],
        ['u', wx + s / 2 - cOff - vPad, wy + s / 2 - cOff - vPad, vPad * 2, vPad * 2],
        ['d', wx + s / 2 + cOff - vPad, wy + s / 2 + cOff - vPad, vPad * 2, vPad * 2],
    ];

    for (const [dir, rx, ry, rw, rh] of doorRects) {
        const wEx = preloaded[rawId]?.[4]?.[dir];
        const { hasDoor } = getGateState(room, wEx, dir, allRooms, preloaded);
        if (!hasDoor) continue;

        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = DOOR_COLOR;
        ctx.lineWidth = Math.max(0.6, 1.0 / camera.zoom);
        ctx.shadowBlur = vPad * 1.2;
        ctx.shadowColor = DOOR_COLOR;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
            (ctx as any).roundRect(rx, ry, rw, rh, corner);
        } else {
            ctx.rect(rx, ry, rw, rh);
        }
        ctx.stroke();
        ctx.restore();
    }

    triggerRender?.();
};

export const drawMarquee = (rCtx: RenderContext, marquee: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => {
    const { ctx, dpr } = rCtx;
    if (marquee && marquee.start && marquee.end) {
        const x1 = marquee.start.x / dpr, y1 = marquee.start.y / dpr, x2 = marquee.end.x / dpr, y2 = marquee.end.y / dpr;
        ctx.save(); ctx.scale(dpr, dpr); ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1); ctx.restore();
    }
};

export const drawFilterHighlights = (
    rCtx: RenderContext,
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>
) => {
    const { ctx, activeMapFilter, matchedRoomIds, closestRoomId, allRooms, preloaded, currentZ, now, filterPathIds, filterPathDistance } = rCtx;
    if (!activeMapFilter || !matchedRoomIds || matchedRoomIds.size === 0) return;

    const getFilterColors = (filter: string): { stroke: string, shadow: string } => {
        switch (filter) {
            case 'herb': return { stroke: 'rgba(46, 204, 113, 0.85)', shadow: '#2ecc71' };
            case 'stable': return { stroke: 'rgba(230, 126, 34, 0.85)', shadow: '#e67e22' };
            case 'quest': return { stroke: 'rgba(52, 152, 219, 0.85)', shadow: '#3498db' };
            case 'shop': return { stroke: 'rgba(241, 196, 15, 0.85)', shadow: '#f1c40f' };
            case 'guild': return { stroke: 'rgba(155, 89, 182, 0.85)', shadow: '#9b59b6' };
            case 'inn': return { stroke: 'rgba(255, 105, 180, 0.85)', shadow: '#ff69b4' };
            case 'danger': return { stroke: 'rgba(231, 76, 60, 0.85)', shadow: '#e74c3c' };
            case 'water': return { stroke: 'rgba(41, 128, 185, 0.85)', shadow: '#2980b9' };
            default: return { stroke: 'rgba(255, 255, 255, 0.85)', shadow: '#ffffff' };
        }
    };

    const getRoomCoords = (rid: string): { x: number, y: number, z: number } | null => {
        const local = allRooms[rid];
        if (local) {
            return { x: local.x, y: local.y, z: local.z || 0 };
        }
        const rawId = rid.startsWith('m_') ? rid.substring(2) : rid;
        const pData = preloaded[rawId];
        if (pData) {
            return { x: pData[0], y: pData[1], z: pData[2] || 0 };
        }
        return null;
    };

    const colors = getFilterColors(activeMapFilter);

    const getRoomCenter = (rid: string) => {
        const coords = getRoomCoords(rid);
        if (!coords || Math.abs(coords.z - currentZ) >= 0.5) return null;
        return {
            x: coords.x * GRID_SIZE + GRID_SIZE / 2,
            y: coords.y * GRID_SIZE + GRID_SIZE / 2
        };
    };

    const visiblePadding = GRID_SIZE * 2;
    const visibleWorldWidth = rCtx.canvasWidth / (rCtx.dpr * rCtx.camera.zoom);
    const visibleWorldHeight = rCtx.canvasHeight / (rCtx.dpr * rCtx.camera.zoom);
    const visibleBounds = {
        left: rCtx.camera.x - visiblePadding,
        top: rCtx.camera.y - visiblePadding,
        right: rCtx.camera.x + visibleWorldWidth + visiblePadding,
        bottom: rCtx.camera.y + visibleWorldHeight + visiblePadding
    };
    const isVisiblePoint = (x: number, y: number) =>
        x >= visibleBounds.left && x <= visibleBounds.right && y >= visibleBounds.top && y <= visibleBounds.bottom;

    // 0. Draw the active filter route from current room to nearest matching flag.
    if (filterPathIds && filterPathIds.length > 1) {
        const pathPoints = filterPathIds
            .map(getRoomCenter)
            .filter((point): point is { x: number, y: number } => point !== null);

        if (pathPoints.length > 1) {
            const flow = (now % 900) / 900;
            const dashLength = 8;
            const gapLength = 7;

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 16;
            ctx.shadowColor = colors.shadow;
            ctx.strokeStyle = 'rgba(5, 8, 12, 0.76)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            pathPoints.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors.shadow;
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 4;
            ctx.setLineDash([dashLength, gapLength]);
            ctx.lineDashOffset = -flow * (dashLength + gapLength);
            ctx.beginPath();
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            pathPoints.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
            ctx.stroke();
            ctx.restore();

            pathPoints.forEach((point, index) => {
                if (index === 0) return;
                const isDestination = index === pathPoints.length - 1;
                ctx.save();
                ctx.fillStyle = isDestination ? '#ffffff' : colors.shadow;
                ctx.strokeStyle = isDestination ? colors.stroke : 'rgba(5, 8, 12, 0.72)';
                ctx.lineWidth = isDestination ? 2.4 : 1.6;
                ctx.shadowBlur = isDestination ? 14 : 7;
                ctx.shadowColor = colors.shadow;
                ctx.beginPath();
                ctx.arc(point.x, point.y, isDestination ? 6 : 3.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });

            const labelPoint = pathPoints[Math.max(0, Math.floor(pathPoints.length / 2) - 1)];
            const roomsAway = filterPathDistance || Math.max(0, filterPathIds.length - 1);
            const label = `${roomsAway} ${roomsAway === 1 ? 'room' : 'rooms'}`;

            ctx.save();
            ctx.font = `bold ${Math.max(11, 13 / rCtx.camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const metrics = ctx.measureText(label);
            const padX = 7 / rCtx.camera.zoom;
            const padY = 4 / rCtx.camera.zoom;
            const labelWidth = metrics.width + padX * 2;
            const labelHeight = 18 / rCtx.camera.zoom;
            const labelX = labelPoint.x;
            const labelY = labelPoint.y - GRID_SIZE * 0.42;

            ctx.fillStyle = 'rgba(9, 12, 18, 0.78)';
            ctx.strokeStyle = colors.stroke;
            ctx.lineWidth = 1.2 / rCtx.camera.zoom;
            ctx.beginPath();
            ctx.roundRect(labelX - labelWidth / 2, labelY - labelHeight / 2, labelWidth, labelHeight, 5 / rCtx.camera.zoom);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, labelX, labelY + padY * 0.1);
            ctx.restore();
        }
    }

    // 1. Draw pulsing glowing circles around all matched rooms on current floor
    matchedRoomIds.forEach(rid => {
        const coords = getRoomCoords(rid);
        if (!coords || Math.abs(coords.z - currentZ) >= 0.5) return;

        const cx = coords.x * GRID_SIZE + GRID_SIZE / 2;
        const cy = coords.y * GRID_SIZE + GRID_SIZE / 2;
        if (!isVisiblePoint(cx, cy)) return;

        const phaseSeed = rid.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const pulse = (Math.sin((now + phaseSeed * 23) / 360) + 1) / 2;
        const radius = GRID_SIZE * (0.42 + pulse * 0.1);
        const alpha = 0.55 + pulse * 0.35;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 7 + pulse * 12;
        ctx.shadowColor = colors.shadow;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 + pulse * 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });

    // 2. Draw pulsing sonar beacon for the closest room
    if (closestRoomId) {
        const closestCoords = getRoomCoords(closestRoomId);
        if (closestCoords && Math.abs(closestCoords.z - currentZ) < 0.5) {
            const cx = closestCoords.x * GRID_SIZE + GRID_SIZE / 2;
            const cy = closestCoords.y * GRID_SIZE + GRID_SIZE / 2;

            const pulsePeriod = 1200;
            const progress1 = (now % pulsePeriod) / pulsePeriod;
            const progress2 = ((now + pulsePeriod / 2) % pulsePeriod) / pulsePeriod;

            const minRadius = GRID_SIZE * 0.45;
            const maxRadius = GRID_SIZE * 1.5;

            const drawWave = (progress: number) => {
                const radius = minRadius + (maxRadius - minRadius) * progress;
                const alpha = 1.0 - progress;

                ctx.save();
                ctx.strokeStyle = colors.stroke.replace('0.85', String(alpha * 0.9));
                ctx.lineWidth = 3;
                ctx.shadowBlur = 12;
                ctx.shadowColor = colors.shadow;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            };

            drawWave(progress1);
            drawWave(progress2);

            // 3. Draw a dotted connector path from player's room to the closest room (only if on same floor)
            const playerCoords = playerPosRef.current || resolveActiveRoomAnchor(rCtx, playerPosRef);
            if (playerCoords && Math.abs(playerCoords.z - currentZ) < 0.5) {
                const px = playerCoords.x * GRID_SIZE + GRID_SIZE / 2;
                const py = playerCoords.y * GRID_SIZE + GRID_SIZE / 2;

                ctx.save();
                ctx.strokeStyle = colors.stroke;
                ctx.lineWidth = 1.8;
                ctx.setLineDash([4, 4]);
                ctx.shadowBlur = 4;
                ctx.shadowColor = colors.shadow;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(cx, cy);
                ctx.stroke();
                ctx.restore();
            }
        }
    }
};
