/** @file Resolves arrival direction and local room candidates from server evidence. */
import type { GmcpRoomInfo, MapperRoom } from '../mapperTypes';
import { normalizeTerrain, DIRS, getExitTargetId, stripAnsi } from '../mapperUtils';
import { findBestTextRoomMatch } from '../textRoomMatcher';
import { findRoomByExitSignature } from '../mapperExitSignature';
import type { MapperRoomInfoProps, MapperPreloadedRoom } from '../../../types';

// --- Arrival matching ---
export function resolveMovingRoom(props: MapperRoomInfoProps, data: GmcpRoomInfo, movementAlreadyConfirmed: boolean, confirmedDirection?: string | null) {
    const { roomsRef, currentRoomIdRef, pendingMovesRef, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, onMoveConfirmed, addMessage, showDebugEchoes } = props;
    // MUME can omit the room id entirely when the player cannot see. Treat that
    // observation like VNUM 0 so queued direction, exits, and local map evidence
    // can still resolve the room instead of dropping the update here.
    let gmcpId = data.num ?? data.vnum ?? data.id ?? 0;
    const gmcpName = stripAnsi(data.name) || 'Unknown Room';
    let targetId: string | null = null;
    let ghostData: MapperPreloadedRoom | null = null;
    let matchedInternalId: string | null = null;
    let discoverySource: string | null = null;
    const isSpectateUpdate = data.spectating === true;
    const isTextRoomEvent = data.source === 'text';
    const isScoutObservation = data.scouting === true && !isSpectateUpdate;

    const activeRoomId = currentRoomIdRef.current;
    // If we have a ghost/preMove, we should use the room we actually WERE in for distance checks
    // to avoid "teleporting" if the ghost was placed at a wrong coordinate.
    let currentActiveRoom = activeRoomId ? roomsRef.current[activeRoomId] : null;
    if (!currentActiveRoom && activeRoomId && activeRoomId.startsWith('m_')) {
        const vnum = activeRoomId.substring(2);
        const pData = preloadedCoordsRef.current[vnum];
        if (pData) {
            currentActiveRoom = {
                id: activeRoomId,
                gmcpId: Number(pData[6]) || 0,
                name: pData[5] || 'Unknown Room',
                desc: '',
                x: pData[0],
                y: pData[1],
                z: pData[2] || 0,
                zone: pData[9] || 'Unknown Zone',
                terrain: normalizeTerrain(pData[3]) || 'Unknown Terrain',
                notes: '',
                exits: {},
                light: pData[10] !== undefined ? pData[10] : 0,
                sundeath: pData[11] !== undefined ? pData[11] : 1,
                createdAt: Date.now()
            };
            
            if (pData[4]) {
                const exits: MapperRoom['exits'] = {};
                for (const dir in pData[4]) {
                    const exitObj = pData[4][dir];
                    const destVnum = getExitTargetId(exitObj);
                    exits[dir] = {
                        target: `m_${destVnum}`,
                        gmcpDestId: Number(preloadedCoordsRef.current[destVnum]?.[6]) || 0,
                        closed: false,
                        hasDoor: typeof exitObj === 'object' && !!exitObj?.hasDoor,
                        flags: typeof exitObj === 'object' ? exitObj?.flags || [] : []
                    };
                }
                currentActiveRoom.exits = exits;
            }
        }
    }

    const now = Date.now();
    // MMapper retains sent commands until an arrival or a failure consumes
    // them. Travel can legitimately take longer than five seconds.
    
    // If we arrived via GMCP, we clear any dead-reckoning 'ghost' resolutions 
    // that happened between the command and this packet. 
    // The controller's shift() handles this if we call it correctly.

    // --- Move Correlation Logic ---
    let dirUsed: string | null = null;
    // MMapper and WebCockpit both treat every id below 1 as unidentified.
    const isVnumZero = !Number.isFinite(Number(gmcpId)) || Number(gmcpId) < 1;
    
    // Legacy servers without Event.Moved use ID changes as arrival evidence.
    const idChanged = !currentActiveRoom || String(currentActiveRoom.gmcpId) !== String(gmcpId);
    
    // Event.Moved distinguishes unidentified arrivals from looks. A changed
    // positive room ID independently proves arrival if its movement event was
    // absent. Lighting does not change the authority of that identity.
    const hasPendingMove = !isSpectateUpdate && pendingMovesRef.current.length > 0;
    const isLikelyMove = !movementAlreadyConfirmed && !isSpectateUpdate && !isScoutObservation
        && ((idChanged && !isVnumZero) || (confirmedDirection !== undefined
            ? confirmedDirection !== null : (idChanged || (hasPendingMove && isVnumZero))));

    // Identity is independent of movement ownership. Discovery mode may not have
    // materialized this room yet, even when Group.mapid already selected its ID.
    // A look/refresh must still resolve the bundled room and reveal its contents.
    if (!isVnumZero) {
        const mapped = serverIdIndexRef.current[String(gmcpId)];
        if (mapped) {
            matchedInternalId = mapped;
            ghostData = preloadedCoordsRef.current[mapped];
            discoverySource = 'EXACT_VNUM';
        }
    }

    if (isLikelyMove) {
        // Early queue peek: what direction are we trying to move?
        // We don't shift it yet, we just peek at it for Arda fallback.
        const intentDir = confirmedDirection ?? pendingMovesRef.current[0]?.dir ?? null;
        const pendingLenBeforeConsume = pendingMovesRef.current.length;

        // AUTHORITATIVE DIRECTION DETECTION
        const gmcpIdStr = String(gmcpId);

        // Match destination IDs only when the observation supplies a usable ID.
        // Missing IDs do not imply blindness: dark-seeing characters can see names.
        let authorityDir: string | null = confirmedDirection ?? null;
        if (!authorityDir && !isVnumZero && currentActiveRoom && currentActiveRoom.exits) {
            authorityDir = Object.keys(currentActiveRoom.exits).find(d => {
                const ex = currentActiveRoom.exits[d];
                return ex && String(ex.gmcpDestId) === gmcpIdStr;
            }) || null;
        }

        // 2. Fallback to ArdaMap preloaded exits
        // We now allow this even in the dark (isVnumZero) IF we have a dirUsed from the queue.
        if (currentActiveRoom && currentActiveRoom.id.startsWith('m_')) {
            const prevVnum = currentActiveRoom.id.substring(2);
            const ardaData = preloadedCoordsRef.current[prevVnum];
            if (ardaData && ardaData[4]) {
                // With an ID, match by identity; otherwise use movement direction.
                if (!authorityDir && !isVnumZero) {
                    authorityDir = Object.keys(ardaData[4]).find(d => getExitTargetId(ardaData[4][d]) === serverIdIndexRef.current[gmcpIdStr]) || null;
                } else if (isVnumZero && intentDir) {
                    // We are in the dark, but ArdaMap knows what VNUM is in the direction we moved.
                    const targetVnum = getExitTargetId(ardaData[4][intentDir]);
                    if (targetVnum) {
                        matchedInternalId = targetVnum;
                        ghostData = preloadedCoordsRef.current[targetVnum];
                        discoverySource = 'ARDA_DARK_RECKONING';
                        authorityDir = intentDir; // Confirm the intent as authoritative
                    }
                }
            }
        }

        dirUsed = authorityDir;
        if (!dirUsed) {
            // 3. Fallback to ArdaMap preloaded exits
            if (currentActiveRoom && currentActiveRoom.id.startsWith('m_')) {
                const prevVnum = currentActiveRoom.id.substring(2);
                const ardaData = preloadedCoordsRef.current[prevVnum];
                if (ardaData && ardaData[4]) {
                    dirUsed = Object.keys(ardaData[4]).find(dir =>
                        getExitTargetId(ardaData[4][dir]) === serverIdIndexRef.current[gmcpIdStr]
                    ) || null;
                }
            }
        }
        // MMapper consumes only the oldest command for each arrival. An
        // unexpected direction invalidates the remaining speculative path.
        const queuedMove = pendingMovesRef.current.shift();
        if (!dirUsed) dirUsed = queuedMove?.dir || null;
        else if (queuedMove && queuedMove.dir !== dirUsed) {
            pendingMovesRef.current = [];
            if (showDebugEchoes) addMessage?.('system', `[Mapper] Movement ${dirUsed} did not match queued ${queuedMove.dir}; clearing prediction queue.`);
        }

        if (dirUsed && pendingMovesRef.current.length < pendingLenBeforeConsume) {
            onMoveConfirmed?.(dirUsed);
        }

        // --- MATCHING HIERARCHY (Only if it's a move) ---
        
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
                    const nextVnumStr = getExitTargetId(ardaMapping[4][dirUsed]);
                    const ardaData = preloadedCoordsRef.current[nextVnumStr];
                    if (ardaData && ardaData[5] === gmcpName) {
                        matchedInternalId = nextVnumStr;
                        ghostData = ardaData;
                        discoverySource = 'ARDA_NEIGHBOR_MATCH';
                    }
                }
            }
        }

        // Priority 3: Text-derived neighbor scoring for no-GMCP movement.
        if (!matchedInternalId && !targetId && isTextRoomEvent && isVnumZero && currentActiveRoom) {
            const textMatch = findBestTextRoomMatch(data, currentActiveRoom, dirUsed, roomsRef.current,
                preloadedCoordsRef.current as Parameters<typeof findBestTextRoomMatch>[4]);
            if (textMatch) {
                targetId = textMatch.id;
                const rawTextMatchId = textMatch.id.replace(/^m_/, '');
                const textGhostData = preloadedCoordsRef.current[rawTextMatchId];
                if (textGhostData) {
                    matchedInternalId = rawTextMatchId;
                    ghostData = textGhostData;
                }
                discoverySource = textMatch.source;
            }
        }

        // Priority 3.5: Exit-signature confirmation (MMapper compareWeakProps).
        // For ambiguous/dark moves, disambiguate among the rooms reachable by this
        // move using the exits the player can actually see. This is what locks
        // up/down and dark steps onto the right preloaded room instead of a coord
        // collision — the previous coord-only adjacency couldn't tell stacked rooms apart.
        if (!matchedInternalId && !targetId && currentActiveRoom && dirUsed && data.exits) {
            const sigMatch = findRoomByExitSignature({
                currentRoom: currentActiveRoom,
                dirUsed,
                eventExits: data.exits,
                rooms: roomsRef.current,
                preloaded: preloadedCoordsRef.current,
                spatialIndex: spatialIndexRef?.current
            });
            if (sigMatch) {
                targetId = sigMatch.id;
                if (sigMatch.vnum && preloadedCoordsRef.current[sigMatch.vnum]) {
                    matchedInternalId = sigMatch.vnum;
                    ghostData = preloadedCoordsRef.current[sigMatch.vnum];
                }
                discoverySource = 'EXIT_SIGNATURE';
            }
        }

        // Priority 4: Coordinate-Restricted Fingerprinting (Global Search)
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
            // Priority 5: Pure Adjacency (Dark Reckoning / VNUM 0)
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

    return { gmcpId, gmcpName, targetId, ghostData, matchedInternalId, discoverySource, isSpectateUpdate, isTextRoomEvent, isScoutObservation, activeRoomId, currentActiveRoom, now, dirUsed, isVnumZero, isLikelyMove };
}
