/**
 * @file Mapper.tsx
 * @description Renders the MUME Mapper.
 * Consumes the shared MapperContext to ensure synchronization across instances.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback, forwardRef } from 'react';
import { Eye } from 'lucide-react';
import { useGame, useLog, useVitals, useUI } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useModeStore } from '../../stores/useModeStore';
import { useMapper } from '../../context/useMapper';
import { MapCanvas } from './MapCanvas';
import { MapperContextMenu } from './MapperContextMenu';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapperInteractions } from './useMapperInteractions';
import { useMapperController } from './useMapperController';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useMapperPlayerTracking } from './hooks/useMapperPlayerTracking';
import { DpadCluster } from './DpadCluster';
import { GRID_SIZE } from './mapperUtils';
import { toThemeLinkedColor } from '../../utils/themeLinkedColors';
import './Mapper.css';

interface MapperProps {
    isMinimized?: boolean;
    setIsMinimized?: (min: boolean) => void;
    characterName?: string;
    isMobile?: boolean;
    isExpanded?: boolean;
    isDesignMode?: boolean;
    isMmapperMode?: boolean;
    heldButton?: any;
    setHeldButton?: (val: any) => void;
    heldButtonRef?: React.MutableRefObject<any>;
    setCommandPreview?: (val: string | null) => void;
}

export interface MapperHandle {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
}

export const Mapper = forwardRef<MapperHandle, MapperProps>((props, ref) => {
    const { isMinimized: isMinimizedProp, characterName, isMobile: isMobileProp, isExpanded, heldButton, heldButtonRef, setHeldButton, setCommandPreview } = props;
    const effectiveIsMinimized = isMinimizedProp ?? (isExpanded !== undefined ? !isExpanded : false);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const setIsDraggingWithRef = useCallback((val: boolean) => {
        isDraggingRef.current = val;
        setIsDragging(val);
    }, []);
    const [isMobile] = useState(() => isMobileProp ?? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const cardRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);
    const lastRoomIdRef = useRef<string | null>(null);

    const {
        triggerHaptic, executeCommand, theme, btn, joystick, playClickSound,
        setIsTrackpadModifierActive, lighting, roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, isFoggy, isImmersionMode,
        selectedObjectIds
    } = useGame();
    const { target, groupMembers, opponentName, opponentId, deathRoomId } = useVitals();
    const { addMessage } = useLog();
    const { setPopoverState, popoverState, ui } = useUI();
    const { playerColor, npcColor, enemyColor, objectColor } = useSettingsStore();
    const isDarkMode = theme === 'dark';
    const displayPlayerColor = toThemeLinkedColor(playerColor, theme) || playerColor;
    const displayNpcColor = toThemeLinkedColor(npcColor, theme) || npcColor;
    const displayEnemyColor = toThemeLinkedColor(enemyColor, theme) || enemyColor;
    const displayObjectColor = toThemeLinkedColor(objectColor, theme) || objectColor;
    const treatMapAsExplored = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const isMapLookHeld = heldButton?.id === 'map-long-press' && !heldButton.didFire;

    // Use shared state from MapperContext
    const context = useMapper();
    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef,
        unveilMap, handleSyncLocation,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        renderVersion, triggerRender
    } = context;

    const { handleCenterOnPlayer } = useMapperPlayerTracking(currentRoomId, rooms, autoCenter, setAutoCenter, cameraRef, canvasRef, playerPosRef, playerTrailRef, lastRoomIdRef, triggerRender, setViewZ, preloadedCoordsRef);
    const { walkTargetId, walkPath, startWalking, stopWalking } = useSmartWalk(currentRoomId, rooms, executeCommand, preloadedCoordsRef, addMessage);
    const mode = ui.mapMode || 'play';

    const roomEntitySignature = useMemo(() => {
        const summarize = (items: import('../../types').GmcpOccupant[] = []) => items
            .map(item => `${item.id ?? ''}:${item.name ?? item.short ?? item.keyword ?? ''}:${item.type ?? ''}`)
            .join('|');
        const summarizeChars = (chars: Record<number, import('../../types').GmcpOccupant> = {}) => Object.values(chars)
            .map(item => `${item.id ?? ''}:${item.name ?? item.short ?? item.keyword ?? ''}:${item.type ?? ''}:${item.pc ?? ''}:${item.status ?? ''}:${item.hp ?? ''}`)
            .join('|');
        const summarizeGroup = (items: import('../../types').GroupMember[] = []) => items
            .map(item => `${item.id ?? ''}:${item.name ?? item.label ?? ''}:${item.type ?? ''}:${item.mapid ?? ''}:${item.room ?? ''}`)
            .join('|');

        return [
            summarizeChars(roomChars),
            summarize(roomPlayers),
            summarize(roomNpcs),
            summarize(roomItems),
            summarizeGroup(groupMembers)
        ].join('::');
    }, [roomChars, roomPlayers, roomNpcs, roomItems, groupMembers]);

    useEffect(() => {
        triggerRender();
    }, [roomEntitySignature, popoverState?.entityId, selectedObjectIds, triggerRender]);

    const controllerOptions = useMemo(() => ({
        onRecenter: handleCenterOnPlayer,
        triggerRender
    }), [handleCenterOnPlayer, triggerRender]);

    useMapperController(characterName ?? null, ref, controllerOptions);

    useEffect(() => {
        const onCenter = () => handleCenterOnPlayer();
        window.addEventListener('mume-mapper-center-on-player', onCenter);
        return () => window.removeEventListener('mume-mapper-center-on-player', onCenter);
    }, [handleCenterOnPlayer]);

    // Zoom-in while the swipe wheel is active (heldButton set on mobile only)
    const savedZoomRef = useRef<number | null>(null);
    const holdZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const snapCameraToPlayer = useCallback((zoom: number) => {
        if (!playerPosRef.current || !canvasRef.current) return;
        // Use clientWidth/Height — identical to canvas.width/getDPR() used by the animation loop
        const w = canvasRef.current.clientWidth;
        const h = canvasRef.current.clientHeight;
        cameraRef.current.x = (playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2) - (w / (2 * zoom));
        cameraRef.current.y = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));
        cameraRef.current.zoom = zoom;
    }, [playerPosRef, canvasRef, cameraRef]);

    useEffect(() => {
        if (!isMobile) return;
        if (heldButton) {
            if (savedZoomRef.current !== null || holdZoomTimerRef.current) return;
            holdZoomTimerRef.current = setTimeout(() => {
                holdZoomTimerRef.current = null;
                savedZoomRef.current = cameraRef.current.zoom;
                snapCameraToPlayer(2.8);
                triggerRender();
            }, 100);
        } else {
            if (holdZoomTimerRef.current) {
                clearTimeout(holdZoomTimerRef.current);
                holdZoomTimerRef.current = null;
            }
            if (savedZoomRef.current !== null) {
                const target = savedZoomRef.current;
                savedZoomRef.current = null;
                snapCameraToPlayer(target);
                triggerRender();
            }
        }
    }, [heldButton, isMobile, cameraRef, triggerRender, snapCameraToPlayer]);

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers,
        selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId,
        cameraRef, mode, currentRoomId,
        isDesignMode: props.isDesignMode || false,
        isMinimized: effectiveIsMinimized,
        setAutoCenter, setContextMenu: (menu: any) => { },
        setInfoRoomId,
        triggerHaptic: triggerHaptic ?? (() => { }),
        canvasRef, cardRef, setIsDragging: setIsDraggingWithRef, handleAddRoom,
        triggerRender, viewZ, setViewZ,
        preloadedCoordsRef,
        spatialIndexRef: context.spatialIndexRef,
        startWalking, stopWalking,
        executeCommand, joystick, btn, heldButton, heldButtonRef, setHeldButton, target,
        setIsTrackpadModifierActive,
        popoverState,
        setPopoverState,
        setActiveSet: btn.setActiveSet,
        playClickSound,
        characterName: characterName ?? null,
        roomChars,
        roomPlayers,
        roomNpcs,
        groupMembers,
        inlineCategories,
        playerColor: displayPlayerColor,
        npcColor: displayNpcColor
    });

    // We still keep the context menu local to the instance for better UX (each window has its own context menu)
    const [localContextMenu, setLocalContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);

    // Re-bind setContextMenu to local for interactions
    const setContextMenu = setLocalContextMenu;

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: { id, x: wx, y: wy, z, text: 'New Marker', dotSize: 5, fontSize: 12, createdAt: Date.now() }
        }));
    }, [setMarkers]);

    return (
        <div className={`mapper-container lighting-state-none ${isImmersionMode && isFoggy ? 'foggy' : ''} ${effectiveIsMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!effectiveIsMinimized ? 'full-view' : ''}`} style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            backgroundColor: 'transparent', 
            touchAction: 'none' 
        }}>
            <div className="mapper-overlay mapper-fog-overlay" />
            <MapCanvas
                ref={canvasRef}
                rooms={rooms}
                markers={markers}
                currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds}
                selectedMarkerId={selectedMarkerId}
                camera={cameraRef}
                isDarkMode={isDarkMode}
                isMobile={isMobile}
                imagesRef={imagesRef}
                characterName={characterName ?? null}
                playerPosRef={playerPosRef}
                playerTrailRef={playerTrailRef}
                renderVersion={renderVersion}
                isDragging={isDragging}
                isDraggingRef={isDraggingRef}
                marquee={marquee}
                autoCenter={autoCenter}
                stableRoomsRef={roomsRef}
                stableRoomIdRef={currentRoomIdRef}
                stableMarkersRef={markersRef}
                preloadedCoordsRef={preloadedCoordsRef}
                spatialIndexRef={context.spatialIndexRef}
                exploredVnums={context.exploredRef.current}
                exploredRef={context.exploredRef}
                exploredMarkers={context.exploredMarkers}
                triggerRender={triggerRender}
                unveilMap={unveilMap}
                treatMapAsExplored={treatMapAsExplored}
                viewZ={viewZ}
                firstExploredAtRef={context.firstExploredAtRef}
                preMoveRef={context.preMoveRef}
                clientPredictionsRef={context.clientPredictionsRef}
                walkTargetId={walkTargetId}
                walkPath={walkPath}
                baseMapExitsRef={context.baseMapExitsRef}
                groupMembers={groupMembers}
                serverIdIndexRef={context.serverIdIndexRef}
                roomChars={roomChars}
                roomPlayers={roomPlayers}
                roomNpcs={roomNpcs}
                roomItems={roomItems}
                inlineCategories={inlineCategories}
                playerColor={displayPlayerColor}
                npcColor={displayNpcColor}
                enemyColor={displayEnemyColor}
                objectColor={displayObjectColor}
                opponentName={opponentName}
                opponentId={opponentId}
                activeInlineEntityId={popoverState?.entityId || null}
                selectedObjectIds={selectedObjectIds}
                deathRoomId={deathRoomId}
                heldButton={heldButton}
            />

            {isMapLookHeld && (
                <div className="map-look-hold-indicator" aria-hidden="true">
                    <Eye size={28} strokeWidth={2.25} />
                </div>
            )}

            {isMobile && currentRoomId && (rooms[currentRoomId] || rooms[`m_${currentRoomId}`] || preloadedCoordsRef.current[String(currentRoomId).replace(/^m_/, '')]) && (
                <DpadCluster heldButton={heldButton} setHeldButton={setHeldButton} />
            )}

            {localContextMenu && (
                <MapperContextMenu
                    x={localContextMenu.x}
                    y={localContextMenu.y}
                    roomId={localContextMenu.roomId}
                    onClose={() => setLocalContextMenu(null)}
                    onDelete={() => { if (localContextMenu.roomId) handleDeleteRoom(localContextMenu.roomId); setLocalContextMenu(null); triggerRender(); }}
                    onInfo={() => { setInfoRoomId(localContextMenu.roomId); setLocalContextMenu(null); }}
                    onAddMarker={() => { handleAddMarker(localContextMenu.wx, localContextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0)); setLocalContextMenu(null); triggerRender(); }}
                    onAddRoom={() => { handleAddRoom(localContextMenu.wx, localContextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0)); setLocalContextMenu(null); triggerRender(); }}
                    onSyncLocation={() => { handleSyncLocation(localContextMenu.wx, localContextMenu.wy); setLocalContextMenu(null); triggerRender(); }}
                    onWalkStart={(rid) => { startWalking(rid); }}
                    onWalkEnd={() => { stopWalking(); setLocalContextMenu(null); }}
                    mode={mode}
                    isDarkMode={isDarkMode}
                />
            )}

            {infoRoomId && (
                <RoomInfoCard
                    roomId={infoRoomId}
                    rooms={rooms}
                    setRooms={setRooms}
                    mode={mode}
                    onClose={() => setInfoRoomId(null)}
                    cardRef={cardRef}
                    preloadedCoordsRef={preloadedCoordsRef}
                    setViewZ={setViewZ}
                    isDarkMode={isDarkMode}
                />
            )}

            {!effectiveIsMinimized && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    background: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.75)',
                    padding: '4px 8px',
                    zIndex: 9999,
                    fontSize: '10px',
                    pointerEvents: 'none',
                    borderRadius: '4px',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)',
                    fontFamily: 'monospace',
                    opacity: 0.8
                }}>
                    Z: {viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? (rooms[currentRoomId].z || 0).toFixed(1) : '0.0')}
                </div>
            )}
        </div>
    );
});

Mapper.displayName = 'Mapper';
