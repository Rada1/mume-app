import { useCallback } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';
import { generateId, GRID_SIZE, DIRS } from '../mapperUtils';

interface UseMapActionsProps {
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    addMessage?: (type: string, msg: string) => void;
    lastDetectedTerrainRef: React.MutableRefObject<string | null>;
    loadMasterMap: () => void;
}

export const useMapActions = ({
    rooms, setRooms, roomsRef,
    markers, setMarkers,
    setExploredVnums,
    setCurrentRoomId, currentRoomIdRef,
    preloadedCoordsRef,
    spatialIndexRef,
    addMessage,
    lastDetectedTerrainRef,
    loadMasterMap
}: UseMapActionsProps) => {

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
        setCurrentRoomId(null);
        currentRoomIdRef.current = null;

        loadMasterMap();

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

    const loadImportedMapData = useCallback((data: Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>) => {
        const merged = { ...preloadedCoordsRef.current };
        for (const vnum in data) {
            const newData = data[vnum];
            if (merged[vnum]) {
                const oldData = merged[vnum];
                merged[vnum] = [
                    newData[0], newData[1], newData[2],
                    newData[3] || oldData[3],
                    (Object.keys(newData[4] || {}).length > 0) ? newData[4] : oldData[4],
                    (newData[5] && !newData[5].startsWith('Room ')) ? newData[5] : oldData[5],
                    newData[6] || oldData[6],
                    newData[7] || oldData[7],
                    newData[8] || oldData[8]
                ];
            } else {
                merged[vnum] = newData;
            }
        }
        preloadedCoordsRef.current = merged;

        const index: Record<number, Record<string, string[]>> = {};
        const allVnums = new Set<string>();

        for (const vnum in merged) {
            const [x, y, z] = merged[vnum];
            const floor = Math.round(z);
            if (!index[floor]) index[floor] = {};

            const bucketX = Math.floor(x / 5);
            const bucketY = Math.floor(y / 5);
            const key = `${bucketX},${bucketY}`;
            if (!index[floor][key]) index[floor][key] = [];
            index[floor][key].push(vnum);

            allVnums.add(vnum);
        }
        spatialIndexRef.current = index;

        setExploredVnums(prev => {
            const next = new Set(prev);
            allVnums.forEach(v => next.add(v));
            return next;
        });

        addMessage?.('system', `[Mapper] Imported MMapper Data: ${Object.keys(data).length} rooms merged into master map.`);
    }, [addMessage, preloadedCoordsRef, spatialIndexRef, setExploredVnums]);

    return {
        handleAddRoom,
        handleDeleteRoom,
        handleClearMap,
        handleSyncLocation,
        loadImportedMapData
    };
};
