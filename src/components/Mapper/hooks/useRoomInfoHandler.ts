import { useCallback } from 'react';
import { GmcpRoomInfo, MapperRoom } from '../mapperTypes';
import { generateId, normalizeTerrain, DIRS } from '../mapperUtils';

interface RoomInfoProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    pendingMovesRef: React.MutableRefObject<{ dir: string; time: number }[]>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    triggerRender?: () => void;
    onRoomInfoProcessed?: () => void;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
}

export const useRoomInfoHandler = ({
    roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
    nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef,
    firstExploredAtRef, triggerRender, onRoomInfoProcessed, addMessage, showDebugEchoes
}: RoomInfoProps) => {

    const handleRoomInfo = useCallback((data: GmcpRoomInfo) => {
        let gmcpId = data.num !== undefined ? data.num : (data.vnum !== undefined ? data.vnum : data.id);
        const gmcpName = data.name || 'Unknown Room';
        const gmcpArea = data.area || data.zone || 'Unknown Zone';
        let targetId: string | null = null;
        let ghostData: any = null;
        let matchedInternalId: string | null = null;
        let discoverySource: string | null = null;

        if (gmcpId === undefined || gmcpId === null) return;

        const activeRoomId = currentRoomIdRef.current;
        // If we have a ghost/preMove, we should use the room we actually WERE in for distance checks
        // to avoid "teleporting" if the ghost was placed at a wrong coordinate.
        const currentActiveRoom = activeRoomId ? roomsRef.current[activeRoomId] : null;

        const now = Date.now();
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) {
            pendingMovesRef.current.shift();
        }
        
        // If we arrived via GMCP, we clear any dead-reckoning 'ghost' resolutions 
        // that happened between the command and this packet. 
        // The controller's shift() handles this if we call it correctly.

        // --- Move Correlation Logic ---
        let dirUsed: string | null = null;
        const isVnumZero = String(gmcpId) === '0' || String(gmcpId) === 'null' || !gmcpId;
        
        // ID change is the strongest indicator of a move.
        const idChanged = !currentActiveRoom || String(currentActiveRoom.gmcpId) !== String(gmcpId);
        
        // If ID didn't change, it's usually a refresh (look) UNLESS we are in a VNUM 0 area 
        // where multiple rooms might share the same "0" ID.
        const hasPendingMove = pendingMovesRef.current.length > 0;
        const isLikelyMove = idChanged || (hasPendingMove && isVnumZero);

        if (isLikelyMove) {
            // AUTHORITATIVE DIRECTION DETECTION
            const gmcpIdStr = String(gmcpId);

            // 1. Try to find a matching exit from the PREVIOUS room to the NEW gmcpId
            // CRITICAL: We only use authoritative exit matching for LIT rooms (non-zero VNUM).
            // In the dark, many exits lead to "0", so connectivity guessing is random/wrong.
            let authorityDir: string | null = null;
            if (!isVnumZero && currentActiveRoom && currentActiveRoom.exits) {
                authorityDir = Object.keys(currentActiveRoom.exits).find(d => {
                    const ex = currentActiveRoom.exits[d];
                    return ex && String(ex.gmcpDestId) === gmcpIdStr;
                }) || null;
            }

            // 2. Fallback to ArdaMap preloaded exits
            // We now allow this even in the dark (isVnumZero) IF we have a dirUsed from the queue.
            if (!authorityDir && currentActiveRoom && currentActiveRoom.id.startsWith('m_')) {
                const prevVnum = currentActiveRoom.id.substring(2);
                const ardaData = preloadedCoordsRef.current[prevVnum];
                if (ardaData && ardaData[4]) {
                    // In lit rooms, we match by gmcpId. In dark rooms, we trust the queue's direction.
                    if (!isVnumZero) {
                        authorityDir = Object.keys(ardaData[4]).find(d => String(ardaData[4][d]) === gmcpIdStr) || null;
                    } else if (dirUsed) {
                        // We are in the dark, but ArdaMap knows what VNUM is in the direction we moved.
                        const targetVnum = String(ardaData[4][dirUsed]);
                        if (targetVnum) {
                            matchedInternalId = targetVnum;
                            ghostData = preloadedCoordsRef.current[targetVnum];
                            discoverySource = 'ARDA_DARK_RECKONING';
                        }
                    }
                }
            }

            if (authorityDir) {
                dirUsed = authorityDir;
                // QUEUE PRUNING: If this authoritative dir exists in our queue, 
                // remove it and everything before it (which are now confirmed failed/skipped).
                const matchIdx = pendingMovesRef.current.findIndex(m => m.dir === authorityDir);
                if (matchIdx !== -1) {
                    pendingMovesRef.current.splice(0, matchIdx + 1);
                }
            } else {
                // 3. Last fallback: use the pending queue head if we still don't know the direction
                const nextMove = pendingMovesRef.current.shift();
                if (nextMove) {
                    dirUsed = nextMove.dir;
                }
            }

            // --- MATCHING HIERARCHY (Only if it's a move) ---
            
            // Priority 1: Exact VNUM (Authoritative)
            if (!isVnumZero) {
                const gmcpIdStr = String(gmcpId);
                const fastServerMatch = serverIdIndexRef.current[gmcpIdStr];
                if (fastServerMatch) {
                    matchedInternalId = fastServerMatch;
                    ghostData = preloadedCoordsRef.current[matchedInternalId];
                    discoverySource = 'EXACT_VNUM';
                }
            }

            // Priority 2: Immediate Neighbor Name Match (Prevents Jumps)
            if (!matchedInternalId && currentActiveRoom && dirUsed) {
                // Check if the current room has an exit in this direction leading to a room with this name
                const exit = currentActiveRoom.exits[dirUsed];
                if (exit && exit.target) {
                    const targetRoom = roomsRef.current[exit.target];
                    if (targetRoom && (targetRoom.name === gmcpName || targetRoom.gmcpId === Number(gmcpId))) {
                        targetId = exit.target;
                        discoverySource = 'NEIGHBOR_MATCH';
                    }
                }
                
                // Also check ArdaMap adjacency for a name match
                if (!targetId && currentActiveRoom.id.startsWith('m_')) {
                    const prevVnum = currentActiveRoom.id.substring(2);
                    const ardaMapping = preloadedCoordsRef.current[prevVnum];
                    if (ardaMapping && ardaMapping[4] && ardaMapping[4][dirUsed]) {
                        const nextVnumStr = String(ardaMapping[4][dirUsed]);
                        const ardaData = preloadedCoordsRef.current[nextVnumStr];
                        if (ardaData && ardaData[5] === gmcpName) {
                            matchedInternalId = nextVnumStr;
                            ghostData = ardaData;
                            discoverySource = 'ARDA_NEIGHBOR_MATCH';
                        }
                    }
                }
            }

            // Priority 3: Coordinate-Restricted Fingerprinting (Global Search)
            if (!matchedInternalId && !targetId && !isVnumZero) {
                const candidates = nameIndexRef.current[gmcpName];
                if (candidates && candidates.length > 0) {
                    let minDist = Infinity;
                    const currX = currentActiveRoom ? currentActiveRoom.x : 0;
                    const currY = currentActiveRoom ? currentActiveRoom.y : 0;
                    const currZ = currentActiveRoom ? (currentActiveRoom.z || 0) : 0;

                    for (const candidateId of candidates) {
                        const rData = preloadedCoordsRef.current[candidateId];
                        if (rData) {
                            const dist = Math.pow(rData[0] - currX, 2) + Math.pow(rData[1] - currY, 2) + Math.pow((rData[2] - currZ) * 5, 2);
                            if (dist < minDist) {
                                minDist = dist;
                                matchedInternalId = candidateId;
                                ghostData = rData;
                            }
                        }
                    }
                    // Snapping threshold: strictly within 10 units squared (very local)
                    if (ghostData && minDist < 100) {
                        discoverySource = 'FINGERPRINT';
                    } else {
                        matchedInternalId = null;
                        ghostData = null;
                    }
                }
            } else if (!matchedInternalId && !targetId && currentActiveRoom && dirUsed) {
                // Priority 4: Pure Adjacency (Dark Reckoning / VNUM 0)
                const d = DIRS[dirUsed];
                if (d) {
                    const px = currentActiveRoom.x + (d.dx || 0);
                    const py = currentActiveRoom.y + (d.dy || 0);
                    const pz = (currentActiveRoom.z || 0) + (d.dz || 0);
                    
                    const neighbor = Object.values(roomsRef.current).find(r => 
                        r.x === px && r.y === py && Math.abs(r.z - pz) < 0.5 && r.zone === currentActiveRoom.zone
                    );
                    if (neighbor) {
                        targetId = neighbor.id;
                        discoverySource = 'COORD_ADJACENCY';
                    }
                }
            }
        }
        // If !isLikelyMove, this is a REFRESH (look, etc) - do NOT consume pending moves.

        // Prioritize finding a room that's an existing exit from our current location
        if (currentActiveRoom && dirUsed && currentActiveRoom.exits[dirUsed]) {
            const ex = currentActiveRoom.exits[dirUsed];
            if (ex.target) {
                const existingTarget = roomsRef.current[ex.target];
                // Double check it's likely the right room
                const coordsMatch = existingTarget && Math.round(existingTarget.x) === predX && Math.round(existingTarget.y) === predY;
                
                if (!isVnumZero && ex.gmcpDestId && String(ex.gmcpDestId) !== String(gmcpId)) {
                    // VNUM Mismatch - ignore this exit
                } else if (isVnumZero && !coordsMatch) {
                    // In the dark, we only trust an existing exit if it's actually adjacent.
                    // This prevents "jumping" to distant rooms that also have VNUM 0.
                } else {
                    targetId = ex.target;
                }
            }
        }

        // If not found via exits, try global search (only for non-zero unique IDs)
        if (!targetId && !isVnumZero) {
            targetId = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId)) || null;
        }

        // Final fallback for dark rooms: look for ANY room at the exact predicted coordinates
        if (!targetId && isVnumZero && currentActiveRoom) {
            targetId = Object.keys(roomsRef.current).find(key => {
                const r = roomsRef.current[key];
                return Math.round(r.x) === predX && Math.round(r.y) === predY && Math.abs(Math.round(r.z || 0) - predZ) < 0.5 && r.zone === currentActiveRoom.zone;
            }) || null;
        }

        let predX = currentActiveRoom ? Math.round(currentActiveRoom.x) : 0;
        let predY = currentActiveRoom ? Math.round(currentActiveRoom.y) : 0;
        let predZ = currentActiveRoom ? Math.round(currentActiveRoom.z || 0) : 0;

        if (ghostData) {
            predX = Math.round(ghostData[0]); predY = Math.round(ghostData[1]); predZ = Math.round(ghostData[2]);
        } else if (currentActiveRoom && dirUsed) {
            const d = DIRS[dirUsed];
            if (d) { 
                predX = Math.round(predX + (d.dx || 0)); 
                predY = Math.round(predY + (d.dy || 0)); 
                predZ = Math.round(predZ + (d.dz || 0)); 
            }
        }

        discoverySourceRef.current = discoverySource;
        if (dirUsed || discoverySource || isVnumZero) {
            if (showDebugEchoes) {
                const gmcpDisplay = isVnumZero ? 'DARK/0' : gmcpId;
                const debugMsg = `[Mapper] Move: ${dirUsed || 'Snap'} -> Pred: ${predX},${predY},${predZ} | GMCP: ${gmcpDisplay}${discoverySource ? ` (Auto-Snap by ${discoverySource})` : ''} | Target: ${targetId ? 'MATCHED' : 'NEW'}`;
                addMessage?.('system', debugMsg);
            }
        }

        const name = data.name || 'Unknown Room';
        const desc = data.desc || '';
        const zone = data.area || data.zone || 'Unknown Zone';
        const freshTerrain = normalizeTerrain(data.terrain || data.environment || null);
        const questFlags = data.room_quest_flags || [];

        if (ghostData && matchedInternalId) {
            targetId = `m_${matchedInternalId}`;
            // ... (explored logic remains unchanged)
        }

        if (!targetId && isVnumZero) {
            targetId = `ghost_${predX}_${predY}_${predZ}`;
        }

        if (!targetId) targetId = generateId();

        // Check for any changes without relying on React's functional updater closures,
        // which can lead to stale local variables in strict mode.
        let topologyChanged = false;

        // Use the current stable ref to determine changes synchronously
        const prevRooms = roomsRef.current;
        let newRooms = prevRooms;
        let existingRoom = newRooms[targetId!];

        if (!existingRoom) {
            topologyChanged = true;
            newRooms = { ...prevRooms };
            let nx = predX, ny = predY, nz = predZ;
            if (ghostData) [nx, ny, nz] = ghostData;
            else if (!currentActiveRoom && !ghostData) { nx = 0; ny = 0; nz = 0; }

            const newRoom: MapperRoom = {
                id: targetId!, gmcpId: Number(gmcpId) || 0, name, desc,
                x: nx, y: ny, z: nz,
                zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain',
                exits: {}, notes: "",
                mobFlags: ghostData ? ghostData[7] : [],
                loadFlags: ghostData ? ghostData[8] : [],
                roomQuestFlags: questFlags,
                createdAt: Date.now()
            };
            newRooms[targetId!] = newRoom;

            if (currentActiveRoom && dirUsed && activeRoomId !== targetId) {
                newRooms[currentActiveRoom.id] = {
                    ...currentActiveRoom,
                    exits: { ...currentActiveRoom.exits, [dirUsed]: { ...currentActiveRoom.exits[dirUsed], target: targetId!, gmcpDestId: Number(gmcpId) || 0, closed: false } }
                };
                const d = DIRS[dirUsed];
                if (d && d.opp) newRooms[targetId!].exits[d.opp] = { ...newRooms[targetId!].exits[d.opp], target: currentActiveRoom.id, closed: false };
            }
        } else {
            const finalTerrain = (data.terrain || data.environment) ? normalizeTerrain(data.terrain || data.environment) : existingRoom.terrain;
            const newMobFlags = ghostData ? ghostData[7] : existingRoom.mobFlags || [];
            const newLoadFlags = ghostData ? ghostData[8] : existingRoom.loadFlags || [];
            const newRoomQuestFlags = questFlags.length > 0 ? questFlags : existingRoom.roomQuestFlags || [];

            // Check dynamic properties too
            const arraysDiffer = (a: any[], b: any[]) => a.length !== b.length || a.some((v, i) => v !== b[i]);

            const needsUpdate =
                existingRoom.terrain !== finalTerrain ||
                existingRoom.name !== name ||
                existingRoom.desc !== desc ||
                arraysDiffer(existingRoom.mobFlags || [], newMobFlags) ||
                arraysDiffer(existingRoom.loadFlags || [], newLoadFlags) ||
                arraysDiffer(existingRoom.roomQuestFlags || [], newRoomQuestFlags) ||
                (ghostData && (existingRoom.x !== ghostData[0] || existingRoom.y !== ghostData[1])) ||
                (currentActiveRoom && dirUsed && activeRoomId !== targetId);

            if (needsUpdate) {
                topologyChanged = true;
                newRooms = { ...prevRooms };
                newRooms[targetId!] = {
                    ...existingRoom,
                    gmcpId: Number(gmcpId) || 0,
                    name, desc, zone,
                    terrain: finalTerrain,
                    mobFlags: newMobFlags,
                    loadFlags: newLoadFlags,
                    roomQuestFlags: newRoomQuestFlags
                };
                if (ghostData) {
                    const [nx, ny, nz] = ghostData;
                    newRooms[targetId!] = { ...newRooms[targetId!], x: nx, y: ny, z: nz };
                }
                if (currentActiveRoom && dirUsed && activeRoomId !== targetId) {
                    newRooms[currentActiveRoom.id] = { ...currentActiveRoom, exits: { ...currentActiveRoom.exits, [dirUsed]: { ...currentActiveRoom.exits[dirUsed], target: targetId!, gmcpDestId: Number(gmcpId) || 0, closed: false } } };
                    const d = DIRS[dirUsed];
                    if (d && d.opp) newRooms[targetId!] = { ...newRooms[targetId!], exits: { ...newRooms[targetId!].exits, [d.opp]: { ...newRooms[targetId!].exits[d.opp], target: currentActiveRoom.id, closed: false } } };
                }
            }
        }

        if (data.exits) {
            const room = newRooms[targetId!];
            const updatedExits: Record<string, any> = {};
            let exitsChanged = false;

            for (const dir in data.exits) {
                const gmcpExit = data.exits[dir];
                if (gmcpExit === false) continue;
                const gmcpDestId = typeof gmcpExit === 'number' ? gmcpExit : gmcpExit.id;
                let exName = undefined, exFlags = undefined;
                if (typeof gmcpExit === 'object') { exName = gmcpExit.name; exFlags = gmcpExit.flags; }

                let internalTarget = undefined;
                if (gmcpDestId) {
                    if (preloadedCoordsRef.current[String(gmcpDestId)]) internalTarget = `m_${gmcpDestId}`;
                    else internalTarget = Object.keys(newRooms).find(key => String(newRooms[key].gmcpId) === String(gmcpDestId));
                }
                const exFlagsLow = (exFlags || []).map(f => f.toLowerCase());
                const isClosed = exFlagsLow.includes('closed') || exFlagsLow.includes('locked');
                const isDoor = isClosed || (typeof gmcpExit === 'object' && (gmcpExit as any).door) || !!exName || exFlagsLow.some(f => /door|gate|portcullis|secret/i.test(f));

                updatedExits[dir] = { target: internalTarget || "", gmcpDestId, name: exName, flags: exFlags || [], closed: isClosed, hasDoor: !!isDoor };

                const existingExit = room.exits && room.exits[dir];
                if (!existingExit || existingExit.gmcpDestId !== gmcpDestId || existingExit.closed !== isClosed) {
                    exitsChanged = true;
                }
            }

            // Also check if any exits were removed
            if (!exitsChanged && room.exits) {
                for (const dir in room.exits) {
                    if (!(dir in updatedExits)) {
                        exitsChanged = true;
                        break;
                    }
                }
            }

            if (exitsChanged) {
                if (!topologyChanged) {
                    newRooms = { ...prevRooms };
                    topologyChanged = true;
                }
                newRooms[targetId!] = { ...room, exits: updatedExits };
            }
        }

        // Apply topology changes to state
        if (topologyChanged) {
            roomsRef.current = newRooms; // Sync ref immediately to prevent race conditions on fast updates
            setRooms(newRooms);
        }

        // Update the current room ID state if it changed
        const roomChanged = targetId !== activeRoomId;
        if (roomChanged) {
            setCurrentRoomId(targetId);
        }

        // Update the current room reference immediately for canvas consumption
        currentRoomIdRef.current = targetId;
        
        // Always trigger a render update for the map canvas if anything changed
        if (topologyChanged || roomChanged) {
            triggerRender?.();
        }
        
        onRoomInfoProcessed?.();
    }, [roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, firstExploredAtRef, triggerRender, onRoomInfoProcessed, addMessage, showDebugEchoes]);

    return { handleRoomInfo };
};