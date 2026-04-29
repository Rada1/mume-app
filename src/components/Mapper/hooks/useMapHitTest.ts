import { useCallback } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';
import { GRID_SIZE, getGateState } from '../mapperUtils';
import { getMapOccupantTargets, MapOccupantTarget } from '../occupantTargets';
import { COLOR_NPC, COLOR_PLAYER } from '../../../utils/categorizationUtils';
import type { GmcpOccupant, GroupMember, InlineCategoryConfig } from '../../../types';

interface UseMapHitTestProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    markersRef: React.MutableRefObject<Record<string, MapperMarker>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    cameraRef: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    viewZ: number | null;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any[]>>;
    roomCharsRef?: React.MutableRefObject<Record<number, GmcpOccupant>>;
    roomPlayersRef?: React.MutableRefObject<GmcpOccupant[]>;
    roomNpcsRef?: React.MutableRefObject<GmcpOccupant[]>;
    groupMembersRef?: React.MutableRefObject<GroupMember[]>;
    inlineCategoriesRef?: React.MutableRefObject<InlineCategoryConfig[]>;
    characterNameRef?: React.MutableRefObject<string | null>;
    playerColorRef?: React.MutableRefObject<string | undefined>;
    npcColorRef?: React.MutableRefObject<string | undefined>;
}

