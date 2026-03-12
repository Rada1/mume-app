import { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { useGame, useLog } from '../../context/GameContext';
import { useMapData } from './hooks/useMapData';
import { useMapPersistence } from './hooks/useMapPersistence';
import { useMapActions } from './hooks/useMapActions';
import { useMapGmcphandlers } from './hooks/useMapGmcphandlers';

export const useMapperController = (characterName: string | null, ref: React.Ref<any>, options: { onRecenter?: () => void, triggerRender?: () => void } = {}) => {
    const { executeCommand, showDebugEchoes } = useGame();
    const { addMessage } = useLog();

    // Core state and refs from useMapData
    const {
        rooms, setRooms, roomsRef,
        markers, setMarkers, markersRef,
        exploredVnums, setExploredVnums, exploredRef,
        currentRoomId, setCurrentRoomId, currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef
    } = useMapData();

    // Local UI state
    const [allowPersistence, setAllowPersistence] = useState(() => localStorage.getItem('mume_mapper_persistence') !== 'false');
    const [unveilMap, setUnveilMap] = useState(() => {
        const saved = localStorage.getItem('mume_mapper_unveil');
        return saved === null ? false : saved === 'true';
    });

    // Shared refs
    const pendingMovesRef = useRef<{ dir: string, time: number }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    // Initial Loading
    const loadMasterMap = useCallback(async () => {
        try {
            const res = await fetch('/mume_map_data.json?v=' + Date.now());
            if (!res.ok) throw new Error('No preloaded map data');
            const data = await res.json();
            preloadedCoordsRef.current = data;

            const index: Record<number, Record<string, string[]>> = {};
            const nIndex: Record<string, string[]> = {};
            const sIndex: Record<string, string> = {};

            for (const vnum in data) {
                const rData = data[vnum];
                const [x, y, z] = rData;
                const rName = rData[5];
                const rServerId = rData[6];

                const floor = Math.round(z);
                if (!index[floor]) index[floor] = {};
                const bucketX = Math.floor(x / 5);
                const bucketY = Math.floor(y / 5);
                const key = `${bucketX},${bucketY}`;
                if (!index[floor][key]) index[floor][key] = [];
                index[floor][key].push(vnum);

                if (rName) {
                    if (!nIndex[rName]) nIndex[rName] = [];
                    nIndex[rName].push(vnum);
                }
                if (rServerId) {
                    sIndex[String(rServerId)] = vnum;
                }
            }
            spatialIndexRef.current = index;
            nameIndexRef.current = nIndex;
            serverIdIndexRef.current = sIndex;

            if (showDebugEchoes) {
                addMessage?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);
            }
        } catch (err) {
            console.warn("[Mapper] Could not load master map data:", err);
            preloadedCoordsRef.current = {};
            spatialIndexRef.current = {};
            nameIndexRef.current = {};
            serverIdIndexRef.current = {};
        }
    }, [addMessage, showDebugEchoes, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef]);

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
            if (showDebugEchoes) {
                addMessage?.('system', '[Mapper] Map reset. Snapshotting to MMapper global coordinates...');
            }
            setTimeout(() => { executeCommand?.('look'); }, 100);
        }
    }, [handleClearMap, addMessage, executeCommand, showDebugEchoes]);

    // GMCP Handlers
    const { handleRoomInfo, handleUpdateExits, handleTerrain } = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender: options.triggerRender,
        onRoomInfoProcessed: () => { preMoveRef.current = null; }
    });

    useImperativeHandle(ref, () => ({
        handleRoomInfo,
        handleAddRoom,
        handleDeleteRoom,
        handleUpdateExits,
        handleTerrain,
        handleResetAndSync,
        discoverySourceRef,
        firstExploredAtRef,
        pushPendingMove: (dir: string) => pendingMovesRef.current.push({ dir, time: Date.now() }),
        pushPreMove: (dir: string, targetId: string) => {
            preMoveRef.current = { dir, targetId, time: Date.now() };
            options.triggerRender?.();
        },
        handleMoveFailure: () => {
            pendingMovesRef.current.shift();
            preMoveRef.current = null;
            options.triggerRender?.();
        },
        handleCenterOnPlayer: options.onRecenter,
        stableRoomIdRef: currentRoomIdRef,
        stableRoomsRef: roomsRef,
        preloadedCoordsRef: preloadedCoordsRef
    }), [handleRoomInfo, handleAddRoom, handleDeleteRoom, handleUpdateExits, handleTerrain, handleResetAndSync, options.onRecenter, currentRoomIdRef, roomsRef, preloadedCoordsRef]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onInfo = (e: any) => handleRoomInfo(e.detail);
        const onExits = (e: any) => handleUpdateExits(e.detail);
        const onTerrain = (e: any) => handleTerrain(e.detail);
        const onPush = (e: any) => pendingMovesRef.current.push({ dir: e.detail, time: Date.now() });
        const onPre = (e: any) => {
            preMoveRef.current = { dir: e.detail.dir, targetId: e.detail.targetId, time: Date.now() };
            options.triggerRender?.();
        };
        const onFail = () => {
            pendingMovesRef.current.shift();
            preMoveRef.current = null;
            options.triggerRender?.();
        };

        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-push-pre-move', onPre);
        window.addEventListener('mume-mapper-move-fail', onFail);

        return () => {
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-push-pre-move', onPre);
            window.removeEventListener('mume-mapper-move-fail', onFail);
        };
    }, [handleRoomInfo, handleUpdateExits, handleTerrain]);

    return {
        rooms, setRooms, markers, setMarkers, exploredVnums, setExploredVnums, exploredRef,
        currentRoomId, setCurrentRoomId, allowPersistence, setAllowPersistence,
        cameraRef, handleAddRoom, handleDeleteRoom, roomsRef, currentRoomIdRef, markersRef,
        preloadedCoordsRef, spatialIndexRef, discoverySourceRef, firstExploredAtRef, unveilMap, setUnveilMap,
        handleResetAndSync, handleSyncLocation, handleClearMap, loadImportedMapData, preMoveRef
    };
};
