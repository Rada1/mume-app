import { useEffect } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';

interface UseMapPersistenceProps {
    characterName: string | null;
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    exploredVnums: Set<string>;
    setExploredVnums: React.Dispatch<React.SetStateAction<Set<string>>>;
    currentRoomId: string | null;
    setCurrentRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    cameraRef: React.MutableRefObject<{ x: number; y: number; zoom: number }>;
    allowPersistence: boolean;
    unveilMap: boolean;
}

export const useMapPersistence = ({
    characterName,
    rooms, setRooms,
    markers, setMarkers,
    exploredVnums, setExploredVnums,
    currentRoomId, setCurrentRoomId,
    currentRoomIdRef,
    cameraRef,
    allowPersistence,
    unveilMap
}: UseMapPersistenceProps) => {
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
    }, [storageKey, markerStorageKey, posStorageKey, setRooms, setMarkers, setCurrentRoomId, currentRoomIdRef, cameraRef]);

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

    return { storageKey };
};
