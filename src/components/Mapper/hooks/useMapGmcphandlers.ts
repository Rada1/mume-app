import { useCallback } from 'react';
import { GmcpRoomInfo, GmcpExitInfo } from '../../../types';
import { MapperRoom } from '../mapperTypes';
import { generateId, normalizeTerrain, DIRS } from '../mapperUtils';

interface UseMapGmcphandlersProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    pendingMovesRef: React.MutableRefObject<{ dir: string; time: number }[]>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, string | number>, string, string]>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    addMessage?: (type: string, msg: string) => void;
}

export const useMapGmcphandlers = ({
    roomsRef, setRooms,
    currentRoomIdRef, setCurrentRoomId,
    pendingMovesRef,
    preloadedCoordsRef,
    discoverySourceRef,
    exploredRef, setExploredVnums,
    lastDetectedTerrainRef,
    addMessage
}: UseMapGmcphandlersProps) => {

    const handleRoomInfo = useCallback((data: GmcpRoomInfo) => {
        let gmcpId = data.num !== undefined ? data.num : (data.vnum !== undefined ? data.vnum : data.id);
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
        const gmcpName = data.name || 'Unknown Room';

        // Spatial+Name Fingerprinting
        // .mm2 version 36 does not contain GMCP vnums, only internal IDs.
        // We match by GMCP Name first, then pick the geographically closest candidate.
        let ghostData: any = null;
        let matchedInternalId: string | null = null;
        let discoverySource: string | null = null;

        if (!isVnumZero) {
            // Check if we ALREADY mapped this GMCP vnum to an internal ID in previous moves
            const existingRoomKey = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId));

            if (existingRoomKey && existingRoomKey.startsWith('m_')) {
                // We've been here before
                matchedInternalId = existingRoomKey.substring(2);
                ghostData = preloadedCoordsRef.current[matchedInternalId];
                discoverySource = 'CACHE';
            } else {
                // We haven't been here. Search the MM2 dictionary by name.
                let minDist = Infinity;
                const currX = currentActiveRoom ? currentActiveRoom.x : 0;
                const currY = currentActiveRoom ? currentActiveRoom.y : 0;
                const currZ = currentActiveRoom ? (currentActiveRoom.z || 0) : 0;

                for (const [internalId, rData] of Object.entries(preloadedCoordsRef.current)) {
                    if (rData[5] === gmcpName) { // Index 5 is 'name'
                        const dist = Math.pow(rData[0] - currX, 2) + Math.pow(rData[1] - currY, 2) + Math.pow((rData[2] - currZ) * 5, 2);
                        if (dist < minDist) {
                            minDist = dist;
                            matchedInternalId = internalId;
                            ghostData = rData;
                        }
                    }
                }
                if (ghostData) {
                    discoverySource = 'FINGERPRINT';
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
            // Case A: Exact Match from MM2
            predX = ghostData[0];
            predY = ghostData[1];
            predZ = ghostData[2];
        } else if (currentActiveRoom && dirUsed) {
            // Case B: Relative Fallback using simple offsets
            const d = DIRS[dirUsed];
            if (d) {
                predX += (d.dx || 0) * 10;
                predY += (d.dy || 0) * 10;
                predZ += (d.dz || 0) * 1;
            }
        }

        discoverySourceRef.current = discoverySource;
        if (dirUsed || discoverySource) {
            const debugMsg = `[Mapper] Move: ${dirUsed || 'Snap'} -> Pred: ${predX},${predY},${predZ} | GMCP: ${gmcpId}${discoverySource ? ` (Auto-Snap by ${discoverySource})` : ''} | Target: ${targetId ? 'MATCHED' : 'NEW'}`;
            addMessage?.('system', debugMsg);
        }

        const name = data.name || 'Unknown Room';
        const desc = data.desc || '';
        const zone = data.area || data.zone || 'Unknown Zone';
        const freshTerrain = normalizeTerrain(data.terrain || data.environment || null);

        if (ghostData && matchedInternalId) {
            targetId = `m_${matchedInternalId}`;
            if (!exploredRef.current.has(matchedInternalId)) {
                setExploredVnums(prev => {
                    const next = new Set(prev);
                    next.add(matchedInternalId!);
                    return next;
                });
            }
        }

        if (!targetId) targetId = generateId();

        setRooms(prevRooms => {
            const newRooms = { ...prevRooms };
            const existingRoom = newRooms[targetId!];

            if (!existingRoom) {
                let nx = predX, ny = predY, nz = predZ;
                if (ghostData) [nx, ny, nz] = ghostData;
                else if (!currentActiveRoom && !ghostData) { nx = 0; ny = 0; nz = 0; }

                const newRoom: MapperRoom = {
                    id: targetId!, gmcpId: Number(gmcpId) || 0, name, desc,
                    x: nx, y: ny, z: nz,
                    zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain',
                    exits: {}, notes: "", createdAt: Date.now()
                };
                newRooms[targetId!] = newRoom;

                if (currentActiveRoom && dirUsed) {
                    newRooms[currentActiveRoom.id] = {
                        ...currentActiveRoom,
                        exits: { ...currentActiveRoom.exits, [dirUsed]: { ...currentActiveRoom.exits[dirUsed], target: targetId!, gmcpDestId: Number(gmcpId) || 0, closed: false } }
                    };
                    const d = DIRS[dirUsed];
                    if (d && d.opp) newRooms[targetId!].exits[d.opp] = { ...newRooms[targetId!].exits[d.opp], target: currentActiveRoom.id, closed: false };
                }
            } else {
                const finalTerrain = (data.terrain || data.environment) ? normalizeTerrain(data.terrain || data.environment) : existingRoom.terrain;
                newRooms[targetId!] = { ...existingRoom, gmcpId: Number(gmcpId) || 0, name, desc, zone, terrain: finalTerrain };
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

            if (data.exits) {
                const room = newRooms[targetId!];
                const updatedExits = { ...room.exits };
                for (const dir in data.exits) {
                    const gmcpExit = data.exits[dir];
                    if (gmcpExit === false) { delete updatedExits[dir]; continue; }
                    const gmcpDestId = typeof gmcpExit === 'number' ? gmcpExit : gmcpExit.id;
                    let exName = undefined, exFlags = undefined;
                    if (typeof gmcpExit === 'object') { exName = gmcpExit.name; exFlags = gmcpExit.flags; }

                    let internalTarget = updatedExits[dir]?.target;
                    if (!internalTarget && gmcpDestId) {
                        if (preloadedCoordsRef.current[String(gmcpDestId)]) internalTarget = `m_${gmcpDestId}`;
                        else internalTarget = Object.keys(newRooms).find(key => String(newRooms[key].gmcpId) === String(gmcpDestId)) || undefined;
                    }
                    updatedExits[dir] = { ...updatedExits[dir], target: internalTarget!, gmcpDestId, name: exName, flags: exFlags, closed: exFlags?.includes('closed') || false };
                }
                newRooms[targetId!] = { ...room, exits: updatedExits };
            }
            return newRooms;
        });

        setCurrentRoomId(targetId);
        currentRoomIdRef.current = targetId;
    }, [roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage]);

    const handleUpdateExits = useCallback((data: Record<string, GmcpExitInfo | number | false>) => {
        const activeId = currentRoomIdRef.current;
        if (!activeId) return;
        setRooms(prev => {
            const room = prev[activeId];
            if (!room) return prev;
            const newExits = { ...room.exits };
            for (const dir in data) {
                const update = data[dir];
                if (update === false) delete newExits[dir];
                else {
                    const gmcpDestId = typeof update === 'number' ? update : (update.id || newExits[dir]?.gmcpDestId);
                    let name = typeof update === 'object' ? update.name : undefined;
                    let flags = typeof update === 'object' ? update.flags : undefined;
                    newExits[dir] = { ...newExits[dir], name: name || newExits[dir]?.name, flags: flags || (typeof update === 'number' ? undefined : newExits[dir]?.flags), gmcpDestId, closed: flags?.includes('closed') || false };
                }
            }
            return { ...prev, [activeId]: { ...room, exits: newExits } };
        });
    }, [currentRoomIdRef, setRooms]);

    const handleTerrain = useCallback((t: string) => {
        const terrain = normalizeTerrain(t);
        lastDetectedTerrainRef.current = terrain;
        if (currentRoomIdRef.current) {
            const activeId = currentRoomIdRef.current;
            setRooms(prev => (prev[activeId] && prev[activeId].terrain !== terrain) ? { ...prev, [activeId]: { ...prev[activeId], terrain } } : prev);
        }
    }, [currentRoomIdRef, setRooms, lastDetectedTerrainRef]);

    return { handleRoomInfo, handleUpdateExits, handleTerrain };
};
