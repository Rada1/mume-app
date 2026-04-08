/**
 * @file MiniMapRoom.tsx
 * @description A high-fidelity "Camera" mirror of the player room, sharing 1:1 logic with the main map.
 */

import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useBaseGame, useGame, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { getTerrainColor, WALL_COLOR, getGateState, GRID_SIZE } from '../Mapper/mapperUtils';
import { drawTerrainIcon, applyRoomShading } from '../Mapper/renderers/drawTerrains';
import { drawRoomFlagsOptimized } from '../Mapper/renderers/drawFeatures';
import { drawEntities, drawGroupMembers } from '../Mapper/renderers/drawEntities';
import { RenderContext } from '../Mapper/renderers/rendererUtils';
import './MiniMapRoom.css';

export const MiniMapRoom: React.FC = () => {
    const { roomPlayers, roomNpcs, roomItems, theme, groupMembers, characterName } = useBaseGame();
    const { triggerHaptic, setPopoverState, opponentId, opponentName } = useGame();
    const mapper = useMapper();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const processedIconsRef = useRef<Record<string, HTMLCanvasElement>>({});
    
    // Camera Animation State
    const cameraRef = useRef({ x: 0, y: 0 });
    const targetRef = useRef({ x: 0, y: 0 });
    const lastFrameTimeRef = useRef(performance.now());
    const requestRef = useRef<number | null>(null);
    const trailRef = useRef<any[]>([]); // Empty trail for mini-map

    const isDarkMode = theme === 'dark';

    const currentRoom = useMemo(() => {
        if (!mapper?.currentRoomId) return null;
        const rid = mapper.currentRoomId;
        const mRid = rid.startsWith('m_') ? rid : `m_${rid}`;
        
        let room = mapper.rooms[rid] || mapper.rooms[mRid];
        if (!room) {
            const rawId = rid.replace(/^m_/, '');
            const pData = mapper.preloadedCoordsRef.current[rawId];
            if (pData) {
                room = {
                    id: mRid,
                    vnum: rawId,
                    name: pData[5] || 'Unknown',
                    terrain: pData[3] || 'Field',
                    exits: pData[4] || {},
                    x: pData[0],
                    y: pData[1],
                    z: pData[2] || 0,
                    light: pData[10],
                    sundeath: pData[11]
                } as any;
            }
        }
        return room;
    }, [mapper?.currentRoomId, mapper?.rooms, mapper?.preloadedCoordsRef]);

    // Track neighbors for "neighborhood" rendering
    const visibleRooms = useMemo(() => {
        if (!currentRoom) return [];
        const result = [currentRoom];
        if (currentRoom.exits) {
            for (const dir in currentRoom.exits) {
                const ex = currentRoom.exits[dir];
                const targetId = typeof ex === 'object' ? ex.target : ex;
                if (targetId) {
                    const rid = String(targetId);
                    const mRid = rid.startsWith('m_') ? rid : `m_${rid}`;
                    let neighbor = mapper.rooms[rid] || mapper.rooms[mRid];
                    if (!neighbor) {
                        const rawId = rid.replace(/^m_/, '');
                        const p = mapper.preloadedCoordsRef.current[rawId];
                        if (p) {
                            neighbor = { id: mRid, vnum: rawId, terrain: p[3], exits: p[4], x: p[0], y: p[1], z: p[2] || 0 } as any;
                        }
                    }
                    if (neighbor) result.push(neighbor);
                }
            }
        }
        return result;
    }, [currentRoom, mapper.rooms, mapper.preloadedCoordsRef]);

    // Update target camera position when room changes
    useEffect(() => {
        if (currentRoom) {
            targetRef.current = { x: currentRoom.x, y: currentRoom.y };
            // Snap if first time or very far
            if (cameraRef.current.x === 0 && cameraRef.current.y === 0) {
                cameraRef.current = { ...targetRef.current };
            }
        }
    }, [currentRoom?.id]);

    const handleInteraction = useCallback((e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas || !currentRoom) return;
        const rect = canvas.getBoundingClientRect();
        const size = 120;
        const clientX = (e.clientX - rect.left) * (size / rect.width);
        const clientY = (e.clientY - rect.top) * (size / rect.height);
        const center = size / 2, s = 80, hitZone = 15;
        let dir: string | null = null;
        if (clientY < center - s/2 + hitZone && clientX > center - s/2 + 10 && clientX < center + s/2 - 10) dir = 'n';
        else if (clientY > center + s/2 - hitZone && clientX > center - s/2 + 10 && clientX < center + s/2 - 10) dir = 's';
        else if (clientX < center - s/2 + hitZone && clientY > center - s/2 + 10 && clientY < center + s/2 - 10) dir = 'w';
        else if (clientX > center + s/2 - hitZone && clientY > center - s/2 + 10 && clientY < center + s/2 - 10) dir = 'e';

        if (dir && currentRoom.exits?.[dir]) {
            const exit = currentRoom.exits[dir];
            triggerHaptic?.(40);
            const doorName = (typeof exit === 'object' && exit !== null) 
                ? ((exit as any).doorName || (exit as any).keyword || dir)
                : dir;
            setPopoverState({ type: 'menu', setId: 'doors', context: doorName, entityId: `door-${dir}-${currentRoom.id}`, x: e.clientX, y: e.clientY, accentColor: '#ffcc00' });
        }
    }, [currentRoom, triggerHaptic, setPopoverState]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !currentRoom) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const nowTs = performance.now();
        const deltaTime = nowTs - lastFrameTimeRef.current;
        lastFrameTimeRef.current = nowTs;

        // Smooth camera lerp
        const frameScale = Math.min(2, deltaTime / 16.67);
        const camLerp = 1 - Math.pow(0.85, frameScale);
        cameraRef.current.x += (targetRef.current.x - cameraRef.current.x) * camLerp;
        cameraRef.current.y += (targetRef.current.y - cameraRef.current.y) * camLerp;

        const dpr = window.devicePixelRatio || 1;
        const size = 120;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, size, size);

        const zoom = 2.2;
        const center = size / 2;
        const gridS = GRID_SIZE;

        // --- GLOBAL CAMERA TRANSFORM ---
        // Exactly matches the main renderer.ts logic
        const rCtx: RenderContext = {
            ctx,
            dpr: 1,
            canvasWidth: size,
            canvasHeight: size,
            camera: { x: cameraRef.current.x * gridS + gridS/2 - (center / zoom), y: cameraRef.current.y * gridS + gridS/2 - (center / zoom), zoom },
            isDarkMode,
            isMobile: false,
            imagesRef,
            processedIconsRef,
            now: Date.now(),
            ANIM_DUR: 450,
            invZoom: 1/zoom,
            currentZ: currentRoom.z || 0,
            explored: new Set(),
            exploredMarkers: new Set(),
            unveilMap: true,
            allRooms: mapper.rooms,
            roomAtCoord: {},
            visitedAtCoord: {},
            roomNpcs,
            roomPlayers,
            roomItems,
            centerOverride: { x: currentRoom.x, y: currentRoom.y, z: currentRoom.z || 0 },
            groupMembers,
            opponentId,
            opponentName,
            preloaded: mapper.preloadedCoordsRef.current,
            firstExploredAtRef: { current: {} } as any,
            selectedRoomIds: new Set(),
            activeId: currentRoom.id,
            baseMapExitsRef: mapper.baseMapExitsRef,
            clientPredictionsRef: mapper.clientPredictionsRef,
            serverIdIndexRef: mapper.serverIdIndexRef,
            triggerRender: () => {}
        };

        ctx.save();
        ctx.translate(center, center);
        ctx.scale(zoom, zoom);
        // Position origin at camera center
        ctx.translate(-(cameraRef.current.x * gridS + gridS/2), -(cameraRef.current.y * gridS + gridS/2));

        // 1. Draw Neighborhood Rooms
        visibleRooms.forEach(room => {
            const rx = room.x * gridS;
            const ry = room.y * gridS;

            ctx.save();
            ctx.translate(rx, ry);

            const color = getTerrainColor(room.terrain, isDarkMode);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(0, 0, gridS, gridS);

            applyRoomShading(ctx, { ...room, x: 0, y: 0 }, gridS, 1.0, rCtx);

            ctx.globalAlpha = 1.0;
            const gridX = Math.round(room.x), gridY = Math.round(room.y);
            const variant = Math.floor((Math.abs(Math.sin(gridX * 12.9898 + gridY * 78.233) * 43758.5453) % 1) * 6);
            drawTerrainIcon(ctx, 0, 0, gridS, room.terrain, isDarkMode, processedIconsRef, imagesRef, variant);

            if (room.exits) {
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                const borders: Record<string, { x1: number, y1: number, x2: number, y2: number }> = {
                    n: { x1: 0, y1: 0, x2: gridS, y2: 0 },
                    s: { x1: 0, y1: gridS, x2: gridS, y2: gridS },
                    e: { x1: gridS, y1: 0, x2: gridS, y2: gridS },
                    w: { x1: 0, y1: 0, x2: 0, y2: gridS }
                };
                for (const [dir, p] of Object.entries(borders)) {
                    const roomVnumForIndex = room.id.replace(/^m_/, '');
                    const wEx = mapper.preloadedCoordsRef.current[roomVnumForIndex]?.[4]?.[dir] || room.exits[dir];
                    const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, dir, mapper.rooms, mapper.preloadedCoordsRef.current);
                    if (!hasExit) {
                        ctx.strokeStyle = WALL_COLOR;
                        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
                    } else if (hasDoor) {
                        const ddx = p.x2 - p.x1, ddy = p.y2 - p.y1;
                        ctx.strokeStyle = WALL_COLOR; ctx.lineWidth = 4.0;
                        ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x1 + ddx * 0.25, p.y1 + ddy * 0.25); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(p.x2, p.y2); ctx.lineTo(p.x2 - ddx * 0.25, p.y2 - ddy * 0.25); ctx.stroke();
                        if (isClosed) {
                            ctx.strokeStyle = "#ffcc00"; ctx.lineWidth = 5.0;
                            ctx.beginPath(); ctx.moveTo(p.x1 + ddx * 0.25, p.y1 + ddy * 0.25); ctx.lineTo(p.x2 - ddx * 0.25, p.y2 - ddy * 0.25); ctx.stroke();
                        }
                    } else {
                        // Exit Gap: Just leave empty space like the main map
                    }
                }
            }

            const roomVnum = room.id?.replace(/^m_/, '') ?? '';
            const pData = mapper.preloadedCoordsRef.current[roomVnum];
            const mobF: string[] = (room as any).mobFlags?.length > 0 ? (room as any).mobFlags : (pData?.[7] || []);
            const loadF: string[] = (room as any).loadFlags?.length > 0 ? (room as any).loadFlags : (pData?.[8] || []);
            const questF: string[] = (room as any).roomQuestFlags || [];
            if (mobF.length > 0 || loadF.length > 0 || questF.length > 0) {
                drawRoomFlagsOptimized(ctx, 4, gridS / 2, 1.0, mobF, loadF, questF);
            }
            ctx.restore();
        });

        // 2. Cinematic Vignette removed per user request


        // 3. Draw Occupants & Group (Brightly on top)
        const pRef = { current: { x: cameraRef.current.x, y: cameraRef.current.y, z: currentRoom.z || 0 } };
        drawEntities(rCtx, trailRef, pRef, characterName);
        drawGroupMembers(rCtx);

        ctx.restore();

    }, [currentRoom, roomPlayers, roomNpcs, roomItems, isDarkMode, mapper.rooms, mapper.preloadedCoordsRef, visibleRooms, groupMembers, opponentId, opponentName, characterName, mapper.clientPredictionsRef, mapper.serverIdIndexRef, mapper.baseMapExitsRef]);

    useEffect(() => {
        const animate = () => { draw(); requestRef.current = requestAnimationFrame(animate); };
        requestRef.current = requestAnimationFrame(animate);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [draw]);

    if (!currentRoom) return null;

    return (
        <div className="tactical-mini-map-container" title={`${currentRoom.name} [Mini-Map]`}>
            <canvas ref={canvasRef} onPointerDown={handleInteraction as any} className="tactical-mini-map-canvas" />
        </div>
    );
};

export default MiniMapRoom;
