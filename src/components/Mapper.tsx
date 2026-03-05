import React, { useState, useRef, useCallback, forwardRef, useEffect } from 'react';
import { MapperRef, MapperProps } from './Mapper/mapperTypes';
import { GRID_SIZE, PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from './Mapper/mapperUtils';
import { useMapperController } from './Mapper/useMapperController';
import { useMapperInteractions } from './Mapper/useMapperInteractions';
import { MapCanvas } from './Mapper/MapCanvas';
import { MapperToolbar } from './Mapper/MapperToolbar';
import { MapperDropdown } from './Mapper/MapperDropdown';
import { MapperContextMenu } from './Mapper/MapperContextMenu';
import { RoomInfoCard } from './Mapper/RoomInfoCard';
import { useGame } from '../context/GameContext';

export const Mapper = React.memo(forwardRef<MapperRef, MapperProps>(({
    isDesignMode, characterName, isExpanded, isMobile
}, ref) => {
    const [mode, setMode] = useState<'edit' | 'play'>(isDesignMode ? 'edit' : 'play');
    const [isMinimized, setIsMinimized] = useState(() => localStorage.getItem('mume_mapper_minimized') === 'true');
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('mume_mapper_dark_mode') !== 'false');
    const [autoCenter, setAutoCenter] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [renderVersion, setRenderVersion] = useState(0);

    const triggerRender = useCallback(() => setRenderVersion(v => v + 1), []);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);

    const { addMessage } = useGame();
    const controller = useMapperController(characterName ?? null, ref, addMessage);
    const { rooms, setRooms, markers, setMarkers, currentRoomId, allowPersistence, setAllowPersistence, cameraRef, handleAddRoom, handleDeleteRoom, roomsRef, currentRoomIdRef, markersRef } = controller;

    useEffect(() => {
        const all = [...PEAK_IMAGES, ...FOREST_IMAGES, ...HILL_IMAGES];
        all.forEach(src => {
            if (!imagesRef.current[src]) {
                const img = new Image(); img.src = src;
                img.onload = () => triggerRender(); imagesRef.current[src] = img;
            }
        });
    }, [triggerRender]);

    // Handle Player Position & Trail
    useEffect(() => {
        if (currentRoomId && rooms[currentRoomId]) {
            const r = rooms[currentRoomId];
            if (playerPosRef.current) {
                // Add old position to trail
                playerTrailRef.current.push({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    z: playerPosRef.current.z,
                    alpha: 1.0
                });
            } else {
                // Initial load: jump to current room
                playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };
            }
            triggerRender();
        }
    }, [currentRoomId, rooms]);

    const triggerHaptic = (duration: number = 20) => {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(duration);
    };

    const { marquee } = useMapperInteractions({
        rooms, setRooms, markers, setMarkers, selectedRoomIds, setSelectedRoomIds,
        selectedMarkerId, setSelectedMarkerId, cameraRef, mode, currentRoomId,
        isDesignMode: !!isDesignMode, isMinimized, setAutoCenter, setContextMenu, setInfoRoomId,
        triggerHaptic, canvasRef, cardRef, setIsDragging, handleAddRoom, triggerRender
    });

    const onCenterClick = useCallback(() => {
        setAutoCenter(!autoCenter);
        if (!autoCenter && currentRoomId && rooms[currentRoomId]) {
            const r = rooms[currentRoomId];
            cameraRef.current.x = r.x * GRID_SIZE + GRID_SIZE / 2;
            cameraRef.current.y = r.y * GRID_SIZE + GRID_SIZE / 2;
            triggerRender();
        }
    }, [autoCenter, currentRoomId, rooms, triggerRender]);


    const handleAddMarker = useCallback((x: number, y: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({ ...prev, [id]: { id, x: x / GRID_SIZE, y: y / GRID_SIZE, z, text: 'New Marker', dotSize: 6, fontSize: 16, createdAt: Date.now() } }));
    }, [setMarkers]);

    const handleExportMap = () => {
        const data = JSON.stringify({ rooms, markers }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mud_map_${characterName || 'default'}.json`; a.click();
    };

    const handleImportMap = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => { try { const parsed = JSON.parse(re.target?.result as string); if (parsed.rooms) setRooms(parsed.rooms); if (parsed.markers) setMarkers(parsed.markers); } catch (e) { } };
        reader.readAsText(file);
    };

    if (isMinimized && !isMobile) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => setIsMinimized(false)} style={{ padding: '12px', backgroundColor: 'rgba(30, 30, 46, 0.6)', border: '1px solid rgba(137, 180, 250, 0.4)', borderRadius: '14px', cursor: 'pointer', color: '#89b4fa' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon></svg>
                </button>
            </div>
        );
    }

    return (
        <div className="mapper-container" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <MapCanvas
                ref={canvasRef}
                rooms={rooms} markers={markers} currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds} selectedMarkerId={selectedMarkerId}
                camera={cameraRef} isDarkMode={isDarkMode} isMobile={!!isMobile}
                imagesRef={imagesRef} characterName={characterName ?? null}
                playerPosRef={playerPosRef} playerTrailRef={playerTrailRef}
                renderVersion={renderVersion} isDragging={isDragging} marquee={marquee}
                autoCenter={autoCenter} triggerRender={triggerRender}
                stableRoomsRef={roomsRef} stableRoomIdRef={currentRoomIdRef} stableMarkersRef={markersRef}
            />
            <MapperToolbar
                mode={mode} setMode={setMode} autoCenter={autoCenter}
                setAutoCenter={setAutoCenter} setIsMinimized={setIsMinimized}
                isMobile={!!isMobile} isExpanded={!!isExpanded}
                onCenterClick={onCenterClick}
                onAddRoom={() => {
                    handleAddRoom(cameraRef.current.x, cameraRef.current.y, (currentRoomId && rooms[currentRoomId]) ? (rooms[currentRoomId].z || 0) : 0);
                    triggerRender();
                }}
                setIsDropdownOpen={setIsDropdownOpen}
            />
            <MapperDropdown isOpen={isDropdownOpen} setIsOpen={setIsDropdownOpen} allowPersistence={allowPersistence} setAllowPersistence={setAllowPersistence} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} exportMap={handleExportMap} importMap={handleImportMap} clearMap={() => setRooms({})} />
            {contextMenu && <MapperContextMenu x={contextMenu.x} y={contextMenu.y} roomId={contextMenu.roomId} onClose={() => setContextMenu(null)} onDelete={() => { if (contextMenu.roomId) handleDeleteRoom(contextMenu.roomId); setContextMenu(null); triggerRender(); }} onInfo={() => { setInfoRoomId(contextMenu.roomId); setContextMenu(null); }} onAddMarker={() => { handleAddMarker(contextMenu.wx, contextMenu.wy, (currentRoomId && rooms[currentRoomId]) ? (rooms[currentRoomId].z || 0) : 0); setContextMenu(null); triggerRender(); }} onAddRoom={() => { handleAddRoom(contextMenu.wx, contextMenu.wy, (currentRoomId && rooms[currentRoomId]) ? (rooms[currentRoomId].z || 0) : 0); setContextMenu(null); triggerRender(); }} />}
            {infoRoomId && <RoomInfoCard roomId={infoRoomId} rooms={rooms} setRooms={setRooms} mode={mode} onClose={() => setInfoRoomId(null)} cardRef={cardRef} />}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'lime', background: 'rgba(0,0,0,0.8)', padding: '5px', zIndex: 9999, fontSize: '10px', pointerEvents: 'none' }}>
                Rooms: {Object.keys(roomsRef.current).length} | Animating: {renderVersion} | ID: {currentRoomIdRef.current || 'null'} | V: {renderVersion}
            </div>
        </div>
    );
}));
