import React, { useCallback } from 'react';
import { CompactMapExit, MapperRoom, MapperMarker } from '../mapperTypes';
import { generateId, GRID_SIZE, DIRS } from '../mapperUtils';

interface UseMapActionsProps {
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    setExploredMarkers: React.Dispatch<React.SetStateAction<Set<string>>>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    nameIndexRef: React.MutableRefObject<Record<string, string[]>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    baseMapExitsRef: React.MutableRefObject<Record<string, any>>;
    markersRef: React.MutableRefObject<Record<string, MapperMarker>>;
    addMessage?: (type: string, msg: string) => void;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    loadMasterMap: (force?: boolean) => void;
}

export const useMapActions = ({
    rooms, setRooms, roomsRef,
    markers, setMarkers, markersRef,
    setExploredVnums, setExploredMarkers,
    setCurrentRoomId, currentRoomIdRef,
    preloadedCoordsRef,
    spatialIndexRef,
    nameIndexRef,
    serverIdIndexRef,
    baseMapExitsRef,
    addMessage,
    lastDetectedTerrainRef,
    loadMasterMap
}: UseMapActionsProps) => {

    const handleResetAndSync = useCallback(() => {
        loadMasterMap(true);
        addMessage?.('system', '[Mapper] Reloading master map data...');
    }, [loadMasterMap, addMessage]);

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
    }, [setRooms, lastDetectedTerrainRef]);

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
    }, [setRooms]);

    const handleClearMap = useCallback((silentArg?: boolean | any) => {
        const silent = silentArg === true;
        if (!silent && !window.confirm('Wipe ALL local map data, markers, and exploration history?')) return;

        setRooms({});
        setMarkers({});
        setExploredVnums(new Set());
        setExploredMarkers(new Set());
        setCurrentRoomId(null);
        currentRoomIdRef.current = null;

        loadMasterMap(true);

        if (!silent) addMessage?.('system', '[Mapper] Local map data cleared.');
    }, [addMessage, loadMasterMap, setRooms, setMarkers, setExploredVnums, setCurrentRoomId, currentRoomIdRef]);

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
    }, [addMessage, currentRoomIdRef, setRooms, preloadedCoordsRef]);

    const loadImportedMapData = useCallback((data: Record<string, any>) => {
        // 1. Clear existing dynamic map and exploration state
        setRooms({});
        setMarkers({});
        setExploredVnums(new Set());
        setExploredMarkers(new Set());
        setCurrentRoomId(null);
        currentRoomIdRef.current = null;

        // 2. Reset last detected terrain
        if (lastDetectedTerrainRef) {
            lastDetectedTerrainRef.current = null;
        }

        // 3. Clone imported map rooms data
        const baseMap = { ...data };

        // 4. Run zone propagation/fallbacks to ensure zone-filtering works on the imported map
        const queue: string[] = [];
        for (const vnum in baseMap) {
            const zone = baseMap[vnum][9];
            if (zone && typeof zone === 'string' && zone.trim() !== '') {
                queue.push(vnum);
            }
        }

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const currZone = baseMap[curr][9];
            const exits = baseMap[curr][4];
            if (!exits) continue;
            for (const dir in exits) {
                const exitObj = exits[dir];
                const target = exitObj && exitObj.target ? String(exitObj.target) : null;
                if (target && baseMap[target]) {
                    const targetZone = baseMap[target][9];
                    if (!targetZone || typeof targetZone !== 'string' || targetZone.trim() === '') {
                        baseMap[target][9] = currZone;
                        queue.push(target);
                    }
                }
            }
        }

        const knownRooms: { x: number; y: number; z: number; zone: string }[] = [];
        for (const vnum in baseMap) {
            const r = baseMap[vnum];
            if (r[9] && typeof r[9] === 'string' && r[9].trim() !== '') {
                knownRooms.push({ x: r[0], y: r[1], z: r[2] || 0, zone: r[9] });
            }
        }

        for (const vnum in baseMap) {
            const r = baseMap[vnum];
            if (!r[9] || typeof r[9] !== 'string' || r[9].trim() === '') {
                let minD = Infinity;
                let bestZone = '';
                const rx = r[0], ry = r[1], rz = r[2] || 0;
                for (let i = 0; i < knownRooms.length; i++) {
                    const kr = knownRooms[i];
                    const dx = kr.x - rx;
                    const dy = kr.y - ry;
                    const dz = kr.z - rz;
                    const dist = dx * dx + dy * dy + dz * dz;
                    if (dist < minD) {
                        minD = dist;
                        bestZone = kr.zone;
                    }
                }
                if (minD < 900) {
                    r[9] = bestZone;
                } else {
                    r[9] = 'Unknown Zone';
                }
            }
        }

        // 5. Store the new base map template
        preloadedCoordsRef.current = baseMap;

        // 6. Rebuild all indexes for rendering and GMCP mapping
        const index: Record<number, Record<string, string[]>> = {};
        const nIndex: Record<string, string[]> = {};
        const sIndex: Record<string, string> = {};
        const baseMapExits: Record<string, any> = {};

        for (const vnum in baseMap) {
            const rData = baseMap[vnum], [x, y, z] = rData;
            const rName = rData[5];
            const floor = Math.round(z);
            if (!index[floor]) index[floor] = {};

            const bucketX = Math.floor(x / 5);
            const bucketY = Math.floor(y / 5);
            const key = `${bucketX},${bucketY}`;
            if (!index[floor][key]) index[floor][key] = [];
            index[floor][key].push(vnum);

            if (rName && typeof rName === 'string') {
                if (!nIndex[rName]) nIndex[rName] = [];
                nIndex[rName].push(vnum);
            }
            sIndex[String(vnum)] = vnum;
            baseMapExits[String(vnum)] = rData;

            const rServerId = rData[6];
            if (rServerId) {
                baseMapExits[String(rServerId)] = rData;
            }
        }

        for (const vnum in baseMap) {
            const rServerId = baseMap[vnum][6];
            if (rServerId && String(rServerId) !== String(vnum)) {
                sIndex[String(rServerId)] = vnum;
            }
        }

        spatialIndexRef.current = index;
        if (nameIndexRef) nameIndexRef.current = nIndex;
        if (serverIdIndexRef) serverIdIndexRef.current = sIndex;
        baseMapExitsRef.current = baseMapExits;

        addMessage?.('system', `[Mapper] Loaded new MMapper base template: ${Object.keys(baseMap).length} rooms. Base map cleared.`);
    }, [
        addMessage,
        preloadedCoordsRef,
        spatialIndexRef,
        nameIndexRef,
        serverIdIndexRef,
        baseMapExitsRef,
        setRooms,
        setMarkers,
        setExploredVnums,
        setExploredMarkers,
        setCurrentRoomId,
        currentRoomIdRef,
        lastDetectedTerrainRef
    ]);

    return {
        handleAddRoom,
        handleDeleteRoom,
        handleClearMap,
        handleSyncLocation,
        handleResetAndSync,
        loadImportedMapData
    };
};
