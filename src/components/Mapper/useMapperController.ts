import { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { useGame } from '../../context/GameContext';
import { useMapData } from './hooks/useMapData';
import { useMapPersistence } from './hooks/useMapPersistence';
import { useMapActions } from './hooks/useMapActions';
import { useMapGmcphandlers } from './hooks/useMapGmcphandlers';

export const useMapperController = (characterName: string | null, ref: React.Ref<any>) => {
    const { addMessage, executeCommand } = useGame();

    // Core state and refs
    const {
        rooms, setRooms, roomsRef,
        markers, setMarkers, markersRef,
        exploredVnums, setExploredVnums, exploredRef,
        currentRoomId, setCurrentRoomId, currentRoomIdRef,
        spatialIndexRef, preloadedCoordsRef
    } = useMapData();

    // Local UI state
    const [allowPersistence, setAllowPersistence] = useState(() => localStorage.getItem('mume_mapper_persistence') !== 'false');
    const [unveilMap, setUnveilMap] = useState(() => localStorage.getItem('mume_mapper_unveil') === 'true');

    // Shared refs
    const pendingMovesRef = useRef<{ dir: string, time: number }[]>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const discoverySourceRef = useRef<string | null>(null);

    // Initial Loading
    const loadMasterMap = useCallback(async () => {
        try {
            const res = await fetch('/mume_map_data.json?v=' + Date.now());
            if (!res.ok) throw new Error('No preloaded map data');
            const data = await res.json();
            preloadedCoordsRef.current = data;

            const index: Record<number, Record<string, string[]>> = {};
            for (const vnum in data) {
                const [x, y, z] = data[vnum];
                const floor = Math.round(z);
                if (!index[floor]) index[floor] = {};
                const bucketX = Math.floor(x / 5);
                const bucketY = Math.floor(y / 5);
                const key = `${bucketX},${bucketY}`;
                if (!index[floor][key]) index[floor][key] = [];
                index[floor][key].push(vnum);
            }
            spatialIndexRef.current = index;
            addMessage?.('system', `[Mapper] Master Map Loaded: ${Object.keys(data).length} rooms.`);
        } catch (err) {
            console.warn("[Mapper] Could not load master map data:", err);
            preloadedCoordsRef.current = {};
            spatialIndexRef.current = {};
        }
    }, [addMessage]);

    useEffect(() => { loadMasterMap(); }, [loadMasterMap]);

    // Persistence
    useMapPersistence({
        characterName, rooms, setRooms, markers, setMarkers, exploredVnums, setExploredVnums,
        currentRoomId, setCurrentRoomId, currentRoomIdRef, cameraRef, allowPersistence, unveilMap
    });

    // Actions
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation, loadImportedMapData } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, setExploredVnums, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    const handleResetAndSync = useCallback(() => {
        if (window.confirm('Wipe local map data and synchronize with MMapper global coordinates?')) {
            handleClearMap(true);
            addMessage?.('system', '[Mapper] Map reset. Snapshotting to MMapper global coordinates...');
            setTimeout(() => { executeCommand?.('look'); }, 100);
        }
    }, [handleClearMap, addMessage, executeCommand]);

    // GMCP Handlers
    const { handleRoomInfo, handleUpdateExits, handleTerrain } = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage
    });

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
        rooms, setRooms, markers, setMarkers, exploredVnums, setExploredVnums,
        currentRoomId, setCurrentRoomId, allowPersistence, setAllowPersistence,
        cameraRef, handleAddRoom, handleDeleteRoom, roomsRef, currentRoomIdRef, markersRef,
        preloadedCoordsRef, spatialIndexRef, discoverySourceRef, unveilMap, setUnveilMap,
        handleResetAndSync, handleSyncLocation, handleClearMap, loadImportedMapData
    };
};