export const useMapHitTest = ({
    roomsRef, markersRef, currentRoomIdRef, cameraRef, canvasRef, viewZ, spatialIndexRef, preloadedCoordsRef,
    roomCharsRef, roomPlayersRef, roomNpcsRef, groupMembersRef, inlineCategoriesRef,
    characterNameRef, playerColorRef, npcColorRef
}: UseMapHitTestProps) => {

    const screenToWorld = useCallback((sx: number, sy: number) => {
        const cvs = canvasRef.current;
        if (!cvs) return { x: 0, y: 0 };
        const rect = cvs.getBoundingClientRect();
        return {
            x: ((sx - rect.left) / cameraRef.current.zoom) + cameraRef.current.x,
            y: ((sy - rect.top) / cameraRef.current.zoom) + cameraRef.current.y
        };
    }, [canvasRef, cameraRef]);

    const getRoomAt = useCallback((wx: number, wy: number, strictZ = false) => {
        const roomsToSearch = roomsRef.current;
        const currentZ = viewZ !== null ? viewZ : (currentRoomIdRef.current ? (roomsToSearch[currentRoomIdRef.current]?.z || 0) : 0);
        const margin = 10;
        let foundRoom: string | null = null;
        let bestDist = Infinity;

        // 1. Search Local State first
        for (const key in roomsToSearch) {
            const r = roomsToSearch[key];
            const rx = Math.round(r.x) * GRID_SIZE, ry = Math.round(r.y) * GRID_SIZE;
            if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                const rz = r.z || 0;
                if (rz === currentZ) return r.id;
                if (!strictZ) {
                    const dist = Math.abs(rz - currentZ);
                    if (dist < bestDist) { bestDist = dist; foundRoom = r.id; }
                }
            }
        }

        // 2. Search Master Map if nothing in local
        if (spatialIndexRef.current && preloadedCoordsRef.current) {
            const floor = Math.round(currentZ);
            const floorBuckets = spatialIndexRef.current[floor];
            if (floorBuckets) {
                const bx = Math.floor(wx / GRID_SIZE / 5);
                const by = Math.floor(wy / GRID_SIZE / 5);
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const vnums = floorBuckets[`${bx + dx},${by + dy}`];
                        if (vnums) {
                            for (const vnum of vnums) {
                                const [rx_g, ry_g] = preloadedCoordsRef.current[vnum];
                                const rx = Math.round(rx_g) * GRID_SIZE, ry = Math.round(ry_g) * GRID_SIZE;
                                if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                                    return `m_${vnum}`;
                                }
                            }
                        }
                    }
                }
            }
        }
        return foundRoom;
    }, [viewZ, preloadedCoordsRef, spatialIndexRef, roomsRef, currentRoomIdRef]);

    const getMarkerAt = useCallback((wx: number, wy: number) => {
        const markersToSearch = markersRef.current;
        const roomsToSearch = roomsRef.current;
        const currentZ = currentRoomIdRef.current ? (roomsToSearch[currentRoomIdRef.current]?.z || 0) : 0;
        const z = cameraRef.current.zoom;
        for (const key in markersToSearch) {
            const m = markersToSearch[key];
            if ((m.z || 0) !== currentZ) continue;
            const dx = m.x * GRID_SIZE - wx;
            const dy = m.y * GRID_SIZE - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (20 / z)) return key;
        }
        return null;
    }, [cameraRef, currentRoomIdRef, markersRef, roomsRef]);

    const getExitAt = useCallback((wx: number, wy: number) => {
        const roomId = getRoomAt(wx, wy);
        if (!roomId) return null;

        let room = roomsRef.current[roomId] || (roomId.startsWith('m_') ? null : roomsRef.current[`m_${roomId}`]);
        const s = GRID_SIZE;
        const margin = 12; // Hitbox margin

        let rx: number, ry: number;
        let exits: any = null;

        // --- NEW: Prioritize Current Room ---
        // If we are touching an area that might be an exit for our CURRENT room,
        // we should try that room first. This prevents clicking "the other side" 
        // when both are visible and overlapping.
        let testRoomId = roomId;

        if (currentRoomIdRef.current) {
            const curId = currentRoomIdRef.current;
            const curRoom = roomsRef.current[curId] || (curId.startsWith('m_') ? null : roomsRef.current[`m_${curId}`]);
            
            // Get coordinates for current room
            let crx: number, cry: number;
            if (curRoom) {
                crx = curRoom.x; cry = curRoom.y;
            } else if (preloadedCoordsRef.current) {
                const rData = preloadedCoordsRef.current[curId.replace(/^m_/, '')];
                if (rData) {
                    crx = rData[0]; cry = rData[1];
                } else {
                    crx = NaN; cry = NaN;
                }
            } else {
                crx = NaN; cry = NaN;
            }

            if (!isNaN(crx)) {
                const roomWx = Math.round(crx) * s;
                const roomWy = Math.round(cry) * s;
                const dx = wx - roomWx;
                const dy = wy - roomWy;

                // If click is within the bounds of current room (with margin), prioritize it
                if (dx >= -margin && dx <= s + margin && dy >= -margin && dy <= s + margin) {
                    testRoomId = curId;
                    room = curRoom;
                }
            }
        }

        if (!room) {
            room = roomsRef.current[testRoomId] || (testRoomId.startsWith('m_') ? null : roomsRef.current[`m_${testRoomId}`]);
        }

        if (room) {
            rx = room.x; ry = room.y;
            exits = room.exits;
        } else if (preloadedCoordsRef.current) {
            const rawId = testRoomId.replace(/^m_/, '');
            const rData = preloadedCoordsRef.current[rawId];
            if (!rData) return null;
            rx = rData[0]; ry = rData[1];
            exits = rData[4];
        } else {
            return null;
        }

        const roomWx = Math.round(rx) * s;
        const roomWy = Math.round(ry) * s;
        const dx = wx - roomWx;
        const dy = wy - roomWy;
        
        const currentRoomId = testRoomId; // For the checkDoor closure

        // Check vertical exits first (corners)
        const cOff = 12;
        const anchorX = s / 2, anchorY = s / 2;
        
        const checkDoor = (dir: string) => {
            const wE = preloadedCoordsRef.current?.[currentRoomId.replace(/^m_/, '')]?.[4];
            const gate = getGateState(room, wE, dir, roomsRef.current, preloadedCoordsRef.current || {});
            if (gate && gate.hasDoor) {
                return { direction: dir as any, roomId: currentRoomId, isClosed: gate.isClosed, hasDoor: true };
            }
            return null;
        };

        // UP: NW Corner
        const ux = anchorX - cOff, uy = anchorY - cOff;
        if (Math.abs(dx - ux) < margin && Math.abs(dy - uy) < margin) {
            const hit = checkDoor('u');
            if (hit) return hit;
        }

        // DOWN: SE Corner
        const dx_pos = anchorX + cOff, dy_pos = anchorY + cOff;
        if (Math.abs(dx - dx_pos) < margin && Math.abs(dy - dy_pos) < margin) {
            const hit = checkDoor('d');
            if (hit) return hit;
        }

        // Check Cardinal Edges
        // North
        if (dy >= -margin && dy <= margin && dx >= 0 && dx <= s) {
            const hit = checkDoor('n');
            if (hit) return hit;
        }
        // South
        if (dy >= s - margin && dy <= s + margin && dx >= 0 && dx <= s) {
            const hit = checkDoor('s');
            if (hit) return hit;
        }
        // East
        if (dx >= s - margin && dx <= s + margin && dy >= 0 && dy <= s) {
            const hit = checkDoor('e');
            if (hit) return hit;
        }
        // West
        if (dx >= -margin && dx <= margin && dy >= 0 && dy <= s) {
            const hit = checkDoor('w');
            if (hit) return hit;
        }

        return null;

    }, [roomsRef, preloadedCoordsRef, getRoomAt]);

    const getOccupantAt = useCallback((wx: number, wy: number): MapOccupantTarget | null => {
        const currentRoomId = currentRoomIdRef.current;
        if (!currentRoomId) return null;

        const rawId = currentRoomId.replace(/^m_/, '');
        const room = roomsRef.current[currentRoomId] || roomsRef.current[`m_${rawId}`];
        const preloadedRoom = preloadedCoordsRef.current?.[rawId];
        const anchor = room
            ? { x: room.x, y: room.y, z: room.z || 0 }
            : preloadedRoom
                ? { x: preloadedRoom[0], y: preloadedRoom[1], z: preloadedRoom[2] || 0 }
                : null;

        if (!anchor) return null;
        const currentZ = viewZ !== null ? viewZ : anchor.z;
        if (Math.abs(anchor.z - currentZ) >= 1.0) return null;

        const targets = getMapOccupantTargets({
            anchor,
            cameraZoom: cameraRef.current.zoom,
            roomChars: roomCharsRef?.current || {},
            roomPlayers: roomPlayersRef?.current || [],
            roomNpcs: roomNpcsRef?.current || [],
            groupMembers: groupMembersRef?.current || [],
            characterName: characterNameRef?.current || null,
            inlineCategories: inlineCategoriesRef?.current || [],
            playerColor: playerColorRef?.current || COLOR_PLAYER,
            npcColor: npcColorRef?.current || COLOR_NPC
        });

        const hitRadius = Math.max(12 / cameraRef.current.zoom, 8);
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            const dist = Math.hypot(target.x - wx, target.y - wy);
            if (dist <= Math.max(hitRadius, target.radius + 6 / cameraRef.current.zoom)) return target;
        }
        return null;
    }, [
        cameraRef, characterNameRef, currentRoomIdRef, groupMembersRef, inlineCategoriesRef,
        npcColorRef, playerColorRef, preloadedCoordsRef, roomCharsRef, roomNpcsRef,
        roomPlayersRef, roomsRef, viewZ
    ]);

    return { screenToWorld, getRoomAt, getMarkerAt, getExitAt, getOccupantAt };
};
