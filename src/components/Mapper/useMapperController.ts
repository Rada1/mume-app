import { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { GmcpRoomInfo, GmcpExitInfo } from '../../types';
import { MapperRoom, MapperMarker } from '../Mapper/mapperTypes';
import { generateId, normalizeTerrain, DIRS, GRID_SIZE } from '../Mapper/mapperUtils';

interface ControllerProps {
    characterName: string | null;
    ref: React.Ref<any>;
}

export const useMapperController = (characterName: string | null, ref: React.Ref<any>, addMessage?: (type: any, text: string) => void) => {
    const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
    const [markers, setMarkers] = useState<Record<string, MapperMarker>>({});
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const currentRoomIdRef = useRef<string | null>(null);
    const [allowPersistence, setAllowPersistence] = useState(() => localStorage.getItem('mume_mapper_persistence') !== 'false');

    const roomsRef = useRef(rooms);
    const markersRef = useRef(markers);
    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { markersRef.current = markers; }, [markers]);

    const pendingMovesRef = useRef<{ dir: string, time: number }[]>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });

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
        localStorage.setItem(posStorageKey, JSON.stringify({
            roomId: currentRoomId,
            camX: cameraRef.current.x,
            camY: cameraRef.current.y,
            zoom: cameraRef.current.zoom
        }));
    }, [rooms, markers, currentRoomId, allowPersistence, storageKey, markerStorageKey, posStorageKey]);

    const handleRoomInfo = useCallback((data: GmcpRoomInfo) => {
        const gmcpId = data.num ?? data.id ?? data.vnum;
        if (gmcpId === undefined || gmcpId === null) return;

        const activeRoomId = currentRoomIdRef.current;
        let targetId = Object.keys(roomsRef.current).find(key => String(roomsRef.current[key].gmcpId) === String(gmcpId)) || null;

        // addMessage?.('system', `[Mapper] Room Info: vnum=${gmcpId}, targetId=${targetId || 'NEW'}, active=${activeRoomId || 'NONE'}`);

        const name = data.name || 'Unknown Room';
        const desc = data.desc || '';
        const zone = data.area || data.zone || 'Unknown Zone';
        const freshTerrain = normalizeTerrain(data.terrain || data.environment || null);

        let dirUsed: string | null = null;

        const now = Date.now();
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) {
            pendingMovesRef.current.shift();
        }

        const currentActiveRoom = activeRoomId ? roomsRef.current[activeRoomId] : null;
        if (!activeRoomId || !currentActiveRoom || currentActiveRoom.gmcpId != gmcpId) {
            const nextMove = pendingMovesRef.current.shift();
            if (nextMove) {
                dirUsed = nextMove.dir;
            } else if (currentActiveRoom && currentActiveRoom.exits) {
                // Smart Inference: if we don't have a pending command, check if any known exit from current room leads to this vnum
                const foundDir = Object.keys(currentActiveRoom.exits).find(d => {
                    const ex = currentActiveRoom.exits[d];
                    return ex && ex.gmcpDestId == gmcpId;
                });
                if (foundDir) dirUsed = foundDir;
            }
        }

        if (!targetId) {
            targetId = generateId();
        }

        setRooms(prevRooms => {
            const newRooms = { ...prevRooms };
            const existingRoom = newRooms[targetId!];

            if (!existingRoom) {
                let nx = 0, ny = 0, nz = 0;
                const prevRoom = activeRoomId ? newRooms[activeRoomId] : null;

                if (prevRoom && dirUsed) {
                    const d = DIRS[dirUsed];
                    if (d) {
                        nx = prevRoom.x + (d.dx || 0);
                        ny = prevRoom.y + (d.dy || 0);
                        nz = (prevRoom.z || 0) + (d.dz || 0);
                        newRooms[prevRoom.id] = {
                            ...prevRoom,
                            exits: { ...prevRoom.exits, [dirUsed]: { ...prevRoom.exits[dirUsed], target: targetId!, closed: false } }
                        };
                    }
                } else if (prevRoom) {
                    // Stacking prevention: use a tiny offset if direction is unknown
                    nx = prevRoom.x + (Math.random() * 0.1 - 0.05);
                    ny = prevRoom.y + (Math.random() * 0.1 - 0.05);
                    nz = prevRoom.z || 0;
                }

                newRooms[targetId!] = {
                    id: targetId!, gmcpId, name, desc,
                    x: nx, y: ny, z: nz,
                    zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain',
                    exits: {}, notes: "", createdAt: Date.now()
                };

                if (prevRoom && dirUsed) {
                    const d = DIRS[dirUsed];
                    if (d && d.opp) newRooms[targetId!].exits[d.opp] = { ...newRooms[targetId!].exits[d.opp], target: prevRoom.id, closed: false };
                }
            } else {
                const finalTerrain = (data.terrain || data.environment) ? normalizeTerrain(data.terrain || data.environment) : existingRoom.terrain;
                newRooms[targetId!] = { ...existingRoom, name, desc, zone, terrain: finalTerrain };

                const prevRoom = activeRoomId ? newRooms[activeRoomId] : null;
                if (prevRoom && dirUsed && activeRoomId !== targetId) {
                    newRooms[prevRoom.id] = { ...prevRoom, exits: { ...prevRoom.exits, [dirUsed]: { ...prevRoom.exits[dirUsed], target: targetId!, closed: false } } };
                    const d = DIRS[dirUsed];
                    if (d && d.opp) newRooms[targetId!] = { ...newRooms[targetId!], exits: { ...newRooms[targetId!].exits, [d.opp]: { ...newRooms[targetId!].exits[d.opp], target: prevRoom.id, closed: false } } };
                }
            }

            if (data.exits) {
                const room = newRooms[targetId!];
                const updatedExits = { ...room.exits };
                for (const dir in data.exits) {
                    const gmcpExit = data.exits[dir];
                    if (gmcpExit === false) { delete updatedExits[dir]; continue; }
                    const gmcpDestId = typeof gmcpExit === 'number' ? gmcpExit : gmcpExit.id;
                    let name = undefined, flags = undefined;
                    if (typeof gmcpExit === 'object') { name = gmcpExit.name; flags = gmcpExit.flags; }
                    let internalTarget = updatedExits[dir]?.target;
                    if (!internalTarget && gmcpDestId) {
                        internalTarget = Object.keys(newRooms).find(key => newRooms[key].gmcpId == gmcpDestId) || undefined;
                    }
                    updatedExits[dir] = { ...updatedExits[dir], target: internalTarget!, gmcpDestId, name, flags, closed: flags?.includes('closed') || false };
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

    useImperativeHandle(ref, () => ({
        handleRoomInfo,
        handleAddRoom,
        handleDeleteRoom,
        handleUpdateExits,
        handleTerrain,
        pushPendingMove: (dir: string) => pendingMovesRef.current.push({ dir, time: Date.now() }),
        handleMoveFailure: () => pendingMovesRef.current.shift()
    }), [handleRoomInfo, handleAddRoom, handleDeleteRoom, handleUpdateExits, handleTerrain]);

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


    return { rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId, allowPersistence, setAllowPersistence, cameraRef, handleAddRoom, handleDeleteRoom, roomsRef, currentRoomIdRef, markersRef };
};
