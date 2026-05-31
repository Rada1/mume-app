/**
 * @file Mapper.tsx
 * @description Renders the MUME Mapper.
 * Consumes the shared MapperContext to ensure synchronization across instances.
 */

import React, { useRef, useMemo, useState, useEffect, useCallback, forwardRef } from 'react';
import { Eye, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGame, useLog, useVitals, useUI } from '../../context/GameContext';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useModeStore } from '../../stores/useModeStore';
import { useMapper } from '../../context/useMapper';
import { MapCanvas } from './MapCanvas';
import { MapFilterBar } from './MapFilterBar';
import { MapperContextMenu } from './MapperContextMenu';
import { RoomInfoCard } from './RoomInfoCard';
import { useMapperInteractions } from './useMapperInteractions';
import { useMapperController } from './useMapperController';
import { useSmartWalk } from './hooks/useSmartWalk';
import { useMapperPlayerTracking } from './hooks/useMapperPlayerTracking';
import { DpadCluster } from './DpadCluster';
import { GRID_SIZE } from './mapperUtils';
import { useMapperTracing } from './hooks/useMapperTracing';
import { TracingHUD } from './TracingHUD';
import { useMapAssets } from './hooks/useMapAssets';
import './Mapper.css';

interface MapperProps {
    isMinimized?: boolean;
    setIsMinimized?: (min: boolean) => void;
    characterName?: string;
    isMobile?: boolean;
    isExpanded?: boolean;
    isDesignMode?: boolean;
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
    useMapAssets(imagesRef);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);
    const lastRoomIdRef = useRef<string | null>(null);

    const {
        triggerHaptic, executeCommand, btn, joystick, playClickSound,
        setIsTrackpadModifierActive, roomChars, roomPlayers, roomNpcs, roomItems, inlineCategories, isFoggy, isImmersionMode,
        selectedObjectIds, lighting, inCombat, viewport, gameState
    } = useGame();
    const { isLandscape } = viewport;
    const { target, groupMembers, opponentName, opponentId, deathRoomId } = useVitals();
    const { addMessage } = useLog();
    const { setPopoverState, popoverState, ui } = useUI();
    const { playerColor, npcColor, enemyColor, objectColor, targetColor, showBackgroundImage } = useSettingsStore();
    // The map is always rendered in dark mode regardless of the global app theme.
    const isDarkMode = true;
    const displayPlayerColor = playerColor;
    const displayNpcColor = npcColor;
    const displayEnemyColor = enemyColor;
    const displayObjectColor = objectColor;
    const displayTargetColor = targetColor;
    const treatMapAsExplored = useModeStore(state => state.isSpectating && state.activeView === 'target');
    const isMapLookHeld = heldButton?.id === 'map-long-press' && !heldButton.didFire;
    const [backgroundAlignMode, setBackgroundAlignMode] = useState(false);
    const [isCtrlAlignHeld, setIsCtrlAlignHeld] = useState(false);

    const entitiesRef = useRef({
        roomChars,
        roomPlayers,
        roomNpcs,
        roomItems,
        groupMembers,
        inCombat,
        opponentName,
        opponentId,
        target
    });

    useEffect(() => {
        entitiesRef.current = {
            roomChars,
            roomPlayers,
            roomNpcs,
            roomItems,
            groupMembers,
            inCombat,
            opponentName,
            opponentId,
            target
        };
        window.dispatchEvent(new CustomEvent('mume-mapper-wake'));
    }, [roomChars, roomPlayers, roomNpcs, roomItems, groupMembers, inCombat, opponentName, opponentId, target]);

    // Use shared state from MapperContext
    const context = useMapper();
    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef,
        unveilMap, exploredVnums, handleSyncLocation,
        selectedRoomIds, setSelectedRoomIds, selectedMarkerId, setSelectedMarkerId,
        autoCenter, setAutoCenter, viewZ, setViewZ, infoRoomId, setInfoRoomId,
        renderVersion, triggerRender, activeMapFilter, setActiveMapFilter,
        mapSearchQuery, setMapSearchQuery,
        regionLabels, regionLabelEditMode, setExploredMarkers,
        playerPosRef,
        closestRoomId, filterPathIds, filterPathDistance, matchedRoomIds
    } = context;
    const [selectedRegionLabelId, setSelectedRegionLabelId] = useState<string | null>(null);

    const {
        isTracingMode, calibration, setCalibration, vectors, activePath, hoverCoord,
        anchorRegisterState, setAnchorRegisterState, anchors, onTraceClick, onTraceHover,
        onAddPath, onAddLabel, onClearPath, onUndoPoint, onClearAnchors, onAutoCalibrate,
        onSaveAllToVectorsJson
    } = useMapperTracing(triggerRender);

    useEffect(() => {
        if (!isTracingMode) {
            setIsCtrlAlignHeld(false);
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey) setIsCtrlAlignHeld(true);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (!event.ctrlKey) setIsCtrlAlignHeld(false);
        };
        const onBlur = () => setIsCtrlAlignHeld(false);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [isTracingMode]);

    const { handleCenterOnPlayer } = useMapperPlayerTracking(currentRoomId, rooms, autoCenter, setAutoCenter, cameraRef, canvasRef, playerPosRef, playerTrailRef, lastRoomIdRef, triggerRender, setViewZ, preloadedCoordsRef);
    const revealAll = !!(unveilMap || treatMapAsExplored);
    const { isWalking, walkTargetId, walkPath, startWalking, stopWalking } = useSmartWalk(currentRoomId, rooms, executeCommand, preloadedCoordsRef, addMessage, revealAll, exploredVnums);
    const mode = ui.mapMode || 'play';

    useEffect(() => {
        triggerRender();
    }, [popoverState?.entityId, selectedObjectIds, triggerRender]);

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
        let targetY = (playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2) - (h / (2 * zoom));
        if (isMobile && !isLandscape) {
            const tacticalClearance = 32;
            targetY -= (tacticalClearance / 2) / zoom;
        }
        cameraRef.current.y = targetY;
        cameraRef.current.zoom = zoom;
        (cameraRef.current as any).targetZoom = zoom;
    }, [playerPosRef, canvasRef, cameraRef, isMobile, isLandscape]);

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

    // We still keep the context menu local to the instance for better UX (each window has its own context menu)
    const [localContextMenu, setLocalContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const setContextMenu = setLocalContextMenu;

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers,
        selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId,
        cameraRef, mode, currentRoomId,
        isDesignMode: props.isDesignMode || false,
        isMinimized: effectiveIsMinimized,
        setAutoCenter, setContextMenu,
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
        entitiesRef,
        inlineCategories,
        playerColor: displayPlayerColor,
        npcColor: displayNpcColor,
        activeMapFilter,
        mapSearchQuery,
        isTracingMode,
        backgroundAlignMode,
        calibration,
        setCalibration,
        onTraceClick,
        onTraceHover,
        regionLabels,
        regionLabelEditMode,
        addRegionLabel: context.addRegionLabel,
        updateRegionLabel: context.updateRegionLabel,
        setSelectedRegionLabelId
    });

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: { id, x: wx, y: wy, z, text: 'New Marker', dotSize: 5, fontSize: 12, createdAt: Date.now() }
        }));
        setExploredMarkers(prev => new Set([...prev, id]));
    }, [setMarkers, setExploredMarkers]);

    const effectiveLighting = isImmersionMode ? (gameState === 'account' ? 'moon' : (lighting || 'none')) : 'none';

    return (
        <div className={`mapper-container lighting-state-${effectiveLighting} ${isImmersionMode && isFoggy ? 'foggy' : ''} ${effectiveIsMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!effectiveIsMinimized ? 'full-view' : ''} ${!showBackgroundImage ? 'no-bg-image' : ''}`} style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden', 
            backgroundColor: 'transparent', 
            touchAction: 'none',
            zIndex: infoRoomId ? 2900 : undefined
        }}>
            <div className="mapper-overlay mapper-sun-overlay" />
            <div className="mapper-overlay mapper-moon-overlay" />
            <div className="mapper-overlay mapper-artificial-overlay" />
            <div className="mapper-overlay mapper-dark-overlay" />
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
                isLandscape={isLandscape}
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
                lighting={effectiveLighting}
                isImmersionMode={isImmersionMode}
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
                entitiesRef={entitiesRef}
                serverIdIndexRef={context.serverIdIndexRef}
                inlineCategories={inlineCategories}
                playerColor={displayPlayerColor}
                npcColor={displayNpcColor}
                enemyColor={displayEnemyColor}
                objectColor={displayObjectColor}
                targetColor={displayTargetColor}
                activeInlineEntityId={popoverState?.entityId || null}
                selectedObjectIds={selectedObjectIds}
                deathRoomId={deathRoomId}
                heldButton={heldButton}
                activeMapFilter={activeMapFilter}
                mapSearchQuery={mapSearchQuery}
                closestRoomId={closestRoomId}
                filterPathIds={filterPathIds}
                filterPathDistance={filterPathDistance}
                matchedRoomIds={matchedRoomIds}
                calibration={calibration}
                vectors={vectors}
                isTracingMode={isTracingMode}
                activePath={activePath}
                mapTileOpacity={isTracingMode && (backgroundAlignMode || isCtrlAlignHeld) ? 0.5 : 1}
                regionLabels={regionLabels}
                regionLabelEditMode={regionLabelEditMode}
                selectedRegionLabelId={selectedRegionLabelId}
                joystickActive={joystick?.joystickActive}
            />

            {!isWalking && filterPathIds && filterPathIds.length > 1 && closestRoomId && (
                <div 
                    className="map-go-there-popup"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="map-go-there-info">
                        Shortest Path: {filterPathDistance} {filterPathDistance === 1 ? 'room' : 'rooms'}
                    </div>
                    <button 
                        className="map-go-there-btn"
                        onClick={() => startWalking(closestRoomId, filterPathIds)}
                    >
                        Go there
                    </button>
                </div>
            )}

            {!effectiveIsMinimized && !isMobile && (
                <MapFilterBar
                    activeMapFilter={activeMapFilter}
                    mapSearchQuery={mapSearchQuery}
                    setActiveMapFilter={setActiveMapFilter}
                    setMapSearchQuery={setMapSearchQuery}
                    triggerHaptic={triggerHaptic}
                />
            )}

            {isMapLookHeld && (
                <div className="map-look-hold-indicator" aria-hidden="true">
                    <Eye size={28} strokeWidth={2.25} />
                </div>
            )}

            {isTracingMode && !effectiveIsMinimized && (
                <button
                    className="btn-secondary"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setBackgroundAlignMode(prev => !prev)}
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        zIndex: 10000,
                        width: 'auto',
                        margin: 0,
                        background: backgroundAlignMode ? 'var(--accent)' : 'rgba(0, 0, 0, 0.62)',
                        color: backgroundAlignMode ? '#000' : 'var(--text-primary)',
                        borderColor: backgroundAlignMode ? 'var(--accent)' : 'rgba(255, 255, 255, 0.18)'
                    }}
                    title="Hold Ctrl and drag to align. Hold Ctrl and wheel to scale."
                >
                    {backgroundAlignMode ? 'Align Fade On' : 'Fade Real Map'}
                </button>
            )}

            {(() => {
                if (!currentRoomId) return null;
                const currentRoom = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
                const rawId = String(currentRoomId).replace(/^m_/, '');
                const preloadedRoom = preloadedCoordsRef.current[rawId];
                if (!currentRoom && !preloadedRoom) return null;

                const preloadedExits = preloadedRoom?.[4] || {};
                const localExits = currentRoom?.exits || {};
                const exits = { ...preloadedExits, ...localExits };

                const hasNorth = !!exits['n'] || !!exits['north'];
                const hasSouth = !!exits['s'] || !!exits['south'];
                const hasEast = !!exits['e'] || !!exits['east'];
                const hasWest = !!exits['w'] || !!exits['west'];
                const hasUp = !!exits['u'] || !!exits['up'];
                const hasDown = !!exits['d'] || !!exits['down'];

                return (
                    <>
                        {!joystick?.joystickActive && (
                            <div className="map-swipe-hints-container">
                                <div className={`map-swipe-hint n ${hasNorth ? 'active' : ''}`}>
                                    <ChevronUp className="hint-chevron" size={16} strokeWidth={2.8} />
                                </div>
                                <div className={`map-swipe-hint s ${hasSouth ? 'active' : ''}`}>
                                    <ChevronUp className="hint-chevron" size={16} strokeWidth={2.8} />
                                </div>
                                <div className={`map-swipe-hint e ${hasEast ? 'active' : ''}`}>
                                    <ChevronUp className="hint-chevron" size={16} strokeWidth={2.8} />
                                </div>
                                <div className={`map-swipe-hint w ${hasWest ? 'active' : ''}`}>
                                    <ChevronUp className="hint-chevron" size={16} strokeWidth={2.8} />
                                </div>
                                <div className={`map-swipe-hint up ${hasUp ? 'active' : ''}`}>
                                    <svg className="hint-chevron nw-stair" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 19h-5v-5h-5v-5h-5" />
                                        <path d="M4 12V4h8" />
                                    </svg>
                                </div>
                                <div className={`map-swipe-hint down ${hasDown ? 'active' : ''}`}>
                                    <svg className="hint-chevron se-stair" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 5h5v5h5v5h5" />
                                        <path d="M20 12v8h-8" />
                                    </svg>
                                </div>
                            </div>
                        )}
                        {isMobile && <DpadCluster heldButton={heldButton} setHeldButton={setHeldButton} />}
                    </>
                );
            })()}

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
                    onWalkStart={(rid) => { startWalking(rid); }}
                    stopWalking={stopWalking}
                    walkTargetId={walkTargetId}
                />
            )}

            {!effectiveIsMinimized && !isMobile && (
                <div className="map-z-indicator" style={{
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

            {isTracingMode && (
                <TracingHUD
                    calibration={calibration}
                    setCalibration={setCalibration}
                    activePath={activePath}
                    vectors={vectors}
                    onAddPath={onAddPath}
                    onAddLabel={onAddLabel}
                    onClearPath={onClearPath}
                    onUndoPoint={onUndoPoint}
                    hoverCoord={hoverCoord}
                    anchorRegisterState={anchorRegisterState}
                    setAnchorRegisterState={setAnchorRegisterState}
                    anchors={anchors}
                    onAutoCalibrate={onAutoCalibrate}
                    onClearAnchors={onClearAnchors}
                    onSaveAllToVectorsJson={onSaveAllToVectorsJson}
                />
            )}
        </div>
    );
});

Mapper.displayName = 'Mapper';
