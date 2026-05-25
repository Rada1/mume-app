/**
 * @file MapperContext.tsx
 * @description Centralized state and logic for the MUME Mapper.
 * Ensures synchronization across all Mapper instances (HUD, Drawer).
 */

import React, { createContext, useState, useRef, useEffect, useCallback, useMemo, useContext } from 'react';
import { useGame, useLog, useUI, useVitals } from './GameContext';
import { useMapData } from '../components/Mapper/hooks/useMapData';
import { useMapPersistence } from '../components/Mapper/hooks/useMapPersistence';
import { useMapActions } from '../components/Mapper/hooks/useMapActions';
import { useMapGmcphandlers } from '../components/Mapper/hooks/useMapGmcphandlers';
import { DIRS, getExitTargetId, getGateState } from '../components/Mapper/mapperUtils';
import { MapperPrediction, MapperRoom, MapperMarker, RegionLabel } from '../components/Mapper/mapperTypes';
import { useRegionLabels } from '../components/Mapper/hooks/useRegionLabels';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useModeStore } from '../stores/useModeStore';
import { gmcpBus } from '../events/gmcpBus';
import { useAudioEffects } from '../hooks/useAudioSystem';

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
    loadImportedMapData: (data: Record<string, any>) => void;
    handleClearMap: (force?: boolean) => void;
    handleSyncLocation: (wx: number, wy: number) => void;
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleAddRoom: (wx: number, wy: number, z: number) => string;
    handleDeleteRoom: (id: string) => void;
    pushPendingMove: (dir: string) => void;
    handleMoveConfirmed: (e?: any) => void;
    handleMoveFailure: () => void;
    preMoveRef: React.MutableRefObject<{ dir: string, targetId: string, time: number } | null>;
    clientPredictionsRef: React.MutableRefObject<MapperPrediction[]>;
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
    
    // Filtering & Navigation State
    activeMapFilter: string | null;
    setActiveMapFilter: React.Dispatch<React.SetStateAction<string | null>>;
    mapSearchQuery: string;
    setMapSearchQuery: React.Dispatch<React.SetStateAction<string>>;

    // Region Labels (global, LOTR-style large text)
    regionLabels: Record<string, RegionLabel>;
    regionLabelsRef: React.MutableRefObject<Record<string, RegionLabel>>;
    addRegionLabel: (partial: Partial<RegionLabel> & { text: string; x: number; y: number; z: number }) => string;
    updateRegionLabel: (id: string, patch: Partial<RegionLabel>) => void;
    deleteRegionLabel: (id: string) => void;
    regionLabelEditMode: boolean;
    setRegionLabelEditMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MapperContext = createContext<MapperContextType | undefined>(undefined);

