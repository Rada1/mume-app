/** @file Resolves room observations and consumes one queued input per arrival. */
import { useCallback, useRef } from 'react';
import type { GmcpRoomInfo } from '../mapperTypes';
import { generateId, DIRS, getExitTargetId } from '../mapperUtils';
import type { MapperRoomInfoInput, MapperRoomInfoProps } from '../../../types';
import { resolveMovingRoom } from './resolveMovingRoom';
import { applyRoomInfoObservation } from './applyRoomInfoObservation';

// --- Room observation lifecycle ---
export const useRoomInfoHandler = (input: MapperRoomInfoInput) => {
    const props = input as MapperRoomInfoProps;
    const { roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, spatialIndexRef,
    nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef,
    firstExploredAtRef, triggerRender, onRoomInfoProcessed, onFirstVisitLoadFlag, onMoveConfirmed, addMessage, showDebugEchoes, preMoveRef,
    deathRoomId, setDeathRoomId, baseMapExitsRef, activeView, mapEditMode } = props;

    // Debounce for syncing the explored Set into React state / persistence. The hot
    // discovery path mutates exploredRef.current in place (O(1)); this collapses a
    // walking burst into a single Set clone after the player settles, instead of one
    // clone per room (which was O(n) per step → O(n²) over a session).
    const exploredSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Logic Section ---
    const handleRoomInfo = useCallback((data: GmcpRoomInfo, movementAlreadyConfirmed = false, confirmedDirection?: string | null) => {
        const resolved = resolveMovingRoom(props, data, movementAlreadyConfirmed, confirmedDirection);
        let { gmcpId, gmcpName, targetId, ghostData, matchedInternalId, discoverySource, isSpectateUpdate, isTextRoomEvent, isScoutObservation, activeRoomId, currentActiveRoom, now, dirUsed, isVnumZero, isLikelyMove } = resolved;

        // A scout reports another room's details without moving the character. Resolve
        // known rooms so their map data can still be refreshed, but never dead-reckon
        // an unidentified observation from the player's current coordinates.
        if (isScoutObservation) {
            if (isVnumZero) return;

            const scoutRoomId = String(gmcpId);
            const mappedVnum = serverIdIndexRef.current[scoutRoomId];
            if (mappedVnum) {
                matchedInternalId = mappedVnum;
                ghostData = preloadedCoordsRef.current[mappedVnum] || null;
                discoverySource = 'SCOUT_OBSERVATION';
            } else {
                targetId = Object.keys(roomsRef.current).find(key =>
                    String(roomsRef.current[key].gmcpId) === scoutRoomId
                ) || null;
            }
        }
        
        // For spectate updates, we always jump directly to the matched internal ID if found
        if (isSpectateUpdate && !isVnumZero) {
            const gmcpIdStr = String(gmcpId);
            const fastServerMatch = serverIdIndexRef.current[gmcpIdStr];
            if (fastServerMatch) {
                matchedInternalId = fastServerMatch;
                ghostData = preloadedCoordsRef.current[matchedInternalId];
            }
        }

        // Calculate predicted coordinates first to allow usage in exit/neighbor validation
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

        // Prioritize finding a room that's an existing exit from our current location
        if (!targetId && !matchedInternalId && !isSpectateUpdate && currentActiveRoom && dirUsed && currentActiveRoom.exits[dirUsed]) {
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
        if (!targetId && !matchedInternalId && !isVnumZero) {
            targetId = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId)) || null;
        }

        // Final fallback for dark rooms: look for ANY room at the exact predicted coordinates
        if (!targetId && !matchedInternalId && isVnumZero && currentActiveRoom) {
            targetId = Object.keys(roomsRef.current).find(key => {
                const r = roomsRef.current[key];
                return Math.round(r.x) === predX && Math.round(r.y) === predY && Math.abs(Math.round(r.z || 0) - predZ) < 0.5 && r.zone === currentActiveRoom.zone;
            }) || null;

            if (!targetId) {
                const preloadedMatchVnum = Object.keys(preloadedCoordsRef.current).find(vnum => {
                    const p = preloadedCoordsRef.current[vnum];
                    return Math.round(p[0]) === predX && Math.round(p[1]) === predY && Math.abs(Math.round(p[2] || 0) - predZ) < 0.5 && p[9] === currentActiveRoom.zone;
                });
                if (preloadedMatchVnum) {
                    targetId = `m_${preloadedMatchVnum}`;
                    matchedInternalId = preloadedMatchVnum;
                    ghostData = preloadedCoordsRef.current[preloadedMatchVnum];
                    discoverySource = 'DARK_PRELOADED_MATCH';
                }
            }
        }

        if (matchedInternalId) {
            targetId = `m_${matchedInternalId}`;
        }

        // Logic to finalize ghost/target resolution...
        // Ensure the room we are in is ALWAYS marked as explored if it's a static map room
        if (targetId && targetId.startsWith('m_')) {
            const vnum = targetId.substring(2);
            if (!exploredRef.current.has(vnum)) {
                // Mutate in place (O(1)) instead of cloning the whole set every step.
                // The renderer reads exploredRef.current directly, so triggerRender()
                // surfaces the new room immediately; React state + persistence only need
                // the change eventually, so we debounce a single cloned sync per burst.
                exploredRef.current.add(vnum);
                if (firstExploredAtRef.current[vnum] === undefined) {
                    firstExploredAtRef.current[vnum] = now;
                    firstExploredAtRef.current['_latest'] = now;
                }
                triggerRender?.();
                if (exploredSyncTimerRef.current !== null) {
                    clearTimeout(exploredSyncTimerRef.current);
                }
                exploredSyncTimerRef.current = setTimeout(() => {
                    exploredSyncTimerRef.current = null;
                    // One clone hands React/persistence a fresh reference to observe.
                    setExploredVnums(new Set(exploredRef.current));
                }, 1000);
                const roomLoadFlags = preloadedCoordsRef.current[vnum]?.[8] as string[] | undefined;
                const roomMobFlags = preloadedCoordsRef.current[vnum]?.[7] as string[] | undefined;
                const hasLoadFlags = roomLoadFlags && roomLoadFlags.length > 0;
                const hasMobFlags = roomMobFlags && roomMobFlags.length > 0;
                if (hasLoadFlags || hasMobFlags) {
                    onFirstVisitLoadFlag?.(targetId!);
                }
            }
        }
        if (!targetId && isVnumZero) {
            onRoomInfoProcessed?.(null);
            return;
        }
        // Play mode (edit off): we exhausted every way to match this event to a room that
        // already exists in the preloaded base map. Creating a fresh room here is exactly
        // what stamped phantom rooms — and full-wall boxes — on top of the Nazgûm map.
        // Bail and leave the player where they are; only map edit mode may map new rooms.
        if (!targetId && isScoutObservation) return;
        if (!targetId && !mapEditMode) {
            onRoomInfoProcessed?.(null);
            return;
        }
        if (!targetId) targetId = generateId();

        // --- Move Echo Logic (Always triggered if move was intended) ---
        if (!isSpectateUpdate && showDebugEchoes && (dirUsed || discoverySource || isLikelyMove)) {
            const gmcpDisplay = isVnumZero ? 'DARK/0' : gmcpId;
            const debugMsg = `[Mapper] Move: ${dirUsed || 'Snap'} -> Pred: ${predX},${predY},${predZ} | GMCP: ${gmcpDisplay}${discoverySource ? ` (By ${discoverySource})` : ''} | Target: ${targetId.includes('ghost') || targetId.includes('-') ? 'NEW' : 'MATCHED'}`;
            addMessage?.('system', debugMsg);
        }

        const observation = applyRoomInfoObservation(props, data, { ...resolved, targetId, ghostData, matchedInternalId, discoverySource, predX, predY, predZ });
        if (!observation) return;
        const { newRooms, topologyChanged } = observation;

        // Apply topology changes to state
        if (topologyChanged) {
            roomsRef.current = newRooms; // Sync ref immediately to prevent race conditions on fast updates
            setRooms(newRooms);
        }

        // Update the current room ID state if it changed
        const isUpdateForActiveView = !isScoutObservation
            && ((isSpectateUpdate && activeView === 'target') || (!isSpectateUpdate && activeView === 'self'));
        const roomChanged = isUpdateForActiveView && targetId !== activeRoomId;
        
        if (roomChanged) {
            setCurrentRoomId(targetId);
        }

        // Clear deathRoomId if we just entered the room where we died
        if (!isSpectateUpdate && targetId && deathRoomId && targetId === deathRoomId && setDeathRoomId) {
            setDeathRoomId(null);
            if (showDebugEchoes) addMessage?.('system', `[Mapper] Death room highlight cleared.`);
        }

        // Update the current room reference immediately for canvas consumption
        if (isUpdateForActiveView) {
            currentRoomIdRef.current = targetId;
        }
        
        // Always trigger a render update for the map canvas if anything changed
        if (topologyChanged || roomChanged) {
            triggerRender?.();
        }

        // Clear the pre-move that was set by handleMoveConfirmed
        if (!isSpectateUpdate && !isScoutObservation) {
            onRoomInfoProcessed?.(targetId);
        }

        // Look-ahead: if there are still pending moves after this confirmation, immediately
        // predict the next room so the map never goes blank between rapid GMCP packets.
        if (!isSpectateUpdate && preMoveRef && isLikelyMove && pendingMovesRef.current.length > 0 && targetId) {
            const nextDir = pendingMovesRef.current[0].dir;
            const arrivedRoom = newRooms[targetId];
            if (arrivedRoom) {
                let nextTargetId: string | null = null;

                // Check arrived room's known exits first
                const nextExit = arrivedRoom.exits?.[nextDir];
                if (nextExit?.target) {
                    nextTargetId = nextExit.target;
                } else if (nextExit?.gmcpDestId) {
                    const mappedDestination = serverIdIndexRef.current[String(nextExit.gmcpDestId)];
                    if (mappedDestination) nextTargetId = `m_${mappedDestination}`;
                }

                // Fallback: consult preloaded ArdaMap exits
                if (!nextTargetId && arrivedRoom.id.startsWith('m_')) {
                    const vnum = arrivedRoom.id.substring(2);
                    const ardaData = preloadedCoordsRef.current[vnum];
                    if (ardaData?.[4]?.[nextDir]) {
                        nextTargetId = `m_${getExitTargetId(ardaData[4][nextDir])}`;
                    }
                }

                if (nextTargetId) {
                    preMoveRef.current = { dir: nextDir, targetId: nextTargetId, time: Date.now() };
                    // No triggerRender here — the animation loop is already running from the
                    // currentRoomId state change above, and it reads preMoveRef directly as a ref.
                }
            }
        }
    }, [roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, firstExploredAtRef, triggerRender, onRoomInfoProcessed, onFirstVisitLoadFlag, onMoveConfirmed, addMessage, showDebugEchoes, preMoveRef, activeView, mapEditMode]);

    return { handleRoomInfo };
};
