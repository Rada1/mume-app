import { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { GmcpRoomInfo, GmcpExitInfo } from '../../types';
import { MapperRoom, MapperMarker } from '../Mapper/mapperTypes';
import { generateId, normalizeTerrain, DIRS, GRID_SIZE } from '../Mapper/mapperUtils';
import { useGame } from '../../context/GameContext';

interface ControllerProps {
    characterName: string | null;
    ref: React.Ref<any>;
}

export const useMapperController = (characterName: string | null, ref: React.Ref<any>) => {
    const { addMessage, executeCommand } = useGame();
    const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
    const [markers, setMarkers] = useState<Record<string, MapperMarker>>({});
    const [exploredVnums, setExploredVnums] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('mume_mapper_explored');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const currentRoomIdRef = useRef<string | null>(null);
    const [allowPersistence, setAllowPersistence] = useState(() => localStorage.getItem('mume_mapper_persistence') !== 'false');
    const [unveilMap, setUnveilMap] = useState(() => localStorage.getItem('mume_mapper_unveil') === 'true');

    const roomsRef = useRef(rooms);
    const markersRef = useRef(markers);
    const exploredRef = useRef(exploredVnums);

    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { markersRef.current = markers; }, [markers]);
    useEffect(() => { exploredRef.current = exploredVnums; }, [exploredVnums]);

    const pendingMovesRef = useRef<{ dir: string, time: number }[]>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const preloadedCoordsRef = useRef<Record<string, [number, number, number, number, Record<string, string | number>, string, string]>>({});
    const spatialIndexRef = useRef<Record<number, Record<string, string[]>>>({});
    const discoverySourceRef = useRef<string | null>(null);

    useEffect(() => {
        fetch('/mume_map_data.json?v=' + Date.now())
            .then(res => {
                if (!res.ok) throw new Error('No preloaded map data');
                return res.json();
            })
            .then(data => {
                preloadedCoordsRef.current = data;

                // Build Spatial Index (Grid-based bucket)
                const index: Record<number, Record<string, string[]>> = {};
                for (const vnum in data) {
                    const [x, y, z] = data[vnum];
                    const floor = Math.round(z);
                    if (!index[floor]) index[floor] = {};

                    // Use a large bucket size (e.g. 5x5 rooms) to minimize bucket lookups while culling effectively
                    const bucketX = Math.floor(x / 5);
                    const bucketY = Math.floor(y / 5);
                    const key = `${bucketX},${bucketY}`;
                    if (!index[floor][key]) index[floor][key] = [];
                    index[floor][key].push(vnum);
                }
                spatialIndexRef.current = index;

                addMessage?.('system', `[Mapper] Unified Master Map Loaded: ${Object.keys(data).length} rooms.`);
            })
            .catch(() => { /* No file, that's fine */ });
    }, [addMessage]);

    const memoizedName = (characterName || 'default').replace(/^\{FULLNAME:/i, '').replace(/\}$/, '').toLowerCase();
    const storageKey = `mume_mapper_data_${memoizedName}`;
    const markerStorageKey = `mume_mapper_markers_${memoizedName}`;
    const posStorageKey = `mume_mapper_pos_${memoizedName}`;

    // Persistence Loading
    useEffect(() => {
        const savedRooms = localStorage.getItem(storageKey);
        if (savedRooms) try { setRooms(JSON.parse(savedRooms)); } catch (e) { }
        const savedMarkers = localStorage.getItem(markerStorageKey);
        if (savedMarkers) try { setMarkers(JSON.parse(savedMarkers)); } catch (e) { }
        const savedPos = localStorage.getItem(posStorageKey);
        if (savedPos) {
            try {
                const { roomId, camX, camY, zoom } = JSON.parse(savedPos);
                if (roomId) { setCurrentRoomId(roomId); currentRoomIdRef.current = roomId; }
                if (camX !== undefined) cameraRef.current.x = camX;
                if (camY !== undefined) cameraRef.current.y = camY;
                if (zoom !== undefined) cameraRef.current.zoom = zoom;
            } catch (e) { }
        }
    }, [storageKey, markerStorageKey, posStorageKey]);

    // Persistence Saving
    useEffect(() => {
        if (!allowPersistence) return;
        localStorage.setItem(storageKey, JSON.stringify(rooms));
        localStorage.setItem(markerStorageKey, JSON.stringify(markers));
        localStorage.setItem('mume_mapper_explored', JSON.stringify(Array.from(exploredVnums)));
        localStorage.setItem(posStorageKey, JSON.stringify({
            roomId: currentRoomId,
            camX: cameraRef.current.x,
            camY: cameraRef.current.y,
            zoom: cameraRef.current.zoom
        }));
        localStorage.setItem('mume_mapper_unveil', String(unveilMap));
    }, [rooms, markers, exploredVnums, currentRoomId, allowPersistence, storageKey, markerStorageKey, posStorageKey, unveilMap]);

    const handleRoomInfo = useCallback((data: GmcpRoomInfo) => {
        // MUME prefers 'num' or 'vnum' for the specific room ID. We stringify to match our JSON keys.
        let gmcpId = data.num !== undefined ? data.num : (data.vnum !== undefined ? data.vnum : data.id);
        if (gmcpId === undefined || gmcpId === null) return;

        const activeRoomId = currentRoomIdRef.current;
        const currentActiveRoom = activeRoomId ? roomsRef.current[activeRoomId] : null;

        const now = Date.now();
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) {
            pendingMovesRef.current.shift();
        }

        let dirUsed: string | null = null;
        // CRITICAL FIX: Pop the move if we have one, even if the gmcpId hasn't "changed" according to the check,
        // because in MUME multiple rooms share ID 0.
        const nextMove = pendingMovesRef.current.shift();
        if (nextMove) {
            dirUsed = nextMove.dir;
        } else if (!activeRoomId || !currentActiveRoom || currentActiveRoom.gmcpId != gmcpId) {
            // Fallback to exit matching if no manual move was recorded
            if (currentActiveRoom && currentActiveRoom.exits) {
                const foundDir = Object.keys(currentActiveRoom.exits).find(d => {
                    const ex = currentActiveRoom.exits[d];
                    return ex && ex.gmcpDestId == gmcpId;
                });
                if (foundDir) dirUsed = foundDir;
            }
        }

        // PREDICT POSITIONS: Calculate where we SHOULD be before finding targetId
        let predX = currentActiveRoom ? Math.round(currentActiveRoom.x) : 0;
        let predY = currentActiveRoom ? Math.round(currentActiveRoom.y) : 0;
        let predZ = currentActiveRoom ? (currentActiveRoom.z || 0) : 0;

        if (currentActiveRoom && dirUsed) {
            const d = DIRS[dirUsed];
            if (d) {
                predX += (d.dx || 0);
                predY += (d.dy || 0);
                predZ += (d.dz || 0);
            }
        }

        const isVnumZero = String(gmcpId) === '0' || String(gmcpId) === 'null' || !gmcpId;

        // GHOST DISCOVERY: 
        // 1. Try to find by VNUM first
        let ghostData = preloadedCoordsRef.current[String(gmcpId)];
        let discoverySource = ghostData ? 'VNUM' : null;

        // 2. If no VNUM match, try to find by predicted coordinates (if we have an active room)
        if (!discoverySource && currentActiveRoom) {
            const predRoundedX = Math.round(predX);
            const predRoundedY = Math.round(predY);
            const predRoundedZ = Math.round(predZ);

            for (const vnum in preloadedCoordsRef.current) {
                const ghost = preloadedCoordsRef.current[vnum];
                if (Math.round(ghost[0]) === predRoundedX && Math.round(ghost[1]) === predRoundedY && Math.abs(ghost[2] - predRoundedZ) < 0.5) {
                    ghostData = ghost;
                    discoverySource = 'COORDS';
                    break;
                }
            }
        }

        // 3. FINGERPRINT MATCHING: If still not found, try to match by name and exits (Automatic Initial Sync)
        if (!discoverySource && data.name) {
            const gmcpExits = data.exits ? Object.keys(data.exits).sort().join(',') : '';
            const normalizedName = data.name.trim().toLowerCase();

            // To avoid flickers to far-away rooms with the same name, we prioritize close rooms.
            let bestGhost = null;
            let minDistance = Infinity;

            for (const vnum in preloadedCoordsRef.current) {
                const ghost = preloadedCoordsRef.current[vnum];
                const ghostName = String(ghost[5] || '').trim().toLowerCase();

                if (ghostName === normalizedName) {
                    const ghostExits = ghost[4] ? Object.keys(ghost[4]).sort().join(',') : '';
                    if (ghostExits === gmcpExits) {
                        const dist = currentActiveRoom ? Math.hypot(ghost[0] - predX, ghost[1] - predY) : 0;

                        // If we are already anchored, only allow jumps within a reasonable distance (e.g., 20 rooms)
                        // to prevent "flickering" to a different continent with the same room name.
                        if (currentActiveRoom && dist > 20) continue;

                        if (dist < minDistance) {
                            minDistance = dist;
                            bestGhost = ghost;
                        }

                        // If we found a perfect location match or we aren't anchored yet, just take it.
                        if (dist < 1) break;
                    }
                }
            }
            if (bestGhost) {
                ghostData = bestGhost;
                discoverySource = 'FINGERPRINT';
            }
        }

        // TARGET MATCHING: Try to find an existing room in our local map
        let targetId = null;
        if (!isVnumZero) {
            // Find by VNUM
            targetId = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId)) || null;
        }

        if (!targetId) {
            // Find by predicted coordinates independently
            // If we found a ghost room, use its exact coordinates for the local search
            const searchX = ghostData ? ghostData[0] : predX;
            const searchY = ghostData ? ghostData[1] : predY;
            const searchZ = ghostData ? ghostData[2] : predZ;

            const predRoundedX = Math.round(searchX);
            const predRoundedY = Math.round(searchY);

            targetId = Object.keys(roomsRef.current).find(key => {
                const r = roomsRef.current[key];
                return Math.round(r.x) === predRoundedX && Math.round(r.y) === predRoundedY && Math.abs((r.z || 0) - searchZ) < 0.5;
            }) || null;
        }

        // DEBUG TELEMETRY
        discoverySourceRef.current = discoverySource;
        if (dirUsed || discoverySource) {
            const debugMsg = `[Mapper] Move: ${dirUsed || 'Snap'} -> Pred: ${predX},${predY},${predZ} | GMCP: ${gmcpId}${discoverySource ? ` (Auto-Snap by ${discoverySource})` : ''} | Target: ${targetId ? 'MATCHED' : 'NEW'}`;
            addMessage?.('system', debugMsg);
        }

        const name = data.name || 'Unknown Room';
        const desc = data.desc || '';
        const zone = data.area || data.zone || 'Unknown Zone';
        const freshTerrain = normalizeTerrain(data.terrain || data.environment || null);

        if (ghostData) {
            // Find the master VNUM. ghostData is [x, y, z, terrain, exits, name, masterId]
            // Actually our compiler stores it as room_coords[vnum] = [...]
            // So the 'vnum' is the master ID.
            let masterVnum = String(gmcpId);
            if (discoverySource === 'COORDS' || discoverySource === 'FINGERPRINT') {
                // Find which key in preloadedCoordsRef matches our ghostData
                const foundVnum = Object.keys(preloadedCoordsRef.current).find(k => preloadedCoordsRef.current[k] === ghostData);
                if (foundVnum) masterVnum = foundVnum;
            }

            targetId = `m_${masterVnum}`;
            if (!exploredRef.current.has(masterVnum)) {
                setExploredVnums(prev => {
                    const next = new Set(prev);
                    next.add(masterVnum);
                    return next;
                });
            }
        }

        if (!targetId) {
            targetId = generateId();
        }

        setRooms(prevRooms => {
            const newRooms = { ...prevRooms };
            const existingRoom = newRooms[targetId!];

            if (!existingRoom) {
                let nx = predX, ny = predY, nz = predZ;

                if (ghostData) {
                    [nx, ny, nz] = ghostData;
                } else if (!currentActiveRoom && !ghostData) {
                    nx = 0; ny = 0; nz = 0;
                }

                newRooms[targetId!] = {
                    id: targetId!, gmcpId: Number(gmcpId) || 0, name, desc,
                    x: nx, y: ny, z: nz,
                    zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain',
                    exits: {}, notes: "", createdAt: Date.now()
                };

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

                // AGGRESSIVE SNAP: Always snap to master map if available
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

                    // Master Map Link: If it's a known master room, link it automatically
                    if (!internalTarget && gmcpDestId) {
                        if (preloadedCoordsRef.current[String(gmcpDestId)]) {
                            internalTarget = `m_${gmcpDestId}`;
                        } else {
                            internalTarget = Object.keys(newRooms).find(key => String(newRooms[key].gmcpId) === String(gmcpDestId)) || undefined;
                        }
                    }
                    updatedExits[dir] = { ...updatedExits[dir], target: internalTarget!, gmcpDestId, name: exName, flags: exFlags, closed: exFlags?.includes('closed') || false };
                }
                newRooms[targetId!] = { ...room, exits: updatedExits };
            }
            return newRooms;
        });

        setCurrentRoomId(targetId);
        currentRoomIdRef.current = targetId;
        // The triggerRender in Mapper.tsx's useEffect will catch this change
    }, []);

    const handleAddRoom = useCallback((wx: number, wy: number, z: number) => {
        const id = generateId();
        const rx = Math.floor(wx / GRID_SIZE);
        const ry = Math.floor(wy / GRID_SIZE);
        setRooms(prev => ({
            ...prev,
            [id]: {
                id, gmcpId: 0, name: 'Manual Room', desc: '',
                x: rx, y: ry, z,
                zone: 'Manual Zone', terrain: lastDetectedTerrainRef.current || 'Field',
                exits: {}, notes: '', createdAt: Date.now()
            }
        }));
        return id;
    }, []);

    const handleDeleteRoom = useCallback((id: string) => {
        setRooms(prev => {
            const next = { ...prev };
            delete next[id];
            Object.keys(next).forEach(key => {
                const r = next[key];
                const newExits = { ...r.exits };
                let changed = false;
                Object.keys(newExits).forEach(dir => { if (newExits[dir].target === id) { delete newExits[dir]; changed = true; } });
                if (changed) next[key] = { ...r, exits: newExits };
            });
            return next;
        });
    }, []);

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
    }, []);

    const handleTerrain = useCallback((t: string) => {
        const terrain = normalizeTerrain(t);
        lastDetectedTerrainRef.current = terrain;
        if (currentRoomIdRef.current) {
            const activeId = currentRoomIdRef.current;
            setRooms(prev => (prev[activeId] && prev[activeId].terrain !== terrain) ? { ...prev, [activeId]: { ...prev[activeId], terrain } } : prev);
        }
    }, []);

    const handleClearMap = useCallback((silent = false) => {
        if (!silent && !window.confirm('Wipe ALL local map data, markers, and exploration history?')) return;
        setRooms({});
        setMarkers({});
        setExploredVnums(new Set());
        setCurrentRoomId(null);
        currentRoomIdRef.current = null;
        if (!silent) addMessage?.('system', '[Mapper] Local map data cleared.');
    }, [addMessage]);

    const handleResetAndSync = useCallback(() => {
        if (window.confirm('Wipe local map data and synchronize with MMapper global coordinates?')) {
            handleClearMap(true);
            addMessage?.('system', '[Mapper] Map reset. Snapshotting to MMapper global coordinates...');
            // Try to force a room info update
            setTimeout(() => {
                executeCommand?.('look');
            }, 100);
        }
    }, [handleClearMap, addMessage, executeCommand]);

    const handleSyncLocation = useCallback((wx: number, wy: number) => {
        if (!currentRoomIdRef.current) return;
        const activeId = currentRoomIdRef.current;
        setRooms(prev => {
            const next = { ...prev };
            const room = next[activeId];
            if (room) {
                const nx = Math.round(wx / GRID_SIZE);
                const ny = Math.round(wy / GRID_SIZE);

                let nz = room.z || 0;
                for (const vnum in preloadedCoordsRef.current) {
                    const p = preloadedCoordsRef.current[vnum];
                    if (Math.round(p[0]) === nx && Math.round(p[1]) === ny && Math.abs(p[2] - nz) <= 0.5) {
                        nz = p[2];
                        break;
                    }
                }

                next[activeId] = { ...room, x: nx, y: ny, z: nz };
            }
            return next;
        });
        addMessage?.('system', `[Mapper] Synced current room location to ghost map.`);
    }, [addMessage]);

    useImperativeHandle(ref, () => ({
        handleRoomInfo,
        handleAddRoom,
        handleDeleteRoom,
        handleUpdateExits,
        handleTerrain,
        handleResetAndSync,
        preloadedCoordsRef,
        discoverySourceRef,
        pushPendingMove: (dir: string) => pendingMovesRef.current.push({ dir, time: Date.now() }),
        handleMoveFailure: () => pendingMovesRef.current.shift()
    }), [handleRoomInfo, handleAddRoom, handleDeleteRoom, handleUpdateExits, handleTerrain, handleResetAndSync]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onInfo = (e: any) => handleRoomInfo(e.detail);
        const onExits = (e: any) => handleUpdateExits(e.detail);
        const onTerrain = (e: any) => handleTerrain(e.detail);
        const onPush = (e: any) => pendingMovesRef.current.push({ dir: e.detail, time: Date.now() });
        const onFail = () => pendingMovesRef.current.shift();

        window.addEventListener('mume-mapper-room-info', onInfo);
        window.addEventListener('mume-mapper-update-exits', onExits);
        window.addEventListener('mume-mapper-terrain', onTerrain);
        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-fail', onFail);

        return () => {
            window.removeEventListener('mume-mapper-room-info', onInfo);
            window.removeEventListener('mume-mapper-update-exits', onExits);
            window.removeEventListener('mume-mapper-terrain', onTerrain);
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-fail', onFail);
        };
    }, [handleRoomInfo, handleUpdateExits, handleTerrain]);


    return {
        rooms, setRooms,
        markers, setMarkers,
        exploredVnums, setExploredVnums,
        currentRoomId, setCurrentRoomId,
        allowPersistence, setAllowPersistence,
        cameraRef, handleAddRoom, handleDeleteRoom,
        roomsRef, currentRoomIdRef, markersRef,
        preloadedCoordsRef,
        spatialIndexRef,
        discoverySourceRef,
        unveilMap, setUnveilMap,
        handleResetAndSync, handleSyncLocation, handleClearMap
    };
};
