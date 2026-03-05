import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useGame } from '../context/GameContext';
import { useMapperController } from './Mapper/useMapperController';
import { MapCanvas } from './Mapper/MapCanvas';
import { MapperToolbar } from './Mapper/MapperToolbar';
import { MapperDropdown } from './Mapper/MapperDropdown';
import { MapperContextMenu } from './Mapper/MapperContextMenu';
import { RoomInfoCard } from './Mapper/RoomInfoCard';
import { PEAK_IMAGES, FOREST_IMAGES, HILL_IMAGES } from './Mapper/mapperUtils';

interface MapperProps {
    isMinimized: boolean;
    setIsMinimized: (min: boolean) => void;
    characterName?: string;
}

export interface MapperHandle {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
}

export const Mapper = forwardRef<MapperHandle, MapperProps>(({ isMinimized, setIsMinimized, characterName }, ref) => {
    const [mode, setMode] = useState<'play' | 'edit'>('play');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [renderVersion, setRenderVersion] = useState(0);
    const [autoCenter, setAutoCenter] = useState(true);
    const [isMobile] = useState(() => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    const [viewZ, setViewZ] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);

    const { addMessage } = useGame();
    const controller = useMapperController(characterName ?? null, ref);

    const {
        rooms, setRooms, markers, setMarkers, currentRoomId,
        allowPersistence, setAllowPersistence, cameraRef,
        handleAddRoom, handleDeleteRoom, roomsRef,
        currentRoomIdRef, markersRef, preloadedCoordsRef,
        unveilMap, setUnveilMap, handleResetAndSync, handleSyncLocation, handleClearMap
    } = controller;

    const triggerRender = useCallback(() => setRenderVersion(v => v + 1), []);

    useEffect(() => {
        const all = [...PEAK_IMAGES, ...FOREST_IMAGES, ...HILL_IMAGES];
        all.forEach(src => {
            if (!imagesRef.current[src]) {
                const img = new Image();
                img.src = src;
                img.onload = () => triggerRender();
                imagesRef.current[src] = img;
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
                if (playerTrailRef.current.length > 15) playerTrailRef.current.shift();
            }
            playerPosRef.current = { x: r.x, y: r.y, z: r.z || 0 };

            if (autoCenter) {
                cameraRef.current.x = -r.x;
                cameraRef.current.y = -r.y;
            }
            triggerRender();
        } else if (!currentRoomId) {
            playerPosRef.current = null;
            playerTrailRef.current = [];
            triggerRender();
        }
    }, [currentRoomId, rooms, autoCenter, cameraRef, triggerRender]);

    // Cleanup trail over time
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerTrailRef.current.length > 0) {
                playerTrailRef.current = playerTrailRef.current
                    .map(t => ({ ...t, alpha: t.alpha - 0.05 }))
                    .filter(t => t.alpha > 0);
                triggerRender();
            }
        }, 100);
        return () => clearInterval(interval);
    }, [triggerRender]);

    const handleExportMap = useCallback(() => {
        const data = {
            rooms,
            markers,
            characterName,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mume_map_${characterName || 'player'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [rooms, markers, characterName]);

    const handleImportMap = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.rooms) setRooms(data.rooms);
                if (data.markers) setMarkers(data.markers);
                addMessage?.('system', '[Mapper] Map data imported successfully.');
            } catch (err) {
                addMessage?.('system', '[Mapper] Error importing map data.');
            }
        };
        reader.readAsText(file);
    }, [addMessage, setRooms, setMarkers]);

    const handleAddMarker = useCallback((wx: number, wy: number, z: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        setMarkers(prev => ({
            ...prev,
            [id]: {
                id,
                x: wx,
                y: wy,
                z,
                text: 'New Marker',
                dotSize: 5,
                fontSize: 12,
                createdAt: Date.now()
            }
        }));
    }, [setMarkers]);

    const handleCenterOnPlayer = useCallback(() => {
        if (playerPosRef.current) {
            cameraRef.current.x = -playerPosRef.current.x;
            cameraRef.current.y = -playerPosRef.current.y;
            setAutoCenter(true);
            triggerRender();
        }
    }, [cameraRef, triggerRender]);

    return (
        <div className={`mapper-container ${isMinimized ? 'minimized' : ''} ${isMobile ? 'mobile' : ''} ${!isMinimized ? 'full-view' : ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#11111b' }}>
            <MapCanvas
                ref={canvasRef}
                rooms={rooms}
                markers={markers}
                currentRoomId={currentRoomId}
                selectedRoomIds={selectedRoomIds}
                selectedMarkerId={selectedMarkerId}
                camera={cameraRef}
                isDarkMode={true}
                isMobile={isMobile}
                imagesRef={imagesRef}
                characterName={characterName ?? null}
                playerPosRef={playerPosRef}
                playerTrailRef={playerTrailRef}
                renderVersion={renderVersion}
                isDragging={isDragging}
                marquee={null}
                autoCenter={autoCenter}
                stableRoomsRef={roomsRef}
                stableRoomIdRef={currentRoomIdRef}
                stableMarkersRef={markersRef}
                preloadedCoordsRef={preloadedCoordsRef}
                spatialIndexRef={controller.spatialIndexRef}
                exploredVnums={controller.exploredVnums}
                triggerRender={triggerRender}
                unveilMap={unveilMap}
                viewZ={viewZ}
            />
            <MapperToolbar
                mode={mode}
                setMode={setMode}
                autoCenter={autoCenter}
                setAutoCenter={setAutoCenter}
                setIsMinimized={setIsMinimized}
                isMobile={isMobile}
                isExpanded={!isMinimized}
                onCenterClick={handleCenterOnPlayer}
                setIsDropdownOpen={setIsDropdownOpen}
                unveilMap={unveilMap}
                setUnveilMap={setUnveilMap}
                onResetSync={handleResetAndSync}
            />
            <MapperDropdown
                isOpen={isDropdownOpen}
                setIsOpen={setIsDropdownOpen}
                allowPersistence={allowPersistence}
                setAllowPersistence={setAllowPersistence}
                isDarkMode={true}
                setIsDarkMode={() => { }}
                exportMap={handleExportMap}
                importMap={handleImportMap}
                clearMap={handleClearMap}
            />

            {contextMenu && (
                <MapperContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    roomId={contextMenu.roomId}
                    onClose={() => setContextMenu(null)}
                    onDelete={() => {
                        if (contextMenu.roomId) handleDeleteRoom(contextMenu.roomId);
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onInfo={() => {
                        setInfoRoomId(contextMenu.roomId);
                        setContextMenu(null);
                    }}
                    onAddMarker={() => {
                        handleAddMarker(contextMenu.wx, contextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0));
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onAddRoom={() => {
                        handleAddRoom(contextMenu.wx, contextMenu.wy, viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].z || 0 : 0));
                        setContextMenu(null);
                        triggerRender();
                    }}
                    onSyncLocation={() => {
                        handleSyncLocation(contextMenu.wx, contextMenu.wy);
                        setContextMenu(null);
                        triggerRender();
                    }}
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
                />
            )}

            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'lime', background: 'rgba(0,0,0,0.85)', padding: '8px', zIndex: 9999, fontSize: '11px', pointerEvents: 'none', borderRadius: '4px', border: '1px solid #333', fontFamily: 'monospace' }}>
                Z: {viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? (rooms[currentRoomId].z || 0).toFixed(1) : '0.0')}
            </div>
        </div>
    );
});

Mapper.displayName = 'Mapper';