export const MapperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { characterName, executeCommand, showDebugEchoes, isSpectateMode } = useGame();
    const { addMessage } = useLog();
    const { deathRoomId, setDeathRoomId } = useVitals();

    // Stability: capture unstable context values in refs to prevent infinite re-renders 
    // of hooks that depend on them (like loadMasterMap).
    const addMessageRef = useRef(addMessage);
    const showDebugEchoesRef = useRef(showDebugEchoes);
    useEffect(() => { addMessageRef.current = addMessage; }, [addMessage]);
    useEffect(() => { showDebugEchoesRef.current = showDebugEchoes; }, [showDebugEchoes]);

    const isSpectateModeRef = useRef(isSpectateMode);
    useEffect(() => { isSpectateModeRef.current = isSpectateMode; }, [isSpectateMode]);

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
        currentRoomId: dataCurrentRoomId, 
        setCurrentRoomId: dataSetCurrentRoomId, 
        currentRoomIdRef,
        spatialIndexRef, nameIndexRef, serverIdIndexRef, preloadedCoordsRef, baseMapExitsRef
    } = useMapData();

    // High-performance state/ref sync for character position
    const [currentRoomId, setCurrentRoomIdState] = useState<string | null>(null);
    const setCurrentRoomId = useCallback((id: string | null) => {
        setCurrentRoomIdState(id);
        currentRoomIdRef.current = id;
    }, [currentRoomIdRef]);

    // Unified UI State
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);
    const [viewZ, setViewZ] = useState<number | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);

    // Filtering & Navigation State
    const [activeMapFilter, setActiveMapFilter] = useState<string | null>(null);
    const [mapSearchQuery, setMapSearchQuery] = useState<string>('');

    // Region Labels (global, LOTR-style large text overlays)
    const {
        regionLabels, regionLabelsRef,
        addRegionLabel, updateRegionLabel, deleteRegionLabel,
        regionLabelEditMode, setRegionLabelEditMode
    } = useRegionLabels();

    useEffect(() => {
        triggerRender();
    }, [activeMapFilter, mapSearchQuery, triggerRender]);

    // Settings from Zustand
    const allowPersistence = useSettingsStore(s => s.allowMapPersistence);
    const setAllowPersistence = useSettingsStore(s => s.setAllowMapPersistence);
    const unveilMap = useSettingsStore(s => s.unveilMap);
    const setUnveilMap = useSettingsStore(s => s.setUnveilMap);

    // Refs
    const pendingMovesRef = useRef<{ dir: string, time: number, resolved?: boolean }[]>([]);
    const preMoveRef = useRef<{ dir: string, targetId: string, time: number } | null>(null);
    const clientPredictionsRef = useRef<MapperPrediction[]>([]);
    const predictionSeqRef = useRef(0);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const discoverySourceRef = useRef<string | null>(null);
    const firstExploredAtRef = useRef<Record<string, number>>({});
    const snoopedGroupSelfIdRef = useRef<string | null>(null);

    // Master Map Loading
    const hasLoadedRef = useRef(false);
    const hasStartedLoadingRef = useRef(false);
    const loadMasterMap = useCallback(async (force = false) => {
        if ((hasLoadedRef.current || hasStartedLoadingRef.current) && !force) return;
        hasStartedLoadingRef.current = true;

        try {
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', 'Loading Master Map Data...');
            }

            // 1. Load basic room coordinates (JSON)
            // Use underscores exactly as they appear in the public/ directory.
            const res = await fetch('/mume_map_data.json?v=' + Date.now());
            if (!res.ok) throw new Error('No preloaded map data');
            const data = await res.json();

            // --- Zone Name Propagation and Fallbacks ---
            // 1. Queue all rooms that have a valid, non-empty zone name
            const queue: string[] = [];
            for (const vnum in data) {
                const zone = data[vnum][9];
                if (zone && typeof zone === 'string' && zone.trim() !== '') {
                    queue.push(vnum);
                }
            }

            // 2. Propagate zone names along exit connections (BFS)
            let head = 0;
            while (head < queue.length) {
                const curr = queue[head++];
                const currZone = data[curr][9];
                const exits = data[curr][4];
                if (!exits) continue;
                for (const dir in exits) {
                    const exitObj = exits[dir];
                    const target = exitObj && exitObj.target ? String(exitObj.target) : null;
                    if (target && data[target]) {
                        const targetZone = data[target][9];
                        if (!targetZone || typeof targetZone !== 'string' || targetZone.trim() === '') {
                            data[target][9] = currZone;
                            queue.push(target);
                        }
                    }
                }
            }

            // 3. For any remaining empty zones, use 3D geographic proximity search (threshold 30 units)
            const knownRooms: { x: number; y: number; z: number; zone: string }[] = [];
            for (const vnum in data) {
                const r = data[vnum];
                if (r[9] && typeof r[9] === 'string' && r[9].trim() !== '') {
                    knownRooms.push({ x: r[0], y: r[1], z: r[2] || 0, zone: r[9] });
                }
            }

            for (const vnum in data) {
                const r = data[vnum];
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

            preloadedCoordsRef.current = data;
            const index: Record<number, Record<string, string[]>> = {};
            const nIndex: Record<string, string[]> = {};
            const sIndex: Record<string, string> = {};
            const baseMapExits: Record<string, any> = {};

            for (const vnum in data) {
                const rData = data[vnum], [x, y, z] = rData;
                const rName = rData[5];
                const floor = Math.round(z);
                if (!index[floor]) index[floor] = {};
                const bucketX = Math.floor(x / 5), bucketY = Math.floor(y / 5), key = `${bucketX},${bucketY}`;
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
            for (const vnum in data) {
                const rServerId = data[vnum][6];
                if (rServerId && String(rServerId) !== String(vnum)) {
                    sIndex[String(rServerId)] = vnum;
                }
            }
            spatialIndexRef.current = index; 
            nameIndexRef.current = nIndex; 
            serverIdIndexRef.current = sIndex;
            baseMapExitsRef.current = baseMapExits;

            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[Mapper] Ardagmcp Base Map Loaded: ${Object.keys(data).length} rooms.`);
            }
            hasLoadedRef.current = true;
        } catch (err) { 
            console.warn("[Mapper] Could not load master map data:", err);
            hasStartedLoadingRef.current = false; // Allow retry if failed
        }
    }, [preloadedCoordsRef, spatialIndexRef, nameIndexRef, serverIdIndexRef, baseMapExitsRef]);

    useEffect(() => { loadMasterMap(); }, [loadMasterMap]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const debugWindow = window as Window & {
            __mumeMapperDebug?: () => Record<string, unknown>;
        };

        debugWindow.__mumeMapperDebug = () => {
            const currentId = currentRoomIdRef.current;
            const rawId = currentId?.replace(/^m_/, '') || null;
            return {
                currentId,
                rawId,
                room: currentId ? roomsRef.current[currentId] || roomsRef.current[`m_${currentId}`] || null : null,
                preloadedRoom: rawId ? preloadedCoordsRef.current[rawId] || null : null,
                preMove: preMoveRef.current,
                predictions: clientPredictionsRef.current,
                pendingMoves: pendingMovesRef.current,
                serverMatch: rawId ? serverIdIndexRef.current[rawId] || null : null,
                mapLoaded: hasLoadedRef.current,
                preloadedCount: Object.keys(preloadedCoordsRef.current).length
            };
        };

        return () => {
            delete debugWindow.__mumeMapperDebug;
        };
    }, [clientPredictionsRef, currentRoomIdRef, preloadedCoordsRef, roomsRef, serverIdIndexRef]);

    // Actions
    const { handleAddRoom, handleDeleteRoom, handleClearMap, handleSyncLocation, handleResetAndSync, loadImportedMapData } = useMapActions({
        rooms, setRooms, roomsRef, markers, setMarkers, markersRef, setExploredVnums, setExploredMarkers, setCurrentRoomId, currentRoomIdRef,
        preloadedCoordsRef, spatialIndexRef, baseMapExitsRef, addMessage, lastDetectedTerrainRef, loadMasterMap
    });

    const resolvePredictionCoords = useCallback((targetId: string) => {
        const targetRoom = roomsRef.current[targetId];
        if (targetRoom) return { x: targetRoom.x, y: targetRoom.y, z: targetRoom.z || 0 };

        const rawVnum = targetId.startsWith('m_') ? targetId.substring(2) : targetId;
        const coords = preloadedCoordsRef.current[rawVnum];
        return coords ? { x: coords[0], y: coords[1], z: coords[2] || 0 } : null;
    }, [preloadedCoordsRef, roomsRef]);

    const clearPrediction = useCallback((confirmedRoomId?: string | null) => {
        const prediction = clientPredictionsRef.current[0];
        if (!prediction) {
            preMoveRef.current = null;
            return;
        }

        if (confirmedRoomId) {
            const normalizedConfirmed = confirmedRoomId.replace(/^m_/, '');
            const normalizedPrediction = prediction.toId.replace(/^m_/, '');
            if (normalizedConfirmed !== normalizedPrediction) return;
        }

        if (clientPredictionsRef.current.length > 0) {
            clientPredictionsRef.current = clientPredictionsRef.current.slice(1);
            const nextPrediction = clientPredictionsRef.current[0];
            preMoveRef.current = nextPrediction
                ? { dir: nextPrediction.dir, targetId: nextPrediction.toId, time: nextPrediction.createdAt }
                : null;
            triggerRender();
        } else {
            preMoveRef.current = null;
        }
    }, [triggerRender]);

    const onRoomInfoProcessed = useCallback((confirmedRoomId?: string | null) => {
        clearPrediction(confirmedRoomId);
    }, [clearPrediction]);

    const { activeView } = useModeStore();
    const { playLoadFlagSound } = useAudioEffects();

    const [newlyExploredRoomId, setNewlyExploredRoomId] = useState<string | null>(null);
    const newlyExploredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFirstVisitLoadFlag = useCallback((roomId: string) => {
        // Synchronize sound trigger with the 100ms bouncy animation delay
        setTimeout(() => {
            playLoadFlagSound();
        }, 100);
        setNewlyExploredRoomId(roomId);
        if (newlyExploredTimerRef.current) clearTimeout(newlyExploredTimerRef.current);
        newlyExploredTimerRef.current = setTimeout(() => setNewlyExploredRoomId(null), 2000);
    }, [playLoadFlagSound]);

    const masterHandlers = useMapGmcphandlers({
        roomsRef, setRooms, currentRoomIdRef, setCurrentRoomId, pendingMovesRef, preloadedCoordsRef,
        discoverySourceRef, exploredRef, setExploredVnums, lastDetectedTerrainRef, addMessage,
        showDebugEchoes, nameIndexRef, serverIdIndexRef, firstExploredAtRef, triggerRender,
        onRoomInfoProcessed, onFirstVisitLoadFlag: handleFirstVisitLoadFlag, preMoveRef, deathRoomId, setDeathRoomId,
        clientPredictionsRef, baseMapExitsRef, characterName: characterName || null, executeCommand,
        activeView
    });

    const pushPendingMove = useCallback((dir: string) => {
        masterHandlers.pushPendingMove(dir);
    }, [masterHandlers]);

    const handleMoveConfirmed = useCallback((e?: any) => {
        masterHandlers.handleMoveConfirmed(e);
    }, [masterHandlers]);

    const handleMoveFailure = useCallback(() => {
        pendingMovesRef.current.shift();
        preMoveRef.current = null;
        clientPredictionsRef.current = [];
        triggerRender();
    }, [triggerRender]);

    // Global Event Listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const onInfo    = (e: any) => masterHandlers.handleRoomInfo(e.detail);
        const onExits   = (e: any) => masterHandlers.handleUpdateExits(e.detail);
        const onTerrain = (e: any) => masterHandlers.handleTerrain(e.detail);
        const onPush    = (e: any) => {
            const dir = e.detail;
            pushPendingMove(dir);

            const predictionTail = clientPredictionsRef.current[clientPredictionsRef.current.length - 1];
            const currentRoomId = predictionTail?.toId || currentRoomIdRef.current;
            const rooms = roomsRef.current;
            const preloaded = preloadedCoordsRef.current;
            if (!currentRoomId || !rooms || !preloaded) return;

            const room = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const wEx = preloaded[rawId]?.[4]?.[dir];
            const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, dir, rooms, preloaded);
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] push ${dir}: room=${currentRoomId} exit=${hasExit ? 'yes' : 'no'} door=${hasDoor ? (isClosed ? 'closed' : 'open') : 'no'}`);
            }
            if (!hasExit || (hasDoor && isClosed)) return;

            const exA = room?.exits?.[dir] || wEx;
            const targetId = getExitTargetId(exA);
            if (!targetId) return;

            const targetKey = String(targetId).replace(/^m_/, '');
            const internalTargetId = serverIdIndexRef.current[targetKey] || targetKey;
            const finalTargetId = String(internalTargetId).startsWith('m_') ? String(internalTargetId) : `m_${internalTargetId}`;
            onPre({ detail: { dir, targetId: finalTargetId } });
        };
        const onConfirm = (e: any) => handleMoveConfirmed(e);
        const onFail    = ()       => handleMoveFailure();
        const onPre     = (e: any) => {
            const { dir, targetId } = e.detail;
            const createdAt = Date.now();
            const seq = predictionSeqRef.current + 1;
            predictionSeqRef.current = seq;
            const wasQueueEmpty = clientPredictionsRef.current.length === 0;
            if (wasQueueEmpty) {
                preMoveRef.current = { dir, targetId, time: createdAt };
            }
            if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] received ${dir} -> ${targetId}`);
            }

            const coords = resolvePredictionCoords(targetId);
            if (coords) {
                const prediction = { dir, toId: targetId, toX: coords.x, toY: coords.y, toZ: coords.z, createdAt, seq };
                const existingTail = clientPredictionsRef.current[clientPredictionsRef.current.length - 1];
                clientPredictionsRef.current = existingTail?.toId === targetId
                    ? [...clientPredictionsRef.current.slice(0, -1), prediction]
                    : [...clientPredictionsRef.current, prediction];
                if (showDebugEchoesRef.current) {
                    addMessageRef.current?.('system', `[MapperPredict] stored queued coords ${coords.x},${coords.y},${coords.z || 0}`);
                }
            } else if (showDebugEchoesRef.current) {
                addMessageRef.current?.('system', `[MapperPredict] no coords for ${targetId}`);
            }

            triggerRender();
        };

        window.addEventListener('mume-gmcp-room-info', onInfo);
        window.addEventListener('mume-gmcp-room-exits', onExits);
        window.addEventListener('mume-gmcp-terrain', onTerrain);
        window.addEventListener('mume-mapper-push-move', onPush);
        window.addEventListener('mume-mapper-move-confirmed', onConfirm);
        window.addEventListener('mume-mapper-move-failed', onFail);
        window.addEventListener('mume-mapper-push-pre-move', onPre);

        return () => {
            window.removeEventListener('mume-gmcp-room-info', onInfo);
            window.removeEventListener('mume-gmcp-room-exits', onExits);
            window.removeEventListener('mume-gmcp-terrain', onTerrain);
            window.removeEventListener('mume-mapper-push-move', onPush);
            window.removeEventListener('mume-mapper-move-confirmed', onConfirm);
            window.removeEventListener('mume-mapper-move-failed', onFail);
            window.removeEventListener('mume-mapper-push-pre-move', onPre);
        };
    }, [masterHandlers, pushPendingMove, handleMoveConfirmed, handleMoveFailure, resolvePredictionCoords, triggerRender]);

    const applyActiveMapId = useCallback((mapid: string | number, isSnooped: boolean) => {
        const shouldApply = (isSnooped && activeView === 'target') || (!isSnooped && activeView === 'self');
        if (!shouldApply || mapid === undefined || mapid === null) return;

        const mapKey = String(mapid);
        const vnum = serverIdIndexRef.current?.[mapKey] || (preloadedCoordsRef.current[mapKey] ? mapKey : null);
        if (!vnum) return;

        const nextRoomId = `m_${vnum}`;
        if (currentRoomIdRef.current === nextRoomId) return;

        setCurrentRoomId(nextRoomId);
        triggerRender();
    }, [activeView, currentRoomIdRef, preloadedCoordsRef, serverIdIndexRef, setCurrentRoomId, triggerRender]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const onActiveMapId = (event: Event) => {
            const detail = (event as CustomEvent<{ mapid?: string | number; spectating?: boolean }>).detail;
            if (detail?.mapid === undefined || detail.mapid === null) return;
            applyActiveMapId(detail.mapid, !!detail.spectating);
        };

        window.addEventListener('mume-mapper-active-mapid', onActiveMapId);
        return () => window.removeEventListener('mume-mapper-active-mapid', onActiveMapId);
    }, [applyActiveMapId]);

    useEffect(() => {
        const getSelfMapId = (payload: any): string | number | null => {
            const members = Array.isArray(payload) ? payload : [payload];
            const self = members.find(member => {
                if (!member) return false;
                if (member.type === 'you') return true;
                return snoopedGroupSelfIdRef.current !== null &&
                    member.id !== undefined &&
                    String(member.id) === snoopedGroupSelfIdRef.current;
            });
            if (self?.id !== undefined && self?.id !== null) {
                snoopedGroupSelfIdRef.current = String(self.id);
            }
            return self?.mapid ?? self?.roomid ?? self?.room_id ?? self?.rid ?? self?.vnum ?? self?.map_id ?? self?.room ?? null;
        };

        const isSnooped = (payload: any) => !!(payload?.isSnooped || payload?.spectating);
        const handleGroupPayload = (payload: any) => {
            if (!isSnooped(payload)) return;
            const mapid = getSelfMapId(payload);
            if (mapid !== null && mapid !== undefined) applyActiveMapId(mapid, true);
        };

        const unsubs = [
            gmcpBus.on('Group.Set', handleGroupPayload),
            gmcpBus.on('Group.Add', handleGroupPayload),
            gmcpBus.on('Group.Update', handleGroupPayload)
        ];

        return () => unsubs.forEach(unsub => unsub());
    }, [applyActiveMapId]);

    const value = useMemo(() => ({
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId, newlyExploredRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation, loadImportedMapData,
        handleRoomInfo: masterHandlers.handleRoomInfo,
        handleUpdateExits: masterHandlers.handleUpdateExits, 
        handleTerrain: masterHandlers.handleTerrain,
        handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, preMoveRef, clientPredictionsRef,
        triggerRender, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef,
        activeMapFilter, setActiveMapFilter, mapSearchQuery, setMapSearchQuery,
        regionLabels, regionLabelsRef, addRegionLabel, updateRegionLabel, deleteRegionLabel,
        regionLabelEditMode, setRegionLabelEditMode
    }), [
        rooms, setRooms, markers, setMarkers, currentRoomId, setCurrentRoomId, newlyExploredRoomId,
        currentRoomIdRef, roomsRef, preloadedCoordsRef, baseMapExitsRef,
        unveilMap, setUnveilMap, allowPersistence, setAllowPersistence,
        handleResetAndSync, handleClearMap, handleSyncLocation, loadImportedMapData,
        masterHandlers, handleAddRoom, handleDeleteRoom, pushPendingMove,
        handleMoveConfirmed, handleMoveFailure, renderVersion,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        markersRef, exploredRef, exploredVnums, exploredMarkers, setExploredMarkers, spatialIndexRef, firstExploredAtRef,
        serverIdIndexRef,
        activeMapFilter, setActiveMapFilter, mapSearchQuery, setMapSearchQuery,
        regionLabels, regionLabelsRef, addRegionLabel, updateRegionLabel, deleteRegionLabel,
        regionLabelEditMode, setRegionLabelEditMode
    ]);

    // --- Proximity Reveal for Markers ---
    useEffect(() => {
        if (unveilMap) return;
        if (!currentRoomId) return;

        let px: number, py: number, pz: number;
        const r = rooms[currentRoomId];
        if (r) {
            px = r.x;
            py = r.y;
            pz = r.z || 0;
        } else {
            const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
            const pData = preloadedCoordsRef.current[rawId];
            if (pData) {
                px = pData[0];
                py = pData[1];
                pz = pData[2] || 0;
            } else {
                return;
            }
        }

        const discoveryRadius = 15; // Reveal when within 15 rooms
        const newlyDiscovered: string[] = [];

        Object.values(markers).forEach((marker: any) => {
            if (exploredMarkers.has(marker.id)) return;
            
            // Check Z level difference
            if (Math.abs((marker.z || 0) - pz) >= 1.0) return;

            // Calculate Euclidean distance
            const dx = marker.x - px;
            const dy = marker.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= discoveryRadius) {
                newlyDiscovered.push(marker.id);
            }
        });

        if (newlyDiscovered.length > 0) {
            setExploredMarkers(prev => {
                const next = new Set(prev);
                newlyDiscovered.forEach(id => next.add(id));
                return next;
            });
            triggerRender();
        }
    }, [currentRoomId, rooms, markers, exploredMarkers, setExploredMarkers, unveilMap, preloadedCoordsRef, triggerRender]);

    // --- Sync with Active Session ---
    // When the active view switches (Me -> Target), the mapper needs to snap to the
    // room currently being seen by the active session.
    const { roomNum, spectateRoomNum } = useGame();

    useEffect(() => {
        const activeRoomNum = activeView === 'target' ? spectateRoomNum : roomNum;
        if (activeRoomNum && activeRoomNum !== 0) {
            const vnum = serverIdIndexRef.current?.[String(activeRoomNum)];
            if (vnum) {
                setCurrentRoomId(`m_${vnum}`); // This now updates both state and ref
            }
        }
    }, [roomNum, spectateRoomNum, activeView, setCurrentRoomId]);
    return <MapperContext.Provider value={value}>{children}</MapperContext.Provider>;
};

export const useMapper = () => {
    const context = useContext(MapperContext);
    if (context === undefined) {
        throw new Error('useMapper must be used within a MapperProvider');
    }
    return context;
};
