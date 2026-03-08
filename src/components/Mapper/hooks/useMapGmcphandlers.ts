import { useCallback } from 'react';
import { MapperRoom, GmcpRoomInfo } from '../mapperTypes';
import { GRID_SIZE, DIRS, normalizeTerrain, generateId } from '../mapperUtils';
import { useRoomInfoHandler } from './useRoomInfoHandler';
import { useUpdateExitsHandler } from './useUpdateExitsHandler';
import { useTerrainHandler } from './useTerrainHandler';

interface UseMapGmcphandlersProps {
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    pendingMovesRef: React.MutableRefObject<{ dir: string; time: number }[]>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    discoverySourceRef: React.MutableRefObject<string | null>;
    exploredRef: React.MutableRefObject<Set<string>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    addMessage?: (type: string, msg: string) => void;
    showDebugEchoes?: boolean;
}

export const useMapGmcphandlers = (props: UseMapGmcphandlersProps) => {

    const handleRoomInfo = useCallback((data: GmcpRoomInfo) => {
        const { roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef, nameIndexRef, serverIdIndexRef, discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage, showDebugEchoes } = props;

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
            // 1. Direct Server ID Match (via Index)
            const fastServerMatch = serverIdIndexRef.current[gmcpIdStr];
            if (fastServerMatch) {
                matchedInternalId = fastServerMatch;
                ghostData = preloadedCoordsRef.current[matchedInternalId];
                discoverySource = 'EXACT_VNUM';
            } else {
                // 2. Fallback to Name + Distance Fingerprint (via Name Index)
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
            // Case A: Exact Match from MM2
            predX = ghostData[0];
            predY = ghostData[1];
            predZ = ghostData[2];
            // Indices 7 and 8 are mobFlags and loadFlags
        } else if (currentActiveRoom && dirUsed) {
            // Case B: Relative Fallback using simple offsets
            const d = DIRS[dirUsed];
            if (d) {
                predX += (d.dx || 0) * 1;
                predY += (d.dy || 0) * 1;
                predZ += (d.dz || 0) * 1;
            }
        }

        // 4. Ultimate Inference: Use the new room's exits to find the path back to the old room
        if (!dirUsed && !discoverySource && currentActiveRoom) {
            if (data.exits) {
                for (const d in data.exits) {
                    const ex = (data.exits as any)[d];
                    const exObj = typeof ex === 'object' ? ex : null;
                    const destId = exObj ? (exObj as any).id : (typeof ex === 'number' ? ex : null);
                    if (destId && String(destId) === String(currentActiveRoom.gmcpId)) {
                        const oppDir = Object.keys(DIRS).find(key => DIRS[key].opp === d);
                        if (oppDir) {
                            dirUsed = oppDir;
                            discoverySource = 'EXIT_INFERENCE';
                            predX = currentActiveRoom.x + (DIRS[oppDir].dx || 0);
                            predY = currentActiveRoom.y + (DIRS[oppDir].dy || 0);
                            predZ = (currentActiveRoom.z || 0) + (DIRS[oppDir].dz || 0);
                            break;
                        }
                    }
                }
            }
        }

        discoverySourceRef.current = discoverySource;
        if (dirUsed || discoverySource) {
            if (showDebugEchoes) {
                const debugStr = discoverySource === 'EXIT_INFERENCE' ? `Inferred ${dirUsed} from back-link` : (discoverySource || 'Move tracked');
                const debugMsg = `[Mapper] ${debugStr} -> Pred: ${predX.toFixed(1)},${predY.toFixed(1)},${predZ} | GMCP: ${gmcpId} | Target: ${targetId ? 'MATCHED' : 'NEW'}`;
                addMessage?.('system', debugMsg);
            }
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
                    exits: {}, notes: "",
                    mobFlags: ghostData ? ghostData[7] : [],
                    loadFlags: ghostData ? ghostData[8] : [],
                    createdAt: Date.now()
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
                newRooms[targetId!] = {
                    ...existingRoom,
                    gmcpId: Number(gmcpId) || 0,
                    name, desc, zone,
                    terrain: finalTerrain,
                    mobFlags: ghostData ? ghostData[7] : existingRoom.mobFlags || [],
                    loadFlags: ghostData ? ghostData[8] : existingRoom.loadFlags || []
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

            // 1. Foundation: Start with exits from the preloaded Master Map (Ardagmcp)
            const updatedExits: Record<string, any> = {};
            if (ghostData && ghostData[4]) {
                const masterExits = ghostData[4];
                for (const d in (masterExits as any)) {
                    let dirKey = d.toLowerCase();
                    if (dirKey === 'north') dirKey = 'n'; else if (dirKey === 'south') dirKey = 's';
                    else if (dirKey === 'east') dirKey = 'e'; else if (dirKey === 'west') dirKey = 'w';
                    else if (dirKey === 'up') dirKey = 'u'; else if (dirKey === 'down') dirKey = 'd';
                    else if (dirKey === 'northeast') dirKey = 'ne'; else if (dirKey === 'northwest') dirKey = 'nw';
                    else if (dirKey === 'southeast') dirKey = 'se'; else if (dirKey === 'southwest') dirKey = 'sw';

                    const mEx = (masterExits as any)[d];
                    const mDestId = typeof mEx === 'number' ? mEx : (mEx.id || mEx.target);
                    if (mDestId) {
                        updatedExits[dirKey] = {
                            target: `m_${mDestId}`,
                            gmcpDestId: Number(mDestId),
                            hasDoor: !!mEx.hasDoor,
                            flags: mEx.flags || [],
                            closed: false
                        };
                    }
                }
            } else if (existingRoom) {
                // Fallback to existing exits if no master data
                Object.assign(updatedExits, existingRoom.exits);
            }

            // 2. Overlay: Apply GMCP Room.Info exits if present
            if (data.exits) {
                for (const dir in data.exits) {
                    const gmcpExit = data.exits[dir];
                    if (gmcpExit === false) { delete updatedExits[dir]; continue; }
                    
                    const gmcpDestId = typeof gmcpExit === 'number' ? gmcpExit : gmcpExit.id;
                    let exName = undefined, exFlags = undefined;
                    if (typeof gmcpExit === 'object') { exName = gmcpExit.name; exFlags = gmcpExit.flags; }

                    const exFlagsLow = (exFlags || []).map((f: any) => String(f).toLowerCase());
                    const isClosed = exFlagsLow.includes('closed') || exFlagsLow.includes('locked');
                    const hasName = !!exName && exName.trim().length > 0;
                    const isDoorLive = (typeof gmcpExit === 'object' && ((gmcpExit as any).door || hasName)) || isClosed;

                    // Ultimate Source of Truth: Ardagmcp / master map door status
                    const wasDoorMaster = !!updatedExits[dir]?.hasDoor;

                    updatedExits[dir] = {
                        ...updatedExits[dir],
                        gmcpDestId: gmcpDestId || updatedExits[dir]?.gmcpDestId,
                        name: exName || updatedExits[dir]?.name,
                        flags: exFlags || (updatedExits[dir]?.flags || []),
                        closed: isClosed,
                        hasDoor: wasDoorMaster || isDoorLive
                    };

                    if (!updatedExits[dir].target && gmcpDestId) {
                        if (preloadedCoordsRef.current[String(gmcpDestId)]) updatedExits[dir].target = `m_${gmcpDestId}`;
                        else updatedExits[dir].target = Object.keys(newRooms).find(key => String(newRooms[key].gmcpId) === String(gmcpDestId))!;
                    }
                }
            }
            newRooms[targetId!] = { ...(newRooms[targetId!] || existingRoom), exits: updatedExits };

            return newRooms;
        });

        setCurrentRoomId(targetId);
        currentRoomIdRef.current = targetId;
    }, [props]);

    const handleUpdateExits = useCallback((data: any) => {
        const { currentRoomIdRef, setRooms, preloadedCoordsRef } = props;
        const activeId = currentRoomIdRef.current;
        if (!activeId) return;

        const exitUpdates = data.exits || data;

        setRooms(prev => {
            const activeRoom = prev[activeId];
            if (!activeRoom) return prev;

            // Create a fresh copy of the whole rooms collection to avoid mutation bugs
            const nextRooms = { ...prev };
            const newExits = { ...activeRoom.exits };

            for (const dir in exitUpdates) {
                const update = exitUpdates[dir];
                if (update === false) delete newExits[dir];
                else {
                    const gmcpDestId = typeof update === 'number' ? update : (update.id || newExits[dir]?.gmcpDestId);
                    let name = typeof update === 'object' ? update.name : undefined;
                    let flags = typeof update === 'object' ? (update.flags || []) : undefined;

                    const nextFlags = (typeof update === 'object') ? (flags || []) : (newExits[dir]?.flags || []);
                    const exFlagsLow = nextFlags.map(f => f.toLowerCase());
                    const isClosed = exFlagsLow.includes('closed') || exFlagsLow.includes('locked');
                    
                    // Respect Ardagmcp source of truth for "hasDoor"
                    let hasDoor = !!newExits[dir]?.hasDoor;
                    if (!hasDoor) {
                        // Check master map if not already known
                        const rId = activeRoom.gmcpId || activeId;
                        const rIdStr = String(rId);
                        const vId = rIdStr.startsWith('m_') ? rIdStr.substring(2) : rIdStr;
                        const mData = preloadedCoordsRef.current[vId];
                        const mEx = mData?.[4]?.[dir];
                        if (mEx?.hasDoor) hasDoor = true;
                    }
                    // Also respect if live update says it's a door or closed
                    const nameVal = name || newExits[dir]?.name;
                    const hasName = !!nameVal && String(nameVal).trim().length > 0;
                                      
                    if (isClosed || (typeof update === 'object' && (update.door || hasName))) hasDoor = true;

                    newExits[dir] = {
                        ...newExits[dir],
                        name: name || newExits[dir]?.name,
                        flags: nextFlags,
                        gmcpDestId,
                        closed: isClosed,
                        hasDoor: hasDoor
                    };

                    // --- SYMMETRIC UPDATE: Update neighbor's counter-exit if we know it ---
                    const targetId = newExits[dir]?.target;
                    const neighborId = targetId || (gmcpDestId ? (preloadedCoordsRef.current[String(gmcpDestId)] ? `m_${gmcpDestId}` : Object.keys(nextRooms).find(k => String(nextRooms[k].gmcpId) === String(gmcpDestId))) : null);

                    if (neighborId && nextRooms[neighborId]) {
                        const neighbor = nextRooms[neighborId];
                        const oppDir = DIRS[dir]?.opp;
                        if (oppDir) {
                            const neighborEx = neighbor.exits[oppDir];
                            if (neighborEx && (neighborEx.hasDoor || hasDoor)) {
                                nextRooms[neighborId] = {
                                    ...neighbor,
                                    exits: {
                                        ...neighbor.exits,
                                        [oppDir]: {
                                            ...neighborEx,
                                            closed: isClosed,
                                            hasDoor: true,
                                            flags: nextFlags
                                        }
                                    }
                                };
                            }
                        }
                    }
                }
            }

            nextRooms[activeId] = { ...activeRoom, exits: newExits };
            return nextRooms;
        });
    }, [props]);

    const handleTerrain = useCallback((t: string) => {
        const { currentRoomIdRef, setRooms, lastDetectedTerrainRef } = props;
        const terrain = normalizeTerrain(t);
        lastDetectedTerrainRef.current = terrain;
        if (currentRoomIdRef.current) {
            const activeId = currentRoomIdRef.current;
            setRooms(prev => (prev[activeId] && prev[activeId].terrain !== terrain) ? { ...prev, [activeId]: { ...prev[activeId], terrain } } : prev);
        }
    }, [props]);

    return { handleRoomInfo, handleUpdateExits, handleTerrain };
};