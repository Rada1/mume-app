import { useState, useRef, useEffect, useCallback } from 'react';
import { MapperRoom, MapperMarker } from '../mapperTypes';

export const useMapData = () => {
    const [rooms, setRooms] = useState<Record<string, MapperRoom>>({});
    const [markers, setMarkers] = useState<Record<string, MapperMarker>>({});
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
