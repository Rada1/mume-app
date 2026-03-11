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

        if (gmcpId === undefined || gmcpId === null) return;

        const activeRoomId = currentRoomIdRef.current;
        const currentActiveRoom = activeRoomId ? roomsRef.current[activeRoomId] : null;

        const now = Date.now();
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) {
            pendingMovesRef.current.shift();
        }

        let dirUsed: string | null = null;
        const nextMove = pendingMovesRef.current.shift();
        if (nextMove) {
            dirUsed = nextMove.dir;
        } else if (!activeRoomId || !currentActiveRoom || currentActiveRoom.gmcpId != gmcpId) {
            if (currentActiveRoom && currentActiveRoom.exits) {
                const foundDir = Object.keys(currentActiveRoom.exits).find(d => {
                    const ex = currentActiveRoom.exits[d];
                    return ex && ex.gmcpDestId == gmcpId;
                });
                if (foundDir) dirUsed = foundDir;
            }
        }

        const isVnumZero = String(gmcpId) === '0' || String(gmcpId) === 'null' || !gmcpId;
        let ghostData: any = null;
        let matchedInternalId: string | null = null;
        let discoverySource: string | null = null;

        if (!isVnumZero) {
            const gmcpIdStr = String(gmcpId);
            const fastServerMatch = serverIdIndexRef.current[gmcpIdStr];
            if (fastServerMatch) {
                matchedInternalId = fastServerMatch;
                ghostData = preloadedCoordsRef.current[matchedInternalId];
                discoverySource = 'EXACT_VNUM';
            } else {
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
                    if (ghostData) discoverySource = 'FINGERPRINT';
                }
            }
        }

        let targetId = null;
        if (!isVnumZero) {
            targetId = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId)) || null;
        }

        let predX = currentActiveRoom ? currentActiveRoom.x : 0;
        let predY = currentActiveRoom ? currentActiveRoom.y : 0;
        let predZ = currentActiveRoom ? (currentActiveRoom.z || 0) : 0;

        if (ghostData) {
            predX = ghostData[0]; predY = ghostData[1]; predZ = ghostData[2];
        } else if (currentActiveRoom && dirUsed) {
            const d = DIRS[dirUsed];
            if (d) { predX += (d.dx || 0) * 1; predY += (d.dy || 0) * 1; predZ += (d.dz || 0) * 1; }
        }

        discoverySourceRef.current = discoverySource;
        if (dirUsed || discoverySource) {
            if (showDebugEchoes) {
                const debugMsg = `[Mapper] Move: ${dirUsed || 'Snap'} -> Pred: ${predX},${predY},${predZ} | GMCP: ${gmcpId}${discoverySource ? ` (Auto-Snap by ${discoverySource})` : ''} | Target: ${targetId ? 'MATCHED' : 'NEW'}`;
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
            if (!exploredRef.current.has(matchedInternalId)) {
                if (firstExploredAtRef.current[matchedInternalId] === undefined) {
                    firstExploredAtRef.current[matchedInternalId] = now;
                    firstExploredAtRef.current['_latest'] = now;
                }
                setExploredVnums(prev => {
                    const next = new Set(prev);
                    next.add(matchedInternalId!);
                    exploredRef.current = next;
                    return next;
                });
                triggerRender?.();
            }
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

        // Update the current room reference immediately for canvas consumption
        currentRoomIdRef.current = targetId;
        onRoomInfoProcessed?.();
    }, [roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, firstExploredAtRef, triggerRender, onRoomInfoProcessed, addMessage, showDebugEchoes]);

    return { handleRoomInfo };
};