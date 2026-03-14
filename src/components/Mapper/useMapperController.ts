import { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import { useGame, useLog } from '../../context/GameContext';
import { useMapData } from './hooks/useMapData';
import { useMapPersistence } from './hooks/useMapPersistence';
import { useMapActions } from './hooks/useMapActions';
import { useMapGmcphandlers } from './hooks/useMapGmcphandlers';
import { getGateState, DIRS } from './mapperUtils';

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
    const pendingMovesRef = useRef<{ dir: string, time: number, resolved?: boolean }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    // Initial Loading
    const hasLoadedRef = useRef(false);
    const loadMasterMap = useCallback(async (force = false) => {
        if (hasLoadedRef.current && !force) return;
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
            hasLoadedRef.current = true;
        } catch (err) {
            console.warn("[Mapper] Could not load master map data:", err);
            preloadedCoordsRef.current = {};
            spatialIndexRef.current = {};
            nameIndexRef.current = {};
            serverIdIndexRef.current = {};
        }
    }, [addMessage, showDebugEchoes, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef]);

    useEffect(() => { loadMasterMap(); }, []);

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

    const pushPendingMove = useCallback((dir: string) => {
        const move = { dir, time: Date.now(), resolved: false };
        pendingMovesRef.current.push(move);
    }, []);



    const handleMoveConfirmed = useCallback((e?: any) => {
        const isDark = e?.detail?.isDark || false;
        const now = Date.now();
        
        // Clear stale moves (> 5s)
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) {
            pendingMovesRef.current.shift();
        }

        if (pendingMovesRef.current.length > 0) {
            const move = pendingMovesRef.current[0]; 
            if (move && currentRoomIdRef.current) {
                const currentRoom = roomsRef.current[currentRoomIdRef.current];
                const d = (DIRS as any)[move.dir];
                
                if (!d) {
                    console.warn(`[Mapper] Invalid direction in pending move: ${move.dir}`);
                    return;
                }

                // Enforce strict integer grid for all predictions
                const startX = currentRoom ? Math.round(currentRoom.x) : 0;
                const startY = currentRoom ? Math.round(currentRoom.y) : 0;
                const startZ = currentRoom ? Math.round(currentRoom.z || 0) : 0;

                let targetId = currentRoom?.exits[move.dir]?.target;
                let ghostData = null;

                // 1. Prediction via ArdaMap (ONLY for lit rooms)
                if (!isDark && !targetId && currentRoomIdRef.current?.startsWith('m_')) {
                    const vnum = currentRoomIdRef.current.substring(2);
                    const ardaMapping = preloadedCoordsRef.current[vnum];
                    if (ardaMapping && ardaMapping[4] && ardaMapping[4][move.dir]) {
                        const targetVnum = String(ardaMapping[4][move.dir]);
                        targetId = `m_${targetVnum}`;
                        ghostData = preloadedCoordsRef.current[targetVnum];
                    }
                }

                // 2. Prediction via Coordinates (Strict Integer Adjacency)
                if (!targetId && currentRoom) {
                    const px = startX + (d.dx || 0);
                    const py = startY + (d.dy || 0);
                    const pz = startZ + (d.dz || 0);
                    const neighbor = Object.values(roomsRef.current).find(r => 
                        Math.round(r.x) === px && Math.round(r.y) === py && Math.abs(Math.round(r.z || 0) - pz) < 0.5 && r.zone === currentRoom.zone
                    );
                    if (neighbor) targetId = neighbor.id;
                }

                // If authoritative movement is needed (Dark) or just visual (Light)
                if (targetId || isDark) {
                    const predX = ghostData ? Math.round(ghostData[0]) : (startX + (d.dx || 0));
                    const predY = ghostData ? Math.round(ghostData[1]) : (startY + (d.dy || 0));
                    const predZ = ghostData ? Math.round(ghostData[2]) : (startZ + (d.dz || 0));

                    if (!targetId) {
                        targetId = `ghost_${predX}_${predY}_${predZ}`;
                    }

                    if (isDark) {
                        // For dark moves, the parser's confirmation is our only signal.
                        pendingMovesRef.current.shift();
                        if (showDebugEchoes) {
                            const debugInfo = ghostData ? `Snap to Arda: ${predX},${predY}` : `Relative: ${startX},${startY} -> ${predX},${predY}`;
                            addMessage?.('system', `[Mapper][DEBUG] Dark Move: ${move.dir} | ${debugInfo}`);
                        }
                        
                        const targetIdVal = targetId; // Stable reference for updater
                        setRooms(prev => {
                            const currentId = currentRoomIdRef.current;
                            let next = { ...prev };
                            
                            // 1. Create target room if it doesn't exist
                            if (!next[targetIdVal]) {
                                next[targetIdVal] = {
                                    id: targetIdVal,
                                    gmcpId: targetIdVal.startsWith('m_') ? Number(targetIdVal.substring(2)) : 0,
                                    name: ghostData ? ghostData[5] : 'Unknown Room (Dark)',
                                    desc: ghostData ? ghostData[9]?.[0] || "" : "",
                                    x: predX, y: predY, z: predZ,
                                    zone: ghostData ? ghostData[10] || currentRoom?.zone || "Unknown" : (currentRoom?.zone || "Unknown"),
                                    terrain: ghostData ? (ghostData[11] || "Field") : (currentRoom?.terrain || "Field"),
                                    exits: {}, createdAt: Date.now()
                                };
                            }

                            // 2. Link current -> target
                            if (currentId && next[currentId]) {
                                next[currentId] = {
                                    ...next[currentId],
                                    exits: {
                                        ...next[currentId].exits,
                                        [move.dir]: { 
                                            target: targetIdVal,
                                            gmcpDestId: targetIdVal.startsWith('m_') ? Number(targetIdVal.substring(2)) : undefined
                                        }
                                    }
                                };
                            }

                            // 3. Link target -> current (if direction has an opposite)
                            if (currentId && next[targetIdVal] && d.opp) {
                                next[targetIdVal] = {
                                    ...next[targetIdVal],
                                    exits: {
                                        ...next[targetIdVal].exits,
                                        [d.opp]: { 
                                            target: currentId,
                                            gmcpDestId: currentId.startsWith('m_') ? Number(currentId.substring(2)) : undefined
                                        }
                                    }
                                };
                            }

                            return next;
                        });
                        
                        setCurrentRoomId(targetIdVal);
                        currentRoomIdRef.current = targetIdVal;
                        preMoveRef.current = null;
                    } else {
                        // In lit rooms, we only set the preMove for visual gliding.
                        // We DO NOT shift pendingMovesRef here; handleRoomInfo will do that authoritativeley.
                        preMoveRef.current = { dir: move.dir, targetId: targetId, time: Date.now() };
                    }
                    options.triggerRender?.();
                }
            }
        }
    }, [setCurrentRoomId, currentRoomIdRef, roomsRef, preloadedCoordsRef, options, setRooms, showDebugEchoes, addMessage]);

    useImperativeHandle(ref, () => ({
        handleRoomInfo,
        handleAddRoom,
        handleDeleteRoom,
        handleUpdateExits,
        handleTerrain,
        handleResetAndSync,
        handleMoveConfirmed,
        handleMoveFailure: () => {
            // Remove the most recent pending move since it failed
            pendingMovesRef.current.shift();
            preMoveRef.current = null;
            options.triggerRender?.();
        },
        handleCenterOnPlayer: options.onRecenter,
        stableRoomIdRef: currentRoomIdRef,
        stableRoomsRef: roomsRef,
        preloadedCoordsRef,
        discoverySourceRef,
        firstExploredAtRef,
        pushPendingMove,
        pushPreMove: (dir: string, targetId: string) => {
            preMoveRef.current = { dir, targetId, time: Date.now() };
            options.triggerRender?.();
        },
    }), [handleRoomInfo, handleAddRoom, handleDeleteRoom, handleUpdateExits, handleTerrain, handleResetAndSync, handleMoveConfirmed, options.onRecenter, currentRoomIdRef, roomsRef, preloadedCoordsRef, pushPendingMove, options.triggerRender]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onInfo = (e: any) => handleRoomInfo(e.detail);
        const onExits = (e: any) => handleUpdateExits(e.detail);
        const onTerrain = (e: any) => handleTerrain(e.detail);
        const onPush = (e: any) => pushPendingMove(e.detail);
        const onConfirm = (e: any) => handleMoveConfirmed(e);
        const onPre = (e: any) => {
            preMoveRef.current = { dir: e.detail.dir, targetId: e.detail.targetId, time: Date.now() };
            options.triggerRender?.();
        };
        const onFail = () => {
            pendingMovesRef.current.shift();
            preMoveRef.current = null;
            options.triggerRender?.();
        };

        window.addEventListener('mume-mapper-room-info', onInfo);
        window.addEventListener('mume-mapper-update-exits', onExits);
        window.addEventListener('mume-mapper-terrain', onTerrain);
        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-confirmed', onConfirm);
        window.addEventListener('mume-mapper-push-pre-move', onPre);
        window.addEventListener('mume-mapper-move-fail', onFail);

        return () => {
            window.removeEventListener('mume-mapper-room-info', onInfo);
            window.removeEventListener('mume-mapper-update-exits', onExits);
            window.removeEventListener('mume-mapper-terrain', onTerrain);
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-confirmed', onConfirm);
            window.removeEventListener('mume-mapper-push-pre-move', onPre);
            window.removeEventListener('mume-mapper-move-fail', onFail);
        };
    }, [handleRoomInfo, handleUpdateExits, handleTerrain, pushPendingMove, handleMoveConfirmed]);

    return {
        rooms, setRooms, markers, setMarkers, exploredVnums, setExploredVnums, exploredRef,
        currentRoomId, setCurrentRoomId, allowPersistence, setAllowPersistence,
        cameraRef, handleAddRoom, handleDeleteRoom, roomsRef, currentRoomIdRef, markersRef,
        preloadedCoordsRef, spatialIndexRef, discoverySourceRef, firstExploredAtRef, unveilMap, setUnveilMap,
        handleResetAndSync, handleSyncLocation, handleClearMap, loadImportedMapData, preMoveRef
    };
};
