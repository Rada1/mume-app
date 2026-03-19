/**
 * @file MapperContext.tsx
 * @description Centralized state and logic for the MUME Mapper.
 * Ensures synchronization across all Mapper instances (HUD, Drawer).
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useGame, useLog, useUI } from './GameContext';
import { usePersistentState } from '../hooks/usePersistentState';
import { useMapData } from '../components/Mapper/hooks/useMapData';
import { useMapPersistence } from '../components/Mapper/hooks/useMapPersistence';
import { useMapActions } from '../components/Mapper/hooks/useMapActions';
import { useMapGmcphandlers } from '../components/Mapper/hooks/useMapGmcphandlers';
import { DIRS } from '../components/Mapper/mapperUtils';
import { MapperRoom, MapperMarker } from '../components/Mapper/mapperTypes';

interface MapperContextType {
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    markers: Record<string, MapperMarker>;
    setMarkers: React.Dispatch<React.SetStateAction<Record<string, MapperMarker>>>;
    currentRoomId: string | null;
    setCurrentRoomId: (id: string | null) => void;
    currentRoomIdRef: React.MutableRefObject<string | null>;
    roomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    baseMapExitsRef: React.MutableRefObject<Record<string, any>>;
    unveilMap: boolean;
    setUnveilMap: React.Dispatch<React.SetStateAction<boolean>>;
    allowPersistence: boolean;
    setAllowPersistence: React.Dispatch<React.SetStateAction<boolean>>;
    handleResetAndSync: () => void;
    handleClearMap: (force?: boolean) => void;
    handleSyncLocation: (wx: number, wy: number) => void;
    handleAddRoom: (wx: number, wy: number, z: number) => string;
    handleDeleteRoom: (id: string) => void;
    pushPendingMove: (dir: string) => void;
    handleMoveConfirmed: (e?: any) => void;
    handleMoveFailure: () => void;
    preMoveRef: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    clientPredictionsRef: React.MutableRefObject<Array<{ toId: string, toX: number, toY: number, toZ: number }>>;
    spatialIndexRef: React.MutableRefObject<any>;
    firstExploredAtRef: React.MutableRefObject<Record<string, number>>;
    serverIdIndexRef: React.MutableRefObject<Record<string, string>>;
    triggerRender: () => void;
    renderVersion: number;
    
    // UI State (Unified)
    selectedRoomIds: Set<string>;
    setSelectedRoomIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    selectedMarkerId: string | null;
    setSelectedMarkerId: React.Dispatch<React.SetStateAction<string | null>>;
    autoCenter: boolean;
    setAutoCenter: React.Dispatch<React.SetStateAction<boolean>>;
    viewZ: number | null;
    setViewZ: React.Dispatch<React.SetStateAction<number | null>>;
    infoRoomId: string | null;
    setInfoRoomId: React.Dispatch<React.SetStateAction<string | null>>;
    markersRef: React.MutableRefObject<Record<string, MapperMarker>>;
    exploredRef: React.MutableRefObject<Set<string>>;
    exploredVnums: Set<string>;
    exploredMarkers: Set<string>;
    setExploredMarkers: React.Dispatch<React.SetStateAction<Set<string>>>;
    isMapFloating: boolean;
    setIsMapFloating: React.Dispatch<React.SetStateAction<boolean>>;
}

const MapperContext = createContext<MapperContextType | undefined>(undefined);

export const MapperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { characterName, executeCommand, showDebugEchoes } = useGame();
    const { addMessage } = useLog();

    const [renderVersion, setRenderVersion] = useState(0);
    const triggerRender = useCallback(() => {
        setRenderVersion(v => v + 1);
    }, []);

    // Core data state from useMapData
    const {
        rooms, setRooms, roomsRef,
        markers, setMarkers, markersRef,
        exploredVnums, setExploredVnums, exploredRef,
        exploredMarkers, setExploredMarkers,
        currentRoomId, setCurrentRoomId, currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef, baseMapExitsRef
    } = useMapData();

    // Unified UI State
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);
    const [viewZ, setViewZ] = useState<number | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [isMapFloating, setIsMapFloating] = usePersistentState<boolean>('mud-is-map-floating', false);

    // Settings
    const [allowPersistence, setAllowPersistence] = useState(() => localStorage.getItem('mume_mapper_persistence') !== 'false');
    const [unveilMap, setUnveilMap] = useState(() => {
        const saved = localStorage.getItem('mume_mapper_unveil');
        return saved === null ? false : saved === 'true'; // Default to false (hide unexplored)
    });

    // Refs
    const pendingMovesRef = useRef<{ dir: string, time: number, resolved?: boolean }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const clientPredictionsRef = useRef<Array<{ toId: string, toX: number, toY: number, toZ: number }>>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    // Master Map Loading
    const hasLoadedRef = useRef(false);
    const loadMasterMap = useCallback(async (force = false) => {
        if (hasLoadedRef.current && !force) return;
        hasLoadedRef.current = true;
        try {
            // 1. Load basic room coordinates (JSON)
            const res = await fetch('/mume_map_data.json?v=' + Date.now());
            if (!res.ok) throw new Error('No preloaded map data');
            const data = await res.json();
            preloadedCoordsRef.current = data;
            const index: Record<number, Record<string, string[]>> = {};
            const nIndex: Record<string, string[]> = {};
            const sIndex: Record<string, string> = {};
            for (const vnum in data) {
                const rData = data[vnum], [x, y, z] = rData;
                // Format: [x, y, z, terrain, exits, name, serverId, mobFlags, loadFlags]
                const rName = rData[5]; 
                const rServerId = rData[6];
                
                const floor = Math.round(z);
                if (!index[floor]) index[floor] = {};
                const bucketX = Math.floor(x / 5), bucketY = Math.floor(y / 5), key = `${bucketX},${bucketY}`;
                if (!index[floor][key]) index[floor][key] = [];
                index[floor][key].push(vnum);
                
                // Build name index for fingerprint matching
                if (rName && typeof rName === 'string') { 
                    if (!nIndex[rName]) nIndex[rName] = []; 
                    nIndex[rName].push(vnum); 
                }
                
                // Track Server ID (GMCP ID) if available
                if (rServerId) {
                    sIndex[String(rServerId)] = vnum;
                }
                // Also map vnum directly as fallback
                sIndex[String(vnum)] = vnum;
            }
            spatialIndexRef.current = index; nameIndexRef.current = nIndex; serverIdIndexRef.current = sIndex;
            console.log('[Mapper] Proactively built serverIdIndexRef with', Object.keys(sIndex).length, 'entries.');
            if (showDebugEchoes) addMessage?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);

            // 2. Automatically load Markers from ardagmcp.xml if it exists
            try {
                const xmlRes = await fetch('/ardagmcp.xml?v=' + Date.now());
                if (xmlRes.ok) {
                    const blob = await xmlRes.blob();
                    const file = new File([blob], 'ardagmcp.xml');
                    const { parseMM2 } = await import('../components/Mapper/mm2Parser');
                    const importedData = await parseMM2(file, 1.0);
                    
                    if (importedData.markers && Object.keys(importedData.markers).length > 0) {
                        setMarkers(prev => ({ ...prev, ...importedData.markers }));
                    }
                    if (importedData.rooms && Object.keys(importedData.rooms).length > 0) {
                        baseMapExitsRef.current = importedData.rooms;
                        if (showDebugEchoes) addMessage?.('system', `[Mapper] Automatically imported ${Object.keys(importedData.markers).length} markers and ${Object.keys(importedData.rooms).length} base map room details.`);
                    }
                }
            } catch (xmlErr) {
                console.warn("[Mapper] Could not autoload ardagmcp.xml data:", xmlErr);
            }

        } catch (err) { console.warn("[Mapper] Could not load master map data:", err); }
    }, [addMessage, showDebugEchoes, preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, setMarkers]);

    useEffect(() => { loadMasterMap(); }, [loadMasterMap]);

    // Persistence
    useMapPersistence({
        characterName, rooms, setRooms, markers, setMarkers, exploredVnums, setExploredVnums,
        exploredMarkers, setExploredMarkers,
        currentRoomId, setCurrentRoomId, currentRoomIdRef, allowPersistence, unveilMap
    });

    // --- Marker Discovery Logic ---
    useEffect(() => {
        if (!currentRoomId || unveilMap) return;
        
        // Find current room coordinates
        let rx: number | undefined, ry: number | undefined, rz: number | undefined;
        const room = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
        if (room) {
            rx = room.x; ry = room.y; rz = room.z || 0;
        } else {
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const pData = preloadedCoordsRef.current[rawId];
            if (pData) { rx = pData[0]; ry = pData[1]; rz = pData[2] || 0; }
        }

        if (rx === undefined || ry === undefined) return;

        const DISCOVERY_RADIUS = 10;
        let changed = false;
        const nextExplored = new Set(exploredMarkers);

        Object.values(markers).forEach(marker => {
            if (nextExplored.has(marker.id)) return;
            if (Math.round(marker.z || 0) !== Math.round(rz || 0)) return;
            
            const dist = Math.hypot(marker.x - rx!, marker.y - ry!);
            if (dist <= DISCOVERY_RADIUS) {
                nextExplored.add(marker.id);
                changed = true;
            }
        });

        if (changed) {
            setExploredMarkers(nextExplored);
            triggerRender();
        }
    }, [currentRoomId, markers, exploredMarkers, unveilMap, rooms, preloadedCoordsRef, setExploredMarkers, triggerRender]);

    // Actions
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, setExploredVnums, setExploredMarkers, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    const handleResetAndSync = useCallback(() => {
        if (window.confirm('Wipe local map data and synchronize with MMapper global coordinates?')) {
            handleClearMap(true);
            setTimeout(() => { executeCommand?.('look'); }, 100);
        }
    }, [handleClearMap, executeCommand]);

    const onRoomInfoProcessed = useCallback(() => {
        preMoveRef.current = null;
        // GMCP confirmed a move — consume the first prediction
        if (clientPredictionsRef.current.length > 0) {
            clientPredictionsRef.current = clientPredictionsRef.current.slice(1);
            triggerRender();
        }
    }, [triggerRender]);

    // Stabilized GMCP Handlers to prevent listener churn
    const masterHandlers = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender,
        onRoomInfoProcessed, preMoveRef
    });

    const handleRoomInfo = masterHandlers.handleRoomInfo;
    const handleUpdateExits = masterHandlers.handleUpdateExits;
    const handleTerrain = masterHandlers.handleTerrain;

    const pushPendingMove = useCallback((dir: string) => {
        const now = Date.now();
        const moveId = Math.random().toString(36).substring(7);
        const move = { id: moveId, dir, time: now, resolved: false, seq: Math.floor(now % 10000) };
        pendingMovesRef.current.push(move);

        if (showDebugEchoes) {
            addMessage?.('system', `[Mapper] Action: ${dir} (ID: ${moveId}, Queue: ${pendingMovesRef.current.length})`);
        }

        // Client-side prediction: chain off last prediction's room (or current confirmed room)
        const predictions = clientPredictionsRef.current;
        if (predictions.length < 8) { // Cap to prevent runaway spam chains
            const fromId = predictions.length > 0
                ? predictions[predictions.length - 1].toId
                : currentRoomIdRef.current;

            if (fromId) {
                let toId: string | null = null;
                let toX: number | undefined, toY: number | undefined, toZ: number | undefined;

                const fromRoom = roomsRef.current[fromId];
                if (fromRoom?.exits?.[dir]?.target) {
                    toId = fromRoom.exits[dir].target;
                }
                if (!toId) {
                    const rawFromId = fromId.startsWith('m_') ? fromId.substring(2) : fromId;
                    const arda = preloadedCoordsRef.current[rawFromId];
                    if (arda?.[4]?.[dir]) toId = `m_${String(arda[4][dir])}`;
                }

                if (toId) {
                    const toRoom = roomsRef.current[toId];
                    if (toRoom) {
                        toX = toRoom.x; toY = toRoom.y; toZ = toRoom.z || 0;
                    } else {
                        const rawToId = toId.startsWith('m_') ? toId.substring(2) : toId;
                        const p = preloadedCoordsRef.current[rawToId];
                        if (p) { toX = p[0]; toY = p[1]; toZ = p[2] || 0; }
                    }
                    if (toX !== undefined) {
                        clientPredictionsRef.current = [...predictions, { toId, toX, toY: toY!, toZ: toZ! }];
                        triggerRender();
                    }
                }
            }
        }
    }, [showDebugEchoes, addMessage, currentRoomIdRef, roomsRef, preloadedCoordsRef, triggerRender]);

    const handleMoveConfirmed = useCallback((e?: any) => {
        const isDark = e?.detail?.isDark || false;
        const now = Date.now();
        while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 5000) pendingMovesRef.current.shift();

        if (pendingMovesRef.current.length > 0) {
            const move = pendingMovesRef.current[0];
            if (move && currentRoomIdRef.current) {
                const currentRoom = roomsRef.current[currentRoomIdRef.current];
                const d = (DIRS as any)[move.dir];
                if (!d) return;

                const startX = currentRoom ? Math.round(currentRoom.x) : 0;
                const startY = currentRoom ? Math.round(currentRoom.y) : 0;
                const startZ = currentRoom ? Math.round(currentRoom.z || 0) : 0;

                let targetId = currentRoom?.exits[move.dir]?.target, ghostData = null;

                if (!isDark && !targetId && currentRoomIdRef.current?.startsWith('m_')) {
                    const vnum = currentRoomIdRef.current.substring(2);
                    const ardaMapping = preloadedCoordsRef.current[vnum];
                    if (ardaMapping?.[4]?.[move.dir]) {
                        const targetVnum = String(ardaMapping[4][move.dir]);
                        targetId = `m_${targetVnum}`; ghostData = preloadedCoordsRef.current[targetVnum];
                    }
                }

                if (!targetId && currentRoom) {
                    const px = startX + d.dx, py = startY + d.dy, pz = startZ + d.dz;
                    const neighbor = Object.values(roomsRef.current).find(r =>
                        Math.round(r.x) === px && Math.round(r.y) === py && Math.abs(Math.round(r.z || 0) - pz) < 0.5 && r.zone === currentRoom.zone
                    );
                    if (neighbor) targetId = neighbor.id;
                }

                if (targetId || isDark) {
                    const predX = ghostData ? Math.round(ghostData[0]) : (startX + (d.dx || 0));
                    const predY = ghostData ? Math.round(ghostData[1]) : (startY + (d.dy || 0));
                    const predZ = ghostData ? Math.round(ghostData[2]) : (startZ + (d.dz || 0));
                    if (!targetId) targetId = `ghost_${predX}_${predY}_${predZ}`;

                    if (isDark) {
                        pendingMovesRef.current.shift();
                        const targetIdVal = targetId;
                        setRooms(prev => {
                            let next = { ...prev };
                            if (!next[targetIdVal]) {
                                next[targetIdVal] = {
                                    id: targetIdVal, gmcpId: targetIdVal.startsWith('m_') ? Number(targetIdVal.substring(2)) : 0,
                                    name: ghostData ? ghostData[5] : 'Unknown Room (Dark)', desc: ghostData ? ghostData[9]?.[0] || "" : "",
                                    x: predX, y: predY, z: predZ, zone: ghostData ? ghostData[10] || currentRoom?.zone || "Unknown" : (currentRoom?.zone || "Unknown"),
                                    terrain: ghostData ? (ghostData[11] || "Field") : (currentRoom?.terrain || "Field"), exits: {}, createdAt: Date.now(), notes: ''
                                };
                            }
                            if (currentRoomIdRef.current && next[currentRoomIdRef.current]) {
                                next[currentRoomIdRef.current].exits[move.dir] = { target: targetIdVal, closed: false, gmcpDestId: targetIdVal.startsWith('m_') ? Number(targetIdVal.substring(2)) : undefined };
                            }
                            return next;
                        });
                        setCurrentRoomId(targetIdVal); currentRoomIdRef.current = targetIdVal; preMoveRef.current = null;
                    } else {
                        // Update current room immediately for non-GMCP mode.
                        // If GMCP arrives afterwards it will confirm (or correct) this.
                        // Do NOT shift pendingMovesRef here — handleRoomInfo does that when GMCP arrives.
                        setCurrentRoomId(targetId); currentRoomIdRef.current = targetId;
                        preMoveRef.current = null;
                    }
                    triggerRender();
                }
            }
        }
    }, [setCurrentRoomId, currentRoomIdRef, roomsRef, preloadedCoordsRef, setRooms, triggerRender]);

    const handleMoveFailure = useCallback(() => {
        pendingMovesRef.current.shift();
        preMoveRef.current = null;
        // Move failed — clear all predictions since the chain is now invalid
        clientPredictionsRef.current = [];
        triggerRender();
    }, [triggerRender]);

    // Global Event Listeners
    const { setUI } = useUI();
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const onDragEnd = (e: any) => {
            const { id, clientX, clientY, isIntentional } = e.detail;
            if (id === 'mapper' && isIntentional) {
                const isMob = window.innerWidth <= 768;
                let shouldDock = false;
                if (isMob) {
                    if (clientY > window.innerHeight * 0.8) shouldDock = true;
                } else {
                    // Specific hit detection for the Map Tab on desktop
                    const mapTab = document.getElementById('drawer-tab-map');
                    if (mapTab) {
                        const rect = mapTab.getBoundingClientRect();
                        const buffer = 20;
                        if (clientX >= rect.left - buffer && 
                            clientX <= rect.right + buffer && 
                            clientY >= rect.top - buffer && 
                            clientY <= rect.bottom + buffer) {
                            shouldDock = true;
                        }
                    }
                }

                if (shouldDock) {
                    setIsMapFloating(false);
                    setUI(prev => ({ ...prev, mapExpanded: true }));
                }
            }
        };

        const onDock = () => {
            setIsMapFloating(false);
            setUI(prev => ({ ...prev, mapExpanded: true }));
        };
        const onUndock = () => {
            setIsMapFloating(true);
            setUI(prev => ({ ...prev, mapExpanded: false }));
        };

        // Stable handler refs so the event listener registrations never need to rerun
        const handlersRef = { handleRoomInfo, handleUpdateExits, handleTerrain, pushPendingMove, handleMoveConfirmed, handleMoveFailure, triggerRender };
        const stableHandlers = Object.freeze(handlersRef);

        const onInfo    = (e: any) => stableHandlers.handleRoomInfo(e.detail);
        const onExits   = (e: any) => stableHandlers.handleUpdateExits(e.detail);
        const onTerrain = (e: any) => stableHandlers.handleTerrain(e.detail);
        const onPush    = (e: any) => stableHandlers.pushPendingMove(e.detail);
        const onConfirm = (e: any) => stableHandlers.handleMoveConfirmed(e);
        const onFail    = ()       => stableHandlers.handleMoveFailure();
        const onPre     = (e: any) => { preMoveRef.current = { dir: e.detail.dir, targetId: e.detail.targetId, time: Date.now() }; stableHandlers.triggerRender(); };

        window.addEventListener('mume-mapper-undock', onUndock);
        window.addEventListener('mume-mapper-dock', onDock);
        window.addEventListener('mud-cluster-drag-end', onDragEnd);
        window.addEventListener('mume-mapper-room-info', onInfo); window.addEventListener('mume-mapper-update-exits', onExits);
        window.addEventListener('mume-mapper-terrain', onTerrain); window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-confirmed', onConfirm); window.addEventListener('mume-mapper-move-fail', onFail);
        window.addEventListener('mume-mapper-push-pre-move', onPre);
        return () => {
            window.removeEventListener('mume-mapper-undock', onUndock);
            window.removeEventListener('mume-mapper-dock', onDock);
            window.removeEventListener('mud-cluster-drag-end', onDragEnd);
            window.removeEventListener('mume-mapper-room-info', onInfo); window.removeEventListener('mume-mapper-update-exits', onExits);
            window.removeEventListener('mume-mapper-terrain', onTerrain); window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-confirmed', onConfirm); window.removeEventListener('mume-mapper-move-fail', onFail);
            window.removeEventListener('mume-mapper-push-pre-move', onPre);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setIsMapFloating, setUI]);

    const value = useMemo(() => ({
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation,
        handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, preMoveRef, clientPredictionsRef,
        triggerRender, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef, isMapFloating, setIsMapFloating
    }), [
        rooms, markers, currentRoomId, unveilMap, allowPersistence, handleResetAndSync,
        handleClearMap, handleSyncLocation, handleAddRoom, handleDeleteRoom,
        pushPendingMove, handleMoveConfirmed, handleMoveFailure, renderVersion,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef, preMoveRef,
        spatialIndexRef, firstExploredAtRef, serverIdIndexRef, triggerRender, setCurrentRoomId,
        selectedRoomIds, selectedMarkerId, autoCenter, viewZ, infoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, isMapFloating
    ]);

    return <MapperContext.Provider value={value}>{children}</MapperContext.Provider>;
};

export const useMapper = () => {
    const context = useContext(MapperContext);
    if (!context) throw new Error('useMapper must be used within a MapperProvider');
    return context;
};
