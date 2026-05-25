import { useState, useRef, useEffect } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';

const MARKER_STORAGE_KEY = 'mume_mapper_markers_global';

export const useMapData = () => {
    const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
    const [markers, setMarkers] = useState<Record<string, MapperMarker>>(() => {
        try {
            const saved = localStorage.getItem(MARKER_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });
    const [exploredVnums, setExploredVnums] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('mume_mapper_explored');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [exploredMarkers, setExploredMarkers] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('mume_mapper_explored_markers');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const currentRoomIdRef = useRef<string | null>(null);

    const roomsRef = useRef(rooms);
    const markersRef = useRef(markers);
    const exploredRef = useRef(exploredVnums);
    const exploredMarkersRef = useRef(exploredMarkers);

    useEffect(() => { roomsRef.current = rooms; }, [rooms]);
    useEffect(() => { markersRef.current = markers; }, [markers]);
    useEffect(() => { exploredRef.current = exploredVnums; }, [exploredVnums]);
    useEffect(() => { exploredMarkersRef.current = exploredMarkers; }, [exploredMarkers]);

    // Persist markers to localStorage (debounced 2s to avoid thrash during import)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const keys = Object.keys(markers);
                if (keys.length > 0) {
                    localStorage.setItem(MARKER_STORAGE_KEY, JSON.stringify(markers));
                }
            } catch (e) {
                console.warn('[MapData] Failed to save markers:', e);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [markers]);



    const spatialIndexRef = useRef<Record<number, Record<string, string[]>>>({});
    const nameIndexRef = useRef<Record<string, string[]>>({});
    const serverIdIndexRef = useRef<Record<string, string>>({});
    const preloadedCoordsRef = useRef<Record<string, any>>({});
    const baseMapExitsRef = useRef<Record<string, any>>({});

    return {
        rooms, setRooms, roomsRef,
        markers, setMarkers, markersRef,
        exploredVnums, setExploredVnums, exploredRef,
        exploredMarkers, setExploredMarkers, exploredMarkersRef,
        currentRoomId, setCurrentRoomId, currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef, baseMapExitsRef
    };
};
