import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';

const GRID_SIZE = 50;
const DIRS: Record<string, { dx: number, dy: number, dz?: number, opp: string }> = {
    n: { dx: 0, dy: -1, opp: 's' },
    s: { dx: 0, dy: 1, opp: 'n' },
    e: { dx: 1, dy: 0, opp: 'w' },
    w: { dx: -1, dy: 0, opp: 'e' },
    u: { dx: 0, dy: 0, dz: 1, opp: 'd' },
    d: { dx: 0, dy: 0, dz: -1, opp: 'u' },
    ne: { dx: 1, dy: -1, opp: 'sw' },
    nw: { dx: -1, dy: -1, opp: 'se' },
    se: { dx: 1, dy: 1, opp: 'nw' },
    sw: { dx: -1, dy: 1, opp: 'ne' }
};

const TERRAIN_MAP: Record<string, string> = {
    '[': 'Building', '#': 'City', '.': 'Field', 'f': 'Forest',
    '(': 'Hills', '<': 'Mountains', '%': 'Shallows', '~': 'Water',
    '+': 'Road', 'W': 'Rapids', 'U': 'Underwater', ':': 'Brush',
    '=': 'Tunnel', '0': 'Cavern'
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const DRAG_SENSITIVITY = 0.95; // Slight dampening to feel less "slippery"
const ZOOM_SENSITIVITY = 0.85; // Calibrate pinch speed

const PEAK_IMAGES = [
    '/assets/map/m_peaks/peak1.png',
    '/assets/map/m_peaks/peak2.png',
    '/assets/map/m_peaks/peak3.png',
    '/assets/map/m_peaks/peak_tall.png'
];

const FOREST_IMAGES = [
    '/assets/map/forest/tree1.png'
];

const HILL_IMAGES = [
    '/assets/map/hills/hill.png'
];

export interface MapperRef {
    handleRoomInfo: (data: any) => void;
    handleTerrain: (terrain: string) => void;
    pushPendingMove: (dir: string) => void;
    handleMoveFailure: () => void;
}

export interface MapperProps {
    isDesignMode?: boolean;
    characterName?: string | null;
    isMmapperMode?: boolean;
    isExpanded?: boolean;
    isMobile?: boolean;
}

export const Mapper = forwardRef<MapperRef, MapperProps>(({ isDesignMode, characterName, isMmapperMode, isExpanded, isMobile }, ref) => {
    // --- STATE ---
    const [mode, setMode] = useState<'edit' | 'play'>(isDesignMode ? 'edit' : 'play');
    const longPressTimerRef = useRef<any>(null);

    const triggerHaptic = (duration: number = 20) => {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(duration);
        }
    };

    // Force mode to 'edit' if isDesignMode is enabled externally
    useEffect(() => {
        if (isDesignMode) setMode('edit');
    }, [isDesignMode]);

    const [rooms, setRooms] = useState<Record<string, any>>({});
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
    const [marqueeStart, setMarqueeStart] = useState<{ x: number, y: number } | null>(null);
    const [marqueeEnd, setMarqueeEnd] = useState<{ x: number, y: number } | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [markers, setMarkers] = useState<Record<string, any>>({});
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);
    const [allowPersistence, setAllowPersistence] = useState(() => {
        const saved = localStorage.getItem('mume_mapper_persistence');
        return saved !== 'false'; // Default to true
    });
    const [isMinimized, setIsMinimized] = useState(() => localStorage.getItem('mume_mapper_minimized') === 'true');
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('mume_mapper_dark_mode');
        return saved !== 'false'; // Default to true
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, wx: number, wy: number, roomId: string | null } | null>(null);
    const imagesRef = useRef<Record<string, HTMLImageElement>>({});
    const terrainCacheRef = useRef<Record<string, HTMLCanvasElement>>({});
    const playerPosRef = useRef<{ x: number, y: number, z: number } | null>(null);
    const playerTrailRef = useRef<{ x: number, y: number, z: number, alpha: number }[]>([]);

    const processMountainImage = (img: HTMLImageElement): Promise<HTMLImageElement> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) { resolve(img); return; }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample the corner pixel to determine the background color to remove
            const startR = data[0], startG = data[1], startB = data[2];

            const width = canvas.width;
            const height = canvas.height;
            const visited = new Uint8Array(width * height);
            const queue: [number, number][] = [];

            // Add all boundary pixels to queue
            for (let x = 0; x < width; x++) { queue.push([x, 0], [x, height - 1]); }
            for (let y = 1; y < height - 1; y++) { queue.push([0, y], [width - 1, y]); }

            let head = 0;
            while (head < queue.length) {
                const [x, y] = queue[head++];
                const idx = y * width + x;
                if (visited[idx]) continue;
                visited[idx] = 1;

                const p = idx * 4;
                const r = data[p], g = data[p + 1], b = data[p + 2];

                // Check distance from background color
                const distance = Math.sqrt(Math.pow(r - startR, 2) + Math.pow(g - startG, 2) + Math.pow(b - startB, 2));

                // If it's the background color, make it transparent
                if (distance < 50) {
                    data[p + 3] = 0;

                    // Check neighbors
                    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nidx = ny * width + nx;
                            if (!visited[nidx]) {
                                queue.push([nx, ny]);
                            }
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const resultImg = new Image();
            resultImg.src = canvas.toDataURL();
            resultImg.onload = () => resolve(resultImg);
        });
    };

    // Preload map images
    useEffect(() => {
        const allImages = [...PEAK_IMAGES, ...FOREST_IMAGES, ...HILL_IMAGES];
        allImages.forEach(async (src) => {
            if (!imagesRef.current[src]) {
                const img = new Image();
                img.src = src;
                img.crossOrigin = "anonymous";
                img.onload = async () => {
                    const processed = await processMountainImage(img);
                    imagesRef.current[src] = processed;
                    drawMap();
                };
            }
        });
    }, []);

    // --- REFS ---
    const pendingMovesRef = useRef<{ dir: string, time: number }[]>([]);
    const lastDetectedTerrainRef = useRef<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hasDraggedRef = useRef<boolean>(false);
    const requestRef = useRef<number | null>(null);

    // Helper for consistent DPR
    const getDPR = () => Math.min(2.5, window.devicePixelRatio || 1);

    // Camera & Interaction State
    const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
    const isDraggingRef = useRef(false);
    const dragTypeRef = useRef<'pan' | 'room' | 'pinch' | 'marquee' | 'marker' | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Kept for UI cursor style only
    const activePointersRef = useRef<Map<number, { x: number, y: number }>>(new Map());
    const lastPointersRef = useRef<{ id: number, x: number, y: number }[]>([]);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });
    const dragInfoRef = useRef({
        startRoomX: 0,
        startRoomY: 0,
        startCamX: 0,
        startCamY: 0,
        startMarkerX: 0,
        startMarkerY: 0
    });
    const cardRef = useRef<HTMLDivElement>(null);
    const scrollLockRef = useRef(false);

    const memoizedName = useMemo(() => (characterName || 'default').replace(/^\{FULLNAME:/i, '').replace(/\}$/, '').toLowerCase(), [characterName]);
    const storageKey = `mume_mapper_data_${memoizedName}`;
    const markerStorageKey = `mume_mapper_markers_${memoizedName}`;
    const posStorageKey = `mume_mapper_pos_${memoizedName}`;

    // Persistence Loading
    useEffect(() => {
        const savedRooms = localStorage.getItem(storageKey);
        if (savedRooms) {
            try { setRooms(JSON.parse(savedRooms)); } catch (e) { setRooms({}); }
        }
        const savedMarkers = localStorage.getItem(markerStorageKey);
        if (savedMarkers) {
            try { setMarkers(JSON.parse(savedMarkers)); } catch (e) { setMarkers({}); }
        }
        const savedPos = localStorage.getItem(posStorageKey);
        if (savedPos) {
            try {
                const { roomId, camX, camY, zoom } = JSON.parse(savedPos);
                if (roomId) setCurrentRoomId(roomId);
                if (camX !== undefined) cameraRef.current.x = camX;
                if (camY !== undefined) cameraRef.current.y = camY;
                if (zoom !== undefined) cameraRef.current.zoom = zoom;
            } catch (e) { }
        }
    }, [storageKey, markerStorageKey, posStorageKey]);

    // Persistence Saving
    useEffect(() => {
        if (!allowPersistence) return;
        localStorage.setItem(storageKey, JSON.stringify(rooms));
        localStorage.setItem(markerStorageKey, JSON.stringify(markers));
        localStorage.setItem(posStorageKey, JSON.stringify({
            roomId: currentRoomId,
            camX: cameraRef.current.x,
            camY: cameraRef.current.y,
            zoom: cameraRef.current.zoom
        }));
    }, [rooms, markers, currentRoomId, storageKey, markerStorageKey, posStorageKey, allowPersistence]);

    useEffect(() => {
        localStorage.setItem('mume_mapper_persistence', String(allowPersistence));
    }, [allowPersistence]);

    useEffect(() => {
        localStorage.setItem('mume_mapper_minimized', String(isMinimized));
    }, [isMinimized]);

    useEffect(() => {
        localStorage.setItem('mume_mapper_dark_mode', String(isDarkMode));
    }, [isDarkMode]);

    useEffect(() => {
        if (isMmapperMode) {
            setIsMinimized(true);
        }
    }, [isMmapperMode]);

    const exportMap = () => {
        const data = JSON.stringify(rooms, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mume_map_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const importMap = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (parsed && typeof parsed === 'object') {
                    if (confirm("Replace current map with imported data?")) {
                        setRooms(parsed);
                    }
                }
            } catch (err) {
                alert("Failed to parse map file.");
            }
        };
        reader.readAsText(file);
    };

    // Handle incoming data
    useImperativeHandle(ref, () => ({
        handleRoomInfo: (data: any) => {
            const gmcpId = data.num || data.id || data.vnum;
            if (gmcpId === undefined || gmcpId === null) return;

            const name = data.name || 'Unknown Room';
            const desc = data.desc || '';
            const zone = data.area || data.zone || 'Unknown Zone';
            const freshTerrain = data.terrain || null;

            // Robust target ID tracking to prevent race conditions during discovery
            let discoveryTargetId: string | null = null;

            setRooms(prevRooms => {
                const newRooms = { ...prevRooms };
                let existingId = null;
                for (const key in newRooms) {
                    if (newRooms[key].gmcpId == gmcpId) { existingId = key; break; }
                }

                const activeRoomId = currentRoomId;
                let dirUsed = null;

                const now = Date.now();
                while (pendingMovesRef.current.length > 0 && now - pendingMovesRef.current[0].time > 1500) {
                    pendingMovesRef.current.shift();
                }

                if (!activeRoomId || !newRooms[activeRoomId] || newRooms[activeRoomId].gmcpId != gmcpId) {
                    const nextMove = pendingMovesRef.current.shift();
                    if (nextMove) dirUsed = nextMove.dir;
                }

                if (!existingId) {
                    const newId = generateId();
                    discoveryTargetId = newId;

                    let nx = 0, ny = 0, nz = 0;
                    const prevRoom = activeRoomId ? newRooms[activeRoomId] : null;

                    if (prevRoom && dirUsed) {
                        const d = DIRS[dirUsed];
                        if (d) {
                            nx = prevRoom.x + (d.dx || 0);
                            ny = prevRoom.y + (d.dy || 0);
                            nz = (prevRoom.z || 0) + (d.dz || 0);
                            newRooms[prevRoom.id] = {
                                ...prevRoom,
                                exits: { ...prevRoom.exits, [dirUsed]: { target: newId, closed: false } }
                            };
                        }
                    } else if (prevRoom) {
                        nx = prevRoom.x + 0.5; ny = prevRoom.y + 0.5; nz = prevRoom.z || 0;
                    }

                    newRooms[newId] = {
                        id: newId, gmcpId, name, desc,
                        x: Number.isFinite(nx) ? nx : 0,
                        y: Number.isFinite(ny) ? ny : 0,
                        z: Number.isFinite(nz) ? nz : 0,
                        zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain', exits: {}, notes: "",
                        createdAt: Date.now()
                    };

                    if (prevRoom && dirUsed) {
                        const d = DIRS[dirUsed];
                        if (d && d.opp) newRooms[newId].exits[d.opp] = { target: prevRoom.id, closed: false };
                    }
                } else {
                    discoveryTargetId = existingId;
                    // HARDEN TERRAIN: Only update terrain if fresh data specifically for this GMCP ID came in.
                    // This prevents prompt-detected terrain for room B from bleeding into mapped room A.
                    const finalTerrain = (data.terrain && data.terrain !== 'Unknown Terrain') ? data.terrain : newRooms[existingId].terrain;
                    newRooms[existingId] = { ...newRooms[existingId], name, desc, zone, terrain: finalTerrain };

                    const prevRoom = activeRoomId ? newRooms[activeRoomId] : null;
                    if (prevRoom && dirUsed && activeRoomId !== existingId) {
                        newRooms[prevRoom.id] = {
                            ...prevRoom,
                            exits: { ...prevRoom.exits, [dirUsed]: { target: existingId, closed: false } }
                        };
                        const d = DIRS[dirUsed];
                        if (d && d.opp) {
                            newRooms[existingId] = {
                                ...newRooms[existingId],
                                exits: { ...newRooms[existingId].exits, [d.opp]: { target: prevRoom.id, closed: false } }
                            };
                        }
                    }
                }
                return newRooms;
            });

            setTimeout(() => {
                if (discoveryTargetId) {
                    setCurrentRoomId(discoveryTargetId);
                    setAutoCenter(true);
                }
            }, 0);
        },
        handleTerrain: (terrain: string) => {
            lastDetectedTerrainRef.current = terrain;
            if (currentRoomId) {
                setRooms(prev => {
                    if (prev[currentRoomId] && prev[currentRoomId].terrain !== terrain) {
                        return { ...prev, [currentRoomId]: { ...prev[currentRoomId], terrain } };
                    }
                    return prev;
                });
            }
        },
        pushPendingMove: (dir: string) => {
            pendingMovesRef.current.push({ dir, time: Date.now() });
        },
        handleMoveFailure: () => {
            pendingMovesRef.current.shift();
        }
    }));

    const deleteRoom = useCallback(() => {
        if (selectedRoomIds.size === 0) return;
        if (!confirm(`Delete ${selectedRoomIds.size} selected room(s)?`)) return;

        setRooms(prev => {
            const newRooms = { ...prev };
            selectedRoomIds.forEach(id => {
                delete newRooms[id];
                // Remove references to this room from other rooms
                Object.values(newRooms).forEach((r: any) => {
                    Object.entries(r.exits).forEach(([dir, exit]: [string, any]) => {
                        if (exit.target === id) {
                            delete r.exits[dir];
                        }
                    });
                });
            });
            return newRooms;
        });
        setSelectedRoomIds(new Set());
        setInfoRoomId(null);
    }, [selectedRoomIds]);

    const clearMap = useCallback(() => {
        if (confirm("Are you sure you want to clear the entire map for this character? This cannot be undone.")) {
            setRooms({});
            setSelectedRoomIds(new Set());
            setInfoRoomId(null);
            setCurrentRoomId(null);
        }
    }, []);

    const centerCameraOn = useCallback((x: number, y: number) => {
        if (!canvasRef.current || isDraggingRef.current) return;
        const cvs = canvasRef.current;
        const parent = cvs.parentElement;
        if (!parent) return;

        // Use parent dimensions (CSS pixels) for logical centering
        let w = parent.clientWidth;
        let h = parent.clientHeight;

        if (w <= 0 || h <= 0) {
            const rect = parent.getBoundingClientRect();
            w = rect.width; h = rect.height;
        }

        // Final fallback for mobile init
        if (w <= 0) w = window.innerWidth;
        if (h <= 0) h = window.innerHeight;

        const worldX = x * GRID_SIZE + GRID_SIZE / 2;
        const worldY = y * GRID_SIZE + GRID_SIZE / 2;

        cameraRef.current.x = worldX - (w / 2) / cameraRef.current.zoom;
        cameraRef.current.y = worldY - (h / 2) / cameraRef.current.zoom;
    }, []);

    // If we receive a currentRoomId but the internal camera is at 0,0, center it
    useEffect(() => {
        if (currentRoomId && rooms[currentRoomId] && cameraRef.current.x === 0 && cameraRef.current.y === 0) {
            centerCameraOn(rooms[currentRoomId].x, rooms[currentRoomId].y);
        }
    }, [currentRoomId, rooms, centerCameraOn]);

    const screenToWorld = (sx: number, sy: number) => ({
        x: (sx / cameraRef.current.zoom) + cameraRef.current.x,
        y: (sy / cameraRef.current.zoom) + cameraRef.current.y
    });

    const currentZ = currentRoomId ? (rooms[currentRoomId]?.z || 0) : 0;

    const getRoomAt = useCallback((wx: number, wy: number, strictZ = false) => {
        const margin = 2;
        let foundRoom: string | null = null;
        let bestDist = Infinity;

        for (const key in rooms) {
            const r = rooms[key];
            const rx = r.x * GRID_SIZE;
            const ry = r.y * GRID_SIZE;
            if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                const rz = r.z || 0;
                if (rz === currentZ) return r.id;
                if (!strictZ) {
                    const dist = Math.abs(rz - currentZ);
                    if (dist < bestDist) { bestDist = dist; foundRoom = r.id; }
                }
            }
        }
        return foundRoom;
    }, [rooms, currentZ]);

    const getMarkerAt = (wx: number, wy: number) => {
        const z = cameraRef.current.zoom;
        for (const key in markers) {
            const m = markers[key];
            if ((m.z || 0) !== currentZ) continue;
            const dx = m.x * GRID_SIZE - wx;
            const dy = m.y * GRID_SIZE - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (20 / z)) return key;
        }
        return null;
    };

    // Native Interaction Engine - Bypasses React's passive listener defaults
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const currentZ = currentRoomId ? (rooms[currentRoomId]?.z || 0) : 0;

        const getRoomAt = (wx: number, wy: number, strictZ = false) => {
            const margin = 2;
            let foundRoom: string | null = null;
            let bestDist = Infinity;

            for (const key in rooms) {
                const r = rooms[key];
                const rx = r.x * GRID_SIZE;
                const ry = r.y * GRID_SIZE;
                if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                    const rz = r.z || 0;
                    if (rz === currentZ) return r.id;
                    if (!strictZ) {
                        const dist = Math.abs(rz - currentZ);
                        if (dist < bestDist) { bestDist = dist; foundRoom = r.id; }
                    }
                }
            }
            return foundRoom;
        };

        const getMarkerAt = (wx: number, wy: number) => {
            const z = cameraRef.current.zoom;
            for (const key in markers) {
                const m = markers[key];
                if ((m.z || 0) !== currentZ) continue;
                const dx = m.x * GRID_SIZE - wx;
                const dy = m.y * GRID_SIZE - wy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < (20 / z)) return key;
            }
            return null;
        };

        const onDown = (e: PointerEvent) => {
            if (cardRef.current && cardRef.current.contains(e.target as Node)) {
                scrollLockRef.current = true;
                return;
            }
            scrollLockRef.current = false;

            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const world = screenToWorld(mx, my);
            const clickedMarkerId = getMarkerAt(world.x, world.y);
            const clickedRoomId = getRoomAt(world.x, world.y, true);

            // In Design Mode, if we are not clicking a specific map element (room or marker),
            // and NOT holding Alt (for marquee/pan), we let the event bubble.
            // This allows the parent 'mapper-cluster' to handle moving the entire map window.
            if (isDesignMode && !clickedMarkerId && !clickedRoomId && !e.altKey) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            activePointersRef.current.set(e.pointerId, { x: mx, y: my });
            cvs.setPointerCapture(e.pointerId);

            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const pointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = pointers;

            if (pointers.length === 1) {
                if (e.button !== 0) return; // Only drag/select on left click
                hasDraggedRef.current = false;

                if (mode === 'edit') {
                    longPressTimerRef.current = setTimeout(() => {
                        triggerHaptic(40);
                        setContextMenu({
                            x: mx,
                            y: my,
                            wx: world.x,
                            wy: world.y,
                            roomId: clickedRoomId
                        });
                    }, 500);
                }

                if (clickedMarkerId && mode === 'edit') {
                    setSelectedMarkerId(clickedMarkerId);
                    setInfoRoomId(null);
                    setSelectedRoomIds(new Set());
                    isDraggingRef.current = true;
                    dragTypeRef.current = 'marker';
                    setIsDragging(true);
                    dragInfoRef.current = { ...dragInfoRef.current, startMarkerX: markers[clickedMarkerId].x, startMarkerY: markers[clickedMarkerId].y };
                } else if (clickedRoomId && mode === 'edit') {
                    const r = rooms[clickedRoomId];
                    setSelectedMarkerId(null);
                    if (e.shiftKey) {
                        setSelectedRoomIds(prev => {
                            const next = new Set(prev);
                            if (next.has(clickedRoomId)) next.delete(clickedRoomId);
                            else next.add(clickedRoomId);
                            return next;
                        });
                    } else if (!selectedRoomIds.has(clickedRoomId)) {
                        setSelectedRoomIds(new Set([clickedRoomId]));
                    }

                    isDraggingRef.current = true;
                    dragTypeRef.current = 'room';
                    setIsDragging(true);
                    dragInfoRef.current = { ...dragInfoRef.current, startRoomX: r.x, startRoomY: r.y, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y };
                } else {
                    isDraggingRef.current = true;
                    dragTypeRef.current = mode === 'edit' && !clickedRoomId ? 'marquee' : 'pan';
                    setIsDragging(true);
                    if (!clickedRoomId) {
                        if (!e.shiftKey) setSelectedRoomIds(new Set());
                        setInfoRoomId(null);
                        setSelectedMarkerId(null);
                        if (mode === 'edit') setMarqueeStart({ x: mx, y: my });
                    }
                }
            } else if (pointers.length === 2) {
                isDraggingRef.current = true;
                dragTypeRef.current = 'pinch';
                setIsDragging(true);
            }
            startMouseRef.current = { x: mx, y: my };
            lastMouseRef.current = { x: mx, y: my };
        };

        const onMove = (e: PointerEvent) => {
            if (longPressTimerRef.current) {
                const rect = cvs.getBoundingClientRect();
                const curX = e.clientX - rect.left;
                const curY = e.clientY - rect.top;
                const dx = curX - (startMouseRef.current?.x || curX);
                const dy = curY - (startMouseRef.current?.y || curY);
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }
            if (scrollLockRef.current) return;
            if (!isDraggingRef.current) return;
            if (cardRef.current && cardRef.current.contains(e.target as Node)) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            activePointersRef.current.set(e.pointerId, { x: mx, y: my });
            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const pointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));

            if (pointers.length === 1 && lastMouseRef.current) {
                const dx = mx - lastMouseRef.current.x;
                const dy = my - lastMouseRef.current.y;
                const totalDx = mx - startMouseRef.current.x;
                const totalDy = my - startMouseRef.current.y;

                if (!hasDraggedRef.current) {
                    if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) hasDraggedRef.current = true;
                    else {
                        lastMouseRef.current = { x: mx, y: my };
                        return;
                    }
                }

                if (dragTypeRef.current === 'pan') {
                    cameraRef.current.x -= (dx * DRAG_SENSITIVITY) / cameraRef.current.zoom;
                    cameraRef.current.y -= (dy * DRAG_SENSITIVITY) / cameraRef.current.zoom;
                    setAutoCenter(false);
                } else if (dragTypeRef.current === 'room' && selectedRoomIds.size > 0 && mode === 'edit') {
                    const worldDx = dx / cameraRef.current.zoom;
                    const worldDy = dy / cameraRef.current.zoom;
                    setRooms(prev => {
                        const next = { ...prev };
                        selectedRoomIds.forEach(id => {
                            if (next[id]) {
                                next[id] = { ...next[id], x: next[id].x + (worldDx / GRID_SIZE), y: next[id].y + (worldDy / GRID_SIZE) };
                            }
                        });
                        return next;
                    });
                } else if (dragTypeRef.current === 'marker' && selectedMarkerId && mode === 'edit') {
                    const worldDx = dx / cameraRef.current.zoom;
                    const worldDy = dy / cameraRef.current.zoom;
                    setMarkers(prev => {
                        const next = { ...prev };
                        if (next[selectedMarkerId]) {
                            next[selectedMarkerId] = {
                                ...next[selectedMarkerId],
                                x: next[selectedMarkerId].x + (worldDx / GRID_SIZE),
                                y: next[selectedMarkerId].y + (worldDy / GRID_SIZE)
                            };
                        }
                        return next;
                    });
                } else if (dragTypeRef.current === 'marquee' && mode === 'edit') {
                    setMarqueeEnd({ x: mx, y: my });
                }
            } else if (pointers.length === 2 && dragTypeRef.current === 'pinch' && lastPointersRef.current.length === 2) {
                const p1 = pointers[0], p2 = pointers[1];
                const lp1 = lastPointersRef.current[0], lp2 = lastPointersRef.current[1];
                const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
                const lastDist = Math.sqrt((lp2.x - lp1.x) ** 2 + (lp2.y - lp1.y) ** 2);
                const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                const lastMid = { x: (lp1.x + lp2.x) / 2, y: (lp1.y + lp2.y) / 2 };

                if (lastDist > 1 && dist > 1) {
                    const cam = cameraRef.current;
                    const oldZoom = cam.zoom;
                    const scaleChange = dist / lastDist;
                    const dampenedScale = 1 + (scaleChange - 1) * ZOOM_SENSITIVITY;
                    const newZoom = Math.max(0.1, Math.min(oldZoom * dampenedScale, 5));

                    cam.x -= ((mid.x - lastMid.x) * DRAG_SENSITIVITY) / oldZoom;
                    cam.y -= ((mid.y - lastMid.y) * DRAG_SENSITIVITY) / oldZoom;
                    cam.x += (mid.x / oldZoom) - (mid.x / newZoom);
                    cam.y += (mid.y / oldZoom) - (mid.y / newZoom);
                    cam.zoom = newZoom;
                    setAutoCenter(false);
                }
            }

            lastPointersRef.current = pointers;
            lastMouseRef.current = { x: mx, y: my };
        };

        const onUp = (e: PointerEvent) => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            scrollLockRef.current = false;
            activePointersRef.current.delete(e.pointerId);
            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const remPointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = remPointers;

            if (activePointersRef.current.size === 0) {
                if (dragTypeRef.current === 'marquee' && marqueeStart && marqueeEnd) {
                    const world1 = screenToWorld(marqueeStart.x, marqueeStart.y);
                    const world2 = screenToWorld(marqueeEnd.x, marqueeEnd.y);
                    const x1 = Math.min(world1.x, world2.x), y1 = Math.min(world1.y, world2.y);
                    const x2 = Math.max(world1.x, world2.x), y2 = Math.max(world1.y, world2.y);

                    const newSelection = new Set(e.shiftKey ? selectedRoomIds : []);
                    Object.values(rooms).forEach(r => {
                        const rx = r.x * GRID_SIZE, ry = r.y * GRID_SIZE;
                        if (rx >= x1 - GRID_SIZE && rx <= x2 && ry >= y1 - GRID_SIZE && ry <= y2) {
                            if ((r.z || 0) === currentZ) newSelection.add(r.id);
                        }
                    });
                    setSelectedRoomIds(newSelection);
                } else if (!hasDraggedRef.current && dragTypeRef.current === 'room') {
                    const world = screenToWorld(startMouseRef.current.x, startMouseRef.current.y);
                    const clickedRoomId = getRoomAt(world.x, world.y);
                    if (clickedRoomId) setInfoRoomId(clickedRoomId);
                }

                if (dragTypeRef.current === 'room' && selectedRoomIds.size > 0 && hasDraggedRef.current) {
                    setRooms(prev => {
                        const next = { ...prev };
                        selectedRoomIds.forEach(id => {
                            if (next[id]) next[id] = { ...next[id], x: Math.round(next[id].x), y: Math.round(next[id].y) };
                        });
                        return next;
                    });
                }

                isDraggingRef.current = false;
                dragTypeRef.current = null;
                setIsDragging(false);
                setMarqueeStart(null);
                setMarqueeEnd(null);
            } else if (activePointersRef.current.size === 1) {
                dragTypeRef.current = 'pan';
                const pointer = remPointers[0];
                startMouseRef.current = { x: pointer.x, y: pointer.y };
                lastMouseRef.current = { x: pointer.x, y: pointer.y };
            }
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const cam = cameraRef.current;
            const factor = Math.pow(1.05, -e.deltaY / 120);
            const oldZoom = cam.zoom, newZoom = Math.max(0.1, Math.min(oldZoom * factor, 5));
            if (Math.abs(newZoom - oldZoom) < 0.001) return;
            const wx = (mx / oldZoom) + cam.x, wy = (my / oldZoom) + cam.y;
            cam.x = wx - (mx / newZoom); cam.y = wy - (my / newZoom); cam.zoom = newZoom;
            setAutoCenter(false);
        };

        cvs.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onUp, { passive: false });
        cvs.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            cvs.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            cvs.removeEventListener('wheel', onWheel);
        };
    }, [mode, rooms, markers, selectedRoomIds, infoRoomId, currentRoomId, isDesignMode, marqueeStart, marqueeEnd, selectedMarkerId, isMinimized]);

    const sortedRooms = useMemo(() => {
        try {
            const currentRoom = currentRoomId ? rooms[currentRoomId] : null;
            const currentZ = currentRoom?.z || 0;
            return Object.values(rooms)
                .filter(r => r && Math.abs((r.z || 0) - currentZ) <= 4)
                .sort((a, b) => {
                    if ((a.z || 0) !== (b.z || 0)) return (a.z || 0) - (b.z || 0);
                    return a.y - b.y; // Draw from top to bottom (higher Y draws last)
                });
        } catch (e) {
            return Object.values(rooms);
        }
    }, [rooms, currentRoomId]);

    const drawMap = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let stackPushed = false;
        try {
            const dpr = getDPR();
            const { width, height } = canvas;
            const cam = cameraRef.current;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#ffffff'; // Tolkien-style white background
            ctx.fillRect(0, 0, width, height);

            if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y) || !Number.isFinite(cam.zoom)) return;

            ctx.save();
            stackPushed = true;
            ctx.scale(cam.zoom * dpr, cam.zoom * dpr);
            ctx.translate(-cam.x, -cam.y);
            const ANIM_DUR = 800;
            const now = Date.now();
            const currentRoom = currentRoomId ? rooms[currentRoomId] : null;
            const currentZ = currentRoom?.z || 0;

            // Smoothly animate player position
            if (currentRoom) {
                if (!playerPosRef.current) {
                    playerPosRef.current = { x: currentRoom.x, y: currentRoom.y, z: currentRoom.z || 0 };
                } else {
                    const lerpSpeed = 0.12;
                    const diffX = currentRoom.x - playerPosRef.current.x;
                    const diffY = currentRoom.y - playerPosRef.current.y;
                    const diffZ = (currentRoom.z || 0) - playerPosRef.current.z;

                    if (Math.abs(diffX) > 0.001 || Math.abs(diffY) > 0.001) {
                        const len = playerTrailRef.current.length;
                        const lastCrumb = len > 0 ? playerTrailRef.current[len - 1] : null;
                        if (!lastCrumb || Math.hypot(playerPosRef.current.x - lastCrumb.x, playerPosRef.current.y - lastCrumb.y) > 0.1) {
                            playerTrailRef.current.push({ x: playerPosRef.current.x, y: playerPosRef.current.y, z: playerPosRef.current.z, alpha: 1.0 });
                        }
                    }

                    playerPosRef.current.x += diffX * lerpSpeed;
                    playerPosRef.current.y += diffY * lerpSpeed;
                    playerPosRef.current.z += diffZ * lerpSpeed;
                }
            }

            // Decay trail breadcrumbs
            playerTrailRef.current.forEach(t => t.alpha -= 0.02);
            playerTrailRef.current = playerTrailRef.current.filter(t => t.alpha > 0);

            if (autoCenter && playerPosRef.current) {
                const viewWidth = width / dpr;
                const viewHeight = height / dpr;
                const targetCamX = playerPosRef.current.x * GRID_SIZE - (viewWidth / cam.zoom) / 2 + GRID_SIZE / 2;
                const targetCamY = playerPosRef.current.y * GRID_SIZE - (viewHeight / cam.zoom) / 2 + GRID_SIZE / 2;

                cam.x += (targetCamX - cam.x) * 0.1;
                cam.y += (targetCamY - cam.y) * 0.1;
            }

            const zoom = cam.zoom;
            const invZoom = 1 / zoom;

            // Viewport clipping bounds in world coordinates
            const viewportW = width / dpr / zoom;
            const viewportH = height / dpr / zoom;
            const viewX1 = cam.x - GRID_SIZE;
            const viewX2 = cam.x + viewportW + GRID_SIZE;
            const viewY1 = cam.y - GRID_SIZE;
            const viewY2 = cam.y + viewportH + GRID_SIZE;

            // Grid rendering removed for cleaner aesthetic

            const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2, dashed = false) => {
                if (!Number.isFinite(x1) || !Number.isFinite(y1)) return;
                ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom;
                if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
            };

            // Deterministic pseudo-random for icon variety
            const getSeed = (x: number, y: number) => Math.abs((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1);

            // Terrain Detection Helpers
            const isMountain = (r: any) => r && (r.terrain === 'Mountains' || r.terrain === '<');
            const isForest = (r: any) => r && (r.terrain === 'Forest' || r.terrain === 'f');
            const isHill = (r: any) => r && (r.terrain === 'Hills' || r.terrain === '(');
            const isRiver = (r: any) => r && (r.terrain === 'Water' || r.terrain === '~' || r.terrain === 'Rapids' || r.terrain === 'W' || r.terrain === 'River');
            const isRoad = (r: any) => r && (r.terrain === 'Road' || r.terrain === '+' || r.terrain === 'Trail' || r.terrain === 'Path');
            const isCityTerrain = (r: any) => r && (r.terrain === 'City' || r.terrain === '[' || r.terrain === '#' || r.terrain === 'Town');

            Object.values(rooms).forEach(room => {
                if (!room || !room.exits) return;
                const rz = room.z || 0;
                if (Math.abs(rz - currentZ) > 4) return;

                const rx_center = room.x * GRID_SIZE + GRID_SIZE / 2;
                const ry_center = room.y * GRID_SIZE + GRID_SIZE / 2;

                // X/Y Clip check
                if (rx_center < viewX1 || rx_center > viewX2 || ry_center < viewY1 || ry_center > viewY2) return;

                const age = now - (room.createdAt || 0);
                const isAnimating = age < ANIM_DUR;

                const rx = room.x * GRID_SIZE + GRID_SIZE / 2;
                const ry = room.y * GRID_SIZE + GRID_SIZE / 2;

                if (isAnimating) {
                    ctx.save();
                    const p = age / ANIM_DUR;
                    const maxRad = GRID_SIZE * 2;
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const ang = (i / 8) * Math.PI * 2;
                        const jit = (getSeed(room.x + i, room.y) - 0.5) * GRID_SIZE * 0.3 * (1 - p);
                        ctx.lineTo(rx + Math.cos(ang) * (maxRad * p + jit), ry + Math.sin(ang) * (maxRad * p + jit));
                    }
                    ctx.closePath();
                    ctx.clip();
                }

                ctx.globalAlpha = rz === currentZ ? 1.0 : 0.25;
                Object.entries(room.exits).forEach(([dir, exitData]: [string, any]) => {
                    const target = rooms[exitData.target];
                    if (!target) return;
                    const d = DIRS[dir];
                    if (d) {
                        const isNondirectional = Math.abs(target.x - (room.x + d.dx)) > 0.1 || Math.abs(target.y - (room.y + d.dy)) > 0.1;
                        if (isNondirectional) {
                            drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, '#89b4fa', 1.4, exitData.closed);
                        }
                    } else if (dir === 'u' || dir === 'd') {
                        drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, '#d4a373', 2, exitData.closed);
                    }
                });

                if (isAnimating) ctx.restore();
            });

            ctx.globalAlpha = 1.0;
            const coordMap: Record<string, number> = {};
            sortedRooms.forEach(r => { if (r) { const k = `${Math.round(r.x)},${Math.round(r.y)}`; coordMap[k] = (coordMap[k] || 0) + 1; } });

            // Create coordinate to room lookup for neighbor detection
            const roomAtCoord: Record<string, any> = {};
            Object.values(rooms).forEach(r => {
                if (r && (r.z || 0) === currentZ) {
                    roomAtCoord[`${Math.round(r.x)},${Math.round(r.y)}`] = r;
                }
            });

            // (ANIM_DUR and now moved to top)

            sortedRooms.forEach(room => {
                if (!room) return;
                const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;

                // --- ANIMATION: Drawing in effect ---
                const age = now - (room.createdAt || 0);
                const isAnimating = age < ANIM_DUR;
                const p = age / ANIM_DUR;

                if (isAnimating) {
                    ctx.save();
                    const centerX = rx + s / 2, centerY = ry + s / 2;
                    const maxRadius = s * 1.5;
                    const currentRadius = maxRadius * p;

                    ctx.beginPath();
                    const verts = 12;
                    for (let i = 0; i < verts; i++) {
                        const angle = (i / verts) * Math.PI * 2;
                        const jitter = (getSeed(room.x + i, room.y) - 0.5) * s * 0.4 * (1 - p);
                        const vx = centerX + Math.cos(angle) * (currentRadius + jitter);
                        const vy = centerY + Math.sin(angle) * (currentRadius + jitter);
                        if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                    }
                    ctx.closePath();
                    ctx.clip();

                    // Sketchy jitter while drawing
                    ctx.translate((getSeed(room.x, now * 0.01) - 0.5) * 3 * (1 - p), (getSeed(room.y, now * 0.012) - 0.5) * 3 * (1 - p));
                }

                const drawRoomContent = () => {
                    if (Math.abs(rz - currentZ) > 4) return;

                    // --- OPTIMIZATION: Frustum Culling ---
                    const worldLeft = cameraRef.current.x - s * 2;
                    const worldRight = worldLeft + (canvasRef.current!.width / dpr / cameraRef.current.zoom) + s * 4;
                    const worldTop = cameraRef.current.y - s * 2;
                    const worldBottom = worldTop + (canvasRef.current!.height / dpr / cameraRef.current.zoom) + s * 4;
                    if (rx < worldLeft || rx > worldRight || ry < worldTop || ry > worldBottom) return;

                    ctx.globalAlpha = rz === currentZ ? 1.0 : 0.35;

                    const isMtn = isMountain(room);
                    const isFor = isForest(room);
                    const isHil = isHill(room);
                    const isRiv = isRiver(room);
                    const isRod = isRoad(room);
                    const isCit = isCityTerrain(room);

                    // --- Universal Neighbor State Calculation ---
                    let neighborState = "";
                    const rAt = (dx: number, dy: number) => roomAtCoord[`${Math.round(room.x + dx)},${Math.round(room.y + dy)}`];

                    if (isMtn) {
                        [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                            neighborState += isMountain(rAt(dx, dy)) ? "m" : "x";
                        });
                    } else if (isFor) {
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                neighborState += isForest(rAt(dx, dy)) ? "f" : "x";
                            }
                        }
                    } else if (isRiv) {
                        [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                            neighborState += isRiver(rAt(dx, dy)) ? "r" : "x";
                        });
                    } else if (isHil) {
                        neighborState = "hills";
                    } else if (isRod) {
                        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
                            neighborState += isRoad(rAt(dx, dy)) ? "o" : "x";
                        });
                    } else if (isCit) {
                        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
                            neighborState += isCityTerrain(rAt(dx, dy)) ? "c" : "x";
                        });
                    } else {
                        // Standard Room: Check for other standard rooms to connect walls at corners
                        [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
                            const n = rAt(dx, dy);
                            const isStdN = n && !isMountain(n) && !isForest(n) && !isHill(n) && !isRiver(n) && !isRoad(n) && !isCityTerrain(n);
                            neighborState += isStdN ? "s" : "x";
                        });
                    }

                    if (isMtn || isFor || isHil || isRiv || isRod || isCit) {
                        const terrType = isMtn ? 'mtn' : isFor ? 'for' : isHil ? 'hil' : isRiv ? 'riv' : isRod ? 'rod' : 'cit';
                        const cacheKey = `${room.id}_${terrType}_${s}_${neighborState}`;
                        let cachedCvs = terrainCacheRef.current[cacheKey];

                        if (!cachedCvs) {
                            const offCvs = document.createElement('canvas');
                            const padding = s * 2;
                            offCvs.width = (s + padding * 2) * dpr;
                            offCvs.height = (s + padding * 2) * dpr;
                            const offCtx = offCvs.getContext('2d');
                            if (offCtx) {
                                offCtx.scale(dpr, dpr);
                                offCtx.translate(padding, padding);

                                if (isMtn) {
                                    let cardinalMtnCount = 0;
                                    neighborState.split('').forEach((c, idx) => { if (c === 'm' && idx < 4) cardinalMtnCount++; });
                                    const isCenterMtn = cardinalMtnCount === 4;
                                    const seed = getSeed(room.x, room.y);
                                    const peakType = PEAK_IMAGES[Math.floor(seed * PEAK_IMAGES.length)];
                                    const img = imagesRef.current[peakType];
                                    if (img && img.complete) {
                                        offCtx.filter = 'contrast(1.5) grayscale(1)';
                                        const tileOffX = ((seed * 70) - 35) * (s / 100);
                                        const tileOffY = (((seed * 87) % 70) - 35) * (s / 100);
                                        const maxDim = Math.max(img.width, img.height);
                                        const bScale = ((s * 2.4) / maxDim) * (isCenterMtn ? 1.4 : 1.0);
                                        const scale = bScale * (0.9 + (seed * 0.2));
                                        const iw = img.width * scale, ih = img.height * scale;
                                        offCtx.drawImage(img, s * 0.5 + tileOffX - iw * 0.5, s * 0.5 + tileOffY - ih * 0.5, iw, ih);
                                    }
                                } else if (isFor) {
                                    const img = imagesRef.current['/assets/map/forest/tree1.png'];
                                    if (img && img.complete) {
                                        offCtx.filter = 'contrast(1.2) grayscale(0.5)';
                                        let cardinalFc = 0, neighborFc = 0, bX = 0, bY = 0;
                                        let fidx = 0;
                                        for (let dx = -1; dx <= 1; dx++) {
                                            for (let dy = -1; dy <= 1; dy++) {
                                                if (dx === 0 && dy === 0) continue;
                                                if (neighborState[fidx++] === 'f') {
                                                    neighborFc++;
                                                    if ((Math.abs(dx) + Math.abs(dy)) === 1) cardinalFc++;
                                                    bX += dx; bY += dy;
                                                }
                                            }
                                        }
                                        const isBord = cardinalFc < 4 && neighborFc > 0;
                                        const tCount = cardinalFc === 4 ? 50 : 10;
                                        const trees = [];
                                        for (let i = 0; i < tCount; i++) {
                                            const ssX = getSeed(room.x + i * 0.21, room.y + i * 0.13);
                                            const ssY = getSeed(room.x + i * 0.47, room.y + i * 0.29);
                                            let rpX = (ssX * 140) - 70; let rpY = (ssY * 140) - 70;
                                            if (isBord) { const g = 0.6; const tX = (bX / neighborFc) * 45, tY = (bY / neighborFc) * 45; rpX = (rpX * (1 - g)) + (tX * g); rpY = (rpY * (1 - g)) + (tY * g); }
                                            const maxDim = Math.max(img.width, img.height);
                                            const bScale = (s * 0.36) / maxDim;
                                            const sc = bScale * (0.8 + (getSeed(room.x + i, room.y + i) * 0.4));
                                            trees.push({ tX: rpX * (s / 100), tY: rpY * (s / 100), iw: img.width * sc, ih: img.height * sc });
                                        }
                                        trees.sort((a, b) => a.tY - b.tY);
                                        trees.forEach(t => offCtx.drawImage(img, s * 0.5 + t.tX - t.iw * 0.5, s * 0.5 + t.tY - t.ih * 0.5, t.iw, t.ih));
                                    }
                                } else if (isHil) {
                                    const img = imagesRef.current['/assets/map/hills/hill.png'];
                                    if (img && img.complete) {
                                        offCtx.filter = 'contrast(1.2) grayscale(0.4)';
                                        const seed = getSeed(room.x, room.y);
                                        const count = Math.floor(seed * 3) + 1;
                                        for (let i = 0; i < count; i++) {
                                            const hSeedX = getSeed(room.x + i * 0.33, room.y + i * 0.17);
                                            const hSeedY = getSeed(room.x + i * 0.58, room.y + i * 0.44);
                                            const hScaleP = 0.8 + getSeed(room.x + i * 0.1, room.y + i * 0.2) * 0.4;
                                            const iw = s * 0.6 * hScaleP; const ih = iw * (img.height / img.width);
                                            const offX = (hSeedX * s * 0.7) + (s * 0.15); const offY = (hSeedY * s * 0.7) + (s * 0.15);
                                            offCtx.drawImage(img, offX - iw / 2, offY - ih / 2, iw, ih);
                                        }
                                    }
                                } else if (isRiv) {
                                    const hasN = neighborState[0] === 'r'; const hasS = neighborState[1] === 'r';
                                    const hasW = neighborState[2] === 'r'; const hasE = neighborState[3] === 'r';
                                    const hasNW = neighborState[4] === 'r'; const hasNE = neighborState[5] === 'r';
                                    const hasSW = neighborState[6] === 'r'; const hasSE = neighborState[7] === 'r';
                                    const rSeed = getSeed(room.x, room.y);
                                    const thin = s * 0.08; const half = s / 2; const r = s * 0.12;
                                    const rPts = {
                                        nw: { x: (hasW || (hasN && hasNW)) ? 0 : (hasN ? half - thin / 2 : half - r), y: (hasN || (hasW && hasNW)) ? 0 : (hasW ? half - thin / 2 : half - r) },
                                        ne: { x: (hasE || (hasN && hasNE)) ? s : (hasN ? half + thin / 2 : half + r), y: (hasN || (hasE && hasNE)) ? 0 : (hasE ? half - thin / 2 : half - r) },
                                        se: { x: (hasE || (hasS && hasSE)) ? s : (hasS ? half + thin / 2 : half + r), y: (hasS || (hasE && hasSE)) ? s : (hasE ? half + thin / 2 : half + r) },
                                        sw: { x: (hasW || (hasS && hasSW)) ? 0 : (hasS ? half - thin / 2 : half - r), y: (hasS || (hasW && hasSW)) ? s : (hasW ? half + thin / 2 : half + r) }
                                    };
                                    const rLandSides = [!hasN, !hasE, !hasS, !hasW];
                                    const rCornerPts = [rPts.ne, rPts.se, rPts.sw, rPts.nw];
                                    const rSideSeeds = [rSeed + 0.1, rSeed + 0.2, rSeed + 0.3, rSeed + 0.4];
                                    const rCornerBend = s * 0.18;
                                    offCtx.strokeStyle = '#0c0c0e'; offCtx.lineWidth = s * 0.056; offCtx.lineCap = 'round'; offCtx.lineJoin = 'round';
                                    for (let i = 0; i < 4; i++) {
                                        if (!rLandSides[i]) continue;
                                        const pLand = rLandSides[(i + 3) % 4]; const nLand = rLandSides[(i + 1) % 4];
                                        const pS = rCornerPts[(i + 3) % 4], pE = rCornerPts[i];
                                        offCtx.beginPath();
                                        let sX = pS.x, sY = pS.y;
                                        if (pLand) { const dx = (pE.x - pS.x) / s, dy = (pE.y - pS.y) / s; sX += dx * rCornerBend; sY += dy * rCornerBend; }
                                        offCtx.moveTo(sX, sY);
                                        let eX = pE.x, eY = pE.y;
                                        if (nLand) { const dx = (pS.x - eX) / s, dy = (pS.y - eY) / s; eX += dx * rCornerBend; eY += dy * rCornerBend; }
                                        let lX = sX, lY = sY;
                                        for (let j = 1; j <= 3; j++) {
                                            const t = j / 4; const px = sX + (eX - sX) * t, py = sY + (eY - sY) * t;
                                            const sway = (getSeed(rSideSeeds[i] + j * 0.17, rSideSeeds[i] * 2.1) - 0.5) * (s * 0.08);
                                            const isV = Math.abs(sX - eX) < 0.1; const tX = isV ? px + sway : px; const tY = isV ? py : py + sway;
                                            offCtx.quadraticCurveTo((lX + tX) / 2, (lY + tY) / 2, tX, tY); lX = tX; lY = tY;
                                        }
                                        offCtx.quadraticCurveTo((lX + eX) / 2, (lY + eY) / 2, eX, eY); offCtx.stroke();
                                        if (nLand) {
                                            const nS = rCornerPts[i], nN = rCornerPts[(i + 1) % 4];
                                            const dx = (nN.x - nS.x) / s, dy = (nN.y - nS.y) / s;
                                            offCtx.beginPath(); offCtx.moveTo(eX, eY); offCtx.quadraticCurveTo(nS.x, nS.y, nS.x + dx * rCornerBend, nS.y + dy * rCornerBend); offCtx.stroke();
                                        }
                                    }
                                    // Lake squiggles (interior decoration)
                                    const riverNeighborCount = neighborState.split('r').length - 1;
                                    if (riverNeighborCount >= 3) {
                                        const sRand = getSeed(room.x * 12, room.y * 34);
                                        // Increased quantity
                                        const squigCount = 4 + Math.floor(sRand * 4);

                                        offCtx.save();
                                        // Clip to the water polygon to ensure squiggles stay inside borders
                                        offCtx.beginPath();
                                        offCtx.moveTo(rPts.nw.x, rPts.nw.y);
                                        offCtx.lineTo(rPts.ne.x, rPts.ne.y);
                                        offCtx.lineTo(rPts.se.x, rPts.se.y);
                                        offCtx.lineTo(rPts.sw.x, rPts.sw.y);
                                        offCtx.closePath();
                                        offCtx.clip();

                                        offCtx.lineWidth = s * 0.012;
                                        offCtx.globalAlpha = 0.45;
                                        for (let j = 0; j < squigCount; j++) {
                                            const sx = (getSeed(room.x + j, room.y - j) * 0.75 + 0.12) * s;
                                            const sy = (getSeed(room.y + j, room.x - j) * 0.75 + 0.12) * s;
                                            // Significantly longer lines
                                            const sw = s * (0.25 + getSeed(j, room.x) * 0.25);
                                            const amp = s * 0.015;

                                            // Multi-segment "wavy" squiggle
                                            offCtx.beginPath();
                                            offCtx.moveTo(sx - sw / 2, sy);
                                            offCtx.quadraticCurveTo(sx - sw * 0.25, sy + amp, sx, sy);
                                            offCtx.quadraticCurveTo(sx + sw * 0.25, sy - amp, sx + sw / 2, sy);
                                            offCtx.stroke();
                                        }
                                        offCtx.restore();
                                    }
                                } else if (isRod || isCit) {
                                    const isCobble = isCit;
                                    const rHasN = neighborState[0] === (isCobble ? 'c' : 'o');
                                    const rHasS = neighborState[1] === (isCobble ? 'c' : 'o');
                                    const rHasW = neighborState[2] === (isCobble ? 'c' : 'o');
                                    const rHasE = neighborState[3] === (isCobble ? 'c' : 'o');
                                    const drawP = (x1: number, y1: number, x2: number, y2: number, fCX?: number, fCY?: number) => {
                                        const dSp = isCobble ? 6 : 18;
                                        const driftX = (getSeed(room.x * 0.91, room.y * 0.73) - 0.5) * (s * 0.1);
                                        const driftY = (getSeed(room.x * 0.67, room.y * 0.88) - 0.5) * (s * 0.1);
                                        const cpX = fCX !== undefined ? fCX + driftX : (x1 + x2) / 2 + driftX;
                                        const cpY = fCY !== undefined ? fCY + driftY : (y1 + y2) / 2 + driftY;
                                        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                                        const steps = Math.max(2, Math.floor(dist / dSp) * (isCobble ? 2 : 1.5));
                                        offCtx.fillStyle = isCobble ? 'rgba(176,176,176,0.7)' : '#282828';
                                        for (let i = 0; i <= steps; i++) {
                                            const t = i / steps;
                                            const px = Math.pow(1 - t, 2) * x1 + 2 * (1 - t) * t * cpX + Math.pow(t, 2) * x2;
                                            const py = Math.pow(1 - t, 2) * y1 + 2 * (1 - t) * t * cpY + Math.pow(t, 2) * y2;
                                            if (isCobble) {
                                                const ang = Math.atan2(py - cpY, px - cpX) + Math.PI / 2;
                                                for (let r = -2; r <= 2; r++) {
                                                    const oX = Math.cos(ang) * r * 3, oY = Math.sin(ang) * r * 3;
                                                    offCtx.beginPath(); offCtx.arc(px + oX, py + oY, 1, 0, Math.PI * 2); offCtx.fill();
                                                }
                                            } else { offCtx.beginPath(); offCtx.arc(px, py, 2, 0, Math.PI * 2); offCtx.fill(); }
                                        }
                                    };
                                    const cx = s / 2, cy = s / 2;
                                    if (rHasN) drawP(cx, 0, cx, cy); if (rHasS) drawP(cx, s, cx, cy);
                                    if (rHasW) drawP(0, cy, cx, cy); if (rHasE) drawP(s, cy, cx, cy);
                                }
                                terrainCacheRef.current[cacheKey] = offCvs;
                                cachedCvs = offCvs;
                            }
                        }
                        if (cachedCvs) { const padding = s * 2; ctx.drawImage(cachedCvs, rx - padding, ry - padding, s + padding * 2, s + padding * 2); }
                    } else {
                        // --- Standard Room Chamber ---
                        const hasN = !!room.exits?.n, hasS = !!room.exits?.s, hasW = !!room.exits?.w, hasE = !!room.exits?.e;
                        const hasNW = !!room.exits?.nw, hasNE = !!room.exits?.ne, hasSW = !!room.exits?.sw, hasSE = !!room.exits?.se;
                        const ins = s * 0.07;
                        const nNW = neighborState[4] === 's', nNE = neighborState[5] === 's', nSW = neighborState[6] === 's', nSE = neighborState[7] === 's';
                        const pts = {
                            nw: { x: (hasW || hasNW || nNW) ? 0 : ins, y: (hasN || hasNW || nNW) ? 0 : ins },
                            ne: { x: (hasE || hasNE || nNE) ? s : s - ins, y: (hasN || hasNE || nNE) ? 0 : ins },
                            se: { x: (hasE || hasSE || nSE) ? s : s - ins, y: (hasS || hasSE || nSE) ? s : s - ins },
                            sw: { x: (hasW || hasSW || nSW) ? 0 : ins, y: (hasS || hasSW || nSW) ? s : s - ins }
                        };
                        ctx.fillStyle = '#d1d1d1'; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + s, ry); ctx.lineTo(rx + s, ry + s); ctx.lineTo(rx, ry + s); ctx.closePath();
                        ctx.moveTo(rx + pts.nw.x, ry + pts.nw.y); ctx.lineTo(rx + pts.sw.x, ry + pts.sw.y); ctx.lineTo(rx + pts.se.x, ry + pts.se.y); ctx.lineTo(rx + pts.ne.x, ry + pts.ne.y); ctx.closePath(); ctx.fill('evenodd');

                        // Walls
                        const rS = getSeed(room.x, room.y); const lSides = [!hasN, !hasE, !hasS, !hasW]; const cPts = [pts.ne, pts.se, pts.sw, pts.nw];
                        ctx.strokeStyle = 'rgba(160, 160, 160, 0.6)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
                        for (let i = 0; i < 4; i++) {
                            if (!lSides[i]) continue;
                            const pS = cPts[(i + 3) % 4], pE = cPts[i];
                            ctx.beginPath(); ctx.moveTo(rx + pS.x, ry + pS.y); ctx.lineTo(rx + pE.x, ry + pE.y); ctx.stroke();
                        }

                        if (selectedRoomIds.has(room.id)) {
                            ctx.fillStyle = 'rgba(249, 226, 175, 0.4)';
                            ctx.beginPath(); ctx.moveTo(rx + pts.nw.x, ry + pts.nw.y); ctx.lineTo(rx + pts.ne.x, ry + pts.ne.y); ctx.lineTo(rx + pts.se.x, ry + pts.se.y); ctx.lineTo(rx + pts.sw.x, ry + pts.sw.y); ctx.closePath(); ctx.fill();
                        }
                    }



                    if (coordMap[`${Math.round(room.x)},${Math.round(room.y)}`] > 1) {
                        ctx.fillStyle = '#f38ba8'; ctx.beginPath(); ctx.arc(rx + s - 6, ry + 6, Math.max(2, 4 * invZoom), 0, Math.PI * 2); ctx.fill();
                    }
                };

                drawRoomContent();

                if (isAnimating) {
                    ctx.restore();
                }
            });

            // --- DRAW PLAYER TRAIL ---
            if (playerTrailRef.current.length > 0) {
                ctx.save();
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
                playerTrailRef.current.forEach(t => {
                    const zDist = Math.abs(t.z - currentZ);
                    if (zDist < 1.5) {
                        ctx.globalAlpha = Math.max(0, t.alpha * (1 - zDist));
                        ctx.fillStyle = '#3b82f6';
                        ctx.beginPath();
                        const tx = t.x * GRID_SIZE + GRID_SIZE / 2;
                        const ty = t.y * GRID_SIZE + GRID_SIZE / 2;
                        // Trail drops shrink as they fade out
                        ctx.arc(tx, ty, 1 + (t.alpha * 4), 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
                ctx.restore();
            }

            // --- DRAW PLAYER ---
            if (playerPosRef.current && Math.abs(playerPosRef.current.z - currentZ) < 1.5) {
                const px = playerPosRef.current.x * GRID_SIZE + GRID_SIZE / 2;
                const py = playerPosRef.current.y * GRID_SIZE + GRID_SIZE / 2;

                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - Math.abs(playerPosRef.current.z - currentZ));

                // Shadow for player dot and text
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                // Hand drawn dot for player
                ctx.fillStyle = '#3b82f6'; // Bright blue for player
                ctx.beginPath();
                const verts = 10;
                const rad = 7;
                for (let i = 0; i < verts; i++) {
                    const ang = (i / verts) * Math.PI * 2;
                    const jit = (getSeed(i, 999) - 0.5) * 1.5;
                    const vx = px + Math.cos(ang) * (rad + jit);
                    const vy = py + Math.sin(ang) * (rad + jit);
                    if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                ctx.fill();

                // Player name label in Aniron
                // Player name label in Aniron
                if (characterName) {
                    const cleanName = characterName.replace(/\x1b\[[0-9;]*m/g, '');
                    let displayName = cleanName.replace(/^\{FULLNAME:/i, '').replace(/\}$/, '').split(' ')[0];
                    // If we have JSON artifacts left, clean them
                    if (displayName.includes('{') || displayName.includes('"') || displayName.includes(':')) {
                        displayName = displayName.replace(/[{}"']/g, '').split(':').pop()?.trim() || displayName;
                    }
                    ctx.font = `bold 13px "Aniron"`;
                    ctx.fillStyle = '#1e40af';
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(255,255,255,0.8)'; // White glow for text
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    ctx.fillText(displayName, px, py - 18);
                }

                if (currentRoom?.name) {
                    ctx.font = `italic 12px "Aniron"`;
                    ctx.fillStyle = '#2d2d2d';
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(255,255,255,0.9)'; // Stronger glow for room name
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    // Positioned below the room
                    ctx.fillText(currentRoom.name, px, py + GRID_SIZE / 2 + 15);
                }
                ctx.restore();
            }

            // --- Markers ---
            Object.values(markers).forEach(marker => {
                if ((marker.z || 0) !== currentZ) return;
                const mx = marker.x * GRID_SIZE;
                const my = marker.y * GRID_SIZE;
                const dotSize = marker.dotSize || 6;
                const fontSize = marker.fontSize || 16;
                const isSelected = selectedMarkerId === marker.id;

                // --- ANIMATION: Marker Drawing in ---
                const mAge = now - (marker.createdAt || 0);
                const isMAnimating = mAge < ANIM_DUR;
                const mP = isMAnimating ? mAge / ANIM_DUR : 1.0;
                const mNumSeed = marker.id.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);

                if (isMAnimating) {
                    ctx.save();
                    const centerX = mx, centerY = my;
                    const maxRadius = dotSize * 6;
                    const currentRadius = maxRadius * mP;

                    ctx.beginPath();
                    const verts = 10;
                    for (let i = 0; i < verts; i++) {
                        const angle = (i / verts) * Math.PI * 2;
                        const jitter = (getSeed(mNumSeed + i, mNumSeed) - 0.5) * dotSize * 2 * (1 - mP);
                        const vx = centerX + Math.cos(angle) * (currentRadius + jitter);
                        const vy = centerY + Math.sin(angle) * (currentRadius + jitter);
                        if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
                    }
                    ctx.closePath();
                    ctx.clip();

                    // Also add slight shake
                    ctx.translate((getSeed(mNumSeed, now * 0.01) - 0.5) * 2 * (1 - mP), (getSeed(mNumSeed + 1, now * 0.012) - 0.5) * 2 * (1 - mP));
                }

                // Hand drawn inky dot
                ctx.fillStyle = isSelected ? '#ef4444' : '#000000';
                ctx.beginPath();
                const getMSeed = (v: number) => Math.abs(Math.sin(v) * 10000) % 1;

                const vertices = 8;
                for (let i = 0; i < vertices; i++) {
                    const angle = (i / vertices) * Math.PI * 2;
                    const r = dotSize + (getMSeed(mNumSeed + i) - 0.5) * (dotSize * 0.4);
                    const vx = mx + Math.cos(angle) * r;
                    const vy = my + Math.sin(angle) * r;
                    if (i === 0) ctx.moveTo(vx, vy);
                    else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
                ctx.fill();

                // Label text - Aniron, Straight line above the dot
                if (marker.text) {
                    ctx.save();
                    ctx.font = `${fontSize}px Aniron`;
                    ctx.fillStyle = '#8b0000'; // Dark red
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(marker.text, mx, my - dotSize - 4);
                    ctx.restore();
                }

                if (isMAnimating) {
                    ctx.restore();
                }
            });

            // --- VIGNETTE OVERLAY ---
            if (stackPushed) {
                ctx.restore();
                stackPushed = false;
            }

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.sqrt(centerX * centerX + centerY * centerY);
            const vignette = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.1);
            vignette.addColorStop(0, isDarkMode ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)');
            vignette.addColorStop(0.4, isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
            vignette.addColorStop(0.7, isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)');
            vignette.addColorStop(0.9, isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)');
            vignette.addColorStop(1, isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();

            // Draw Marquee selection box
            if (marqueeStart && marqueeEnd) {
                const x1 = marqueeStart.x / dpr, y1 = marqueeStart.y / dpr;
                const x2 = marqueeEnd.x / dpr, y2 = marqueeEnd.y / dpr;
                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.strokeStyle = '#89b4fa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.fillStyle = 'rgba(137, 180, 250, 0.2)'; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                ctx.restore();
            }
        } catch (e) {
            console.error("Canvas Render Crash:", e);
        } finally {
            if (stackPushed && ctx) ctx.restore();
        }
    }, [rooms, markers, currentRoomId, selectedRoomIds, sortedRooms, marqueeStart, marqueeEnd, autoCenter, characterName, mode]);

    // Dedicated Animation/Render loop
    useEffect(() => {
        const tick = () => {
            drawMap();
            requestRef.current = requestAnimationFrame(tick);
        };
        requestRef.current = requestAnimationFrame(tick);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [drawMap]);

    useEffect(() => {
        const cvs = canvasRef.current, parent = cvs?.parentElement;
        if (!cvs || !parent) return;

        let resizeRaf: number | null = null;
        const handleResizeAction = () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                const canvas = canvasRef.current;
                const cam = cameraRef.current;
                if (canvas && parent) {
                    const dpr = getDPR();
                    const zoom = cam.zoom;

                    // 1. Capture world coordinate of the current center point
                    const oldW = canvas.width / dpr;
                    const oldH = canvas.height / dpr;
                    const worldCenterX = cam.x + (oldW / zoom) / 2;
                    const worldCenterY = cam.y + (oldH / zoom) / 2;

                    // 2. Update physical dimensions
                    const newW = parent.clientWidth;
                    const newH = parent.clientHeight;
                    canvas.width = newW * dpr;
                    canvas.height = newH * dpr;

                    // 3. Update camera to keep the same world point in the new center
                    cam.x = worldCenterX - (newW / zoom) / 2;
                    cam.y = worldCenterY - (newH / zoom) / 2;

                    drawMap();
                }
            });
        };

        const resizeObserver = new ResizeObserver(handleResizeAction);
        resizeObserver.observe(parent);
        window.addEventListener('resize', handleResizeAction);

        return () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeObserver.disconnect();
            window.removeEventListener('resize', handleResizeAction);
        };
    }, [currentRoomId, rooms, centerCameraOn, drawMap]);

    if (isMinimized) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    onClick={() => setIsMinimized(false)}
                    style={{
                        padding: '12px',
                        backgroundColor: 'rgba(30, 30, 46, 0.6)',
                        border: '1px solid rgba(137, 180, 250, 0.4)',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        color: '#89b4fa',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(137, 180, 250, 0.15)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(30, 30, 46, 0.6)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    title="Expand Map"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', height: '100%', backgroundColor: 'transparent', color: '#1e1e2e', fontFamily: 'serif', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Top Left Toolbar */}
            {(!isMobile || isExpanded) && (
                <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(30, 30, 46, 0.9)', padding: '4px', borderRadius: '4px', border: '1px solid #313244', display: 'flex', gap: '8px', alignItems: 'center', backdropFilter: 'blur(4px)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', backgroundColor: '#313244', borderRadius: '4px', overflow: 'hidden' }}>
                        <button style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'edit' ? '#89b4fa' : 'transparent', color: mode === 'edit' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'edit' ? 'bold' : 'normal' }} onClick={() => setMode('edit')}>Edit</button>
                        <button style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'play' ? '#a6e3a1' : 'transparent', color: mode === 'play' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'play' ? 'bold' : 'normal' }} onClick={() => setMode('play')}>Play</button>
                    </div>
                    <button
                        style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: autoCenter ? '#f9e2af' : '#313244', color: autoCenter ? '#11111b' : '#cdd6f4', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => { setAutoCenter(!autoCenter); if (!autoCenter && currentRoomId && rooms[currentRoomId]) centerCameraOn(rooms[currentRoomId].x, rooms[currentRoomId].y); }}
                        title="Center on player"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                        Center
                    </button>
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                    <button
                        style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#f38ba8', display: 'flex', alignItems: 'center' }}
                        onClick={() => setIsMinimized(true)}
                        title="Minimize"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            )}

            {/* Top Right Menu */}
            {(!isMobile || isExpanded) && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 20 }}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{
                            padding: '6px',
                            backgroundColor: 'rgba(30, 30, 46, 0.9)',
                            border: '1px solid #313244',
                            borderRadius: '4px',
                            color: '#cdd6f4',
                            cursor: 'pointer',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(49, 50, 68, 0.9)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(30, 30, 46, 0.9)'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>

                    {isDropdownOpen && (
                        <>
                            <div
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
                                onClick={() => setIsDropdownOpen(false)}
                            />
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: '#1e1e2e', border: '1px solid #313244', borderRadius: '8px', padding: '8px', minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#585b70', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Settings</div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <input
                                        type="checkbox"
                                        checked={allowPersistence}
                                        onChange={(e) => setAllowPersistence(e.target.checked)}
                                        style={{ cursor: 'pointer', accentColor: '#a6e3a1', width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '13px', color: allowPersistence ? '#a6e3a1' : '#f38ba8', fontWeight: 'bold' }}>Session Saving</span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', borderRadius: '4px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <input
                                        type="checkbox"
                                        checked={isDarkMode}
                                        onChange={(e) => setIsDarkMode(e.target.checked)}
                                        style={{ cursor: 'pointer', accentColor: '#cba6f7', width: '16px', height: '16px' }}
                                    />
                                    <span style={{ fontSize: '13px', color: isDarkMode ? '#cba6f7' : '#fab387', fontWeight: 'bold' }}>Dark Mode (Inverted)</span>
                                </label>

                                <div style={{ height: '1px', backgroundColor: '#313244', margin: '4px 8px' }} />

                                <div style={{ padding: '6px 12px', fontSize: '11px', color: '#585b70', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Management</div>

                                <button style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#89b4fa', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { exportMap(); setIsDropdownOpen(false); }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(137, 180, 250, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    Export Map
                                </button>

                                <label style={{ padding: '8px 12px', backgroundColor: 'transparent', border: 'none', color: '#a6e3a1', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(166, 227, 161, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    Import Map
                                    <input type="file" onChange={(e) => { importMap(e); setIsDropdownOpen(false); }} style={{ display: 'none' }} accept=".json" />
                                </label>

                                <div style={{ height: '1px', backgroundColor: '#313244', margin: '4px 8px' }} />

                                <button
                                    onClick={() => { clearMap(); setIsDropdownOpen(false); }}
                                    style={{ padding: '8px 12px', backgroundColor: 'rgba(243, 139, 168, 0.05)', border: 'none', color: '#f38ba8', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.05)'}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    Clear Entire Map
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {infoRoomId && rooms[infoRoomId] && (
                <div
                    ref={cardRef}
                    style={{ position: 'absolute', top: '48px', bottom: '16px', left: '8px', right: '16px', zIndex: 100, backgroundColor: '#18181b', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.8)', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', overflowY: 'auto', pointerEvents: 'auto', color: '#e4e4e7', touchAction: 'pan-y' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#ffcc00', fontSize: '20px', fontWeight: 'bold' }}>Room Info</h3>
                        <button onClick={() => setInfoRoomId(null)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a1a1aa' }}>
                        <span>Client ID: <span style={{ color: '#e4e4e7', fontWeight: '500' }}>{infoRoomId}</span></span>
                        <span>GMCP ID: <span style={{ color: '#60a5fa' }}>{rooms[infoRoomId].gmcpId || 'N/A'}</span></span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <input type="text" value={rooms[infoRoomId].name || ''} onChange={(e) => setRooms(prev => ({ ...prev, [infoRoomId]: { ...prev[infoRoomId], name: e.target.value } }))} style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '10px 14px', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '15px' }} readOnly={mode !== 'edit'} placeholder="Room Name" />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: '#71717a', marginRight: '4px' }}>Zone: </span>
                            <input
                                type="text"
                                value={rooms[infoRoomId].zone || ''}
                                onChange={(e) => setRooms(prev => ({ ...prev, [infoRoomId]: { ...prev[infoRoomId], zone: e.target.value } }))}
                                style={{ backgroundColor: 'transparent', border: 'none', color: '#d4d4d8', width: '100%', outline: 'none', fontSize: '12px' }}
                                readOnly={mode !== 'edit'}
                                placeholder="Zone"
                            />
                        </div>
                        <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#71717a', marginRight: '4px' }}>Terrain: </span>
                            {mode === 'edit' ? (
                                <select
                                    value={rooms[infoRoomId].terrain || 'Field'}
                                    onChange={(e) => setRooms(prev => ({ ...prev, [infoRoomId]: { ...prev[infoRoomId], terrain: e.target.value } }))}
                                    style={{ backgroundColor: 'transparent', border: 'none', color: '#10b981', fontWeight: 'bold', cursor: 'pointer', outline: 'none', fontSize: '12px' }}
                                >
                                    {Array.from(new Set(Object.values(TERRAIN_MAP))).map(t => (
                                        <option key={t} value={t} style={{ backgroundColor: '#181825', color: 'white' }}>{t}</option>
                                    ))}
                                </select>
                            ) : (
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{rooms[infoRoomId].terrain || 'Field'}</span>
                            )}
                        </div>
                    </div>

                    {rooms[infoRoomId].desc && (
                        <div style={{ fontSize: '13px', color: '#d1d5db', backgroundColor: '#141417', padding: '14px', borderRadius: '8px', border: '1px solid #27272a', lineHeight: '1.6' }}>
                            {rooms[infoRoomId].desc}
                        </div>
                    )}

                    <div style={{ height: '1px', backgroundColor: '#27272a', margin: '4px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exits</span>
                            {mode === 'edit' && <span style={{ fontSize: '9px', color: '#52525b' }}>Shift+Click to delete</span>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {['nw', 'n', 'ne', 'w', 'u', 'e', 'sw', 's', 'se', 'd'].map(d => {
                                const exit = rooms[infoRoomId].exits[d];
                                const isActive = !!exit;
                                return (
                                    <button
                                        key={d}
                                        onClick={(e) => {
                                            if (mode !== 'edit') return;
                                            setRooms(prev => {
                                                const r = prev[infoRoomId];
                                                if (e.shiftKey && r.exits[d]) {
                                                    const targetId = r.exits[d].target;
                                                    const nextRooms = { ...prev };
                                                    const nextExits = { ...r.exits };
                                                    delete nextExits[d];
                                                    nextRooms[infoRoomId] = { ...r, exits: nextExits };
                                                    if (targetId && nextRooms[targetId]) {
                                                        const targetExits = { ...nextRooms[targetId].exits };
                                                        delete targetExits[DIRS[d].opp];
                                                        nextRooms[targetId] = { ...nextRooms[targetId], exits: targetExits };
                                                    }
                                                    return nextRooms;
                                                }
                                                if (!r.exits[d]) {
                                                    const dir = DIRS[d];
                                                    const tx = r.x + dir.dx, ty = r.y + dir.dy, tz = (r.z || 0) + (dir.dz || 0);
                                                    let tId = Object.keys(prev).find(id => Math.round(prev[id].x) === Math.round(tx) && Math.round(prev[id].y) === Math.round(ty) && (prev[id].z || 0) === tz);
                                                    const nextRooms = { ...prev };
                                                    if (!tId) {
                                                        tId = generateId();
                                                        nextRooms[tId] = { id: tId, gmcpId: 0, name: 'New Room', x: tx, y: ty, z: tz, terrain: 'Field', exits: {}, zone: r.zone, notes: "" };
                                                    }
                                                    nextRooms[infoRoomId] = { ...r, exits: { ...r.exits, [d]: { target: tId, closed: false } } };
                                                    nextRooms[tId] = { ...nextRooms[tId], exits: { ...nextRooms[tId].exits, [dir.opp]: { target: infoRoomId, closed: false } } };
                                                    return nextRooms;
                                                } else {
                                                    const targetId = r.exits[d].target;
                                                    const closed = !r.exits[d].closed;
                                                    const nextRooms = { ...prev };
                                                    nextRooms[infoRoomId] = { ...r, exits: { ...r.exits, [d]: { ...r.exits[d], closed } } };
                                                    if (targetId && nextRooms[targetId]) {
                                                        const opp = DIRS[d].opp;
                                                        nextRooms[targetId] = { ...nextRooms[targetId], exits: { ...nextRooms[targetId].exits, [opp]: { ...(nextRooms[targetId].exits[opp] || {}), closed, target: infoRoomId } } };
                                                    }
                                                    return nextRooms;
                                                }
                                            });
                                        }}
                                        style={{
                                            backgroundColor: isActive ? (exit?.closed ? '#521313' : '#1e293b') : '#1c1c1f',
                                            color: isActive ? (exit?.closed ? '#f87171' : '#60a5fa') : '#3f3f46',
                                            border: '1px solid',
                                            borderColor: isActive ? (exit?.closed ? '#991b1b' : '#3b82f6') : '#27272a',
                                            padding: '8px 0',
                                            borderRadius: '6px',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold',
                                            fontSize: '11px',
                                            cursor: mode === 'edit' ? 'pointer' : 'default',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {d} {exit?.closed ? '🔒' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</span>
                        <textarea
                            value={rooms[infoRoomId].notes || ''}
                            onChange={(e) => setRooms(prev => ({ ...prev, [infoRoomId]: { ...prev[infoRoomId], notes: e.target.value } }))}
                            style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '10px 14px', borderRadius: '8px', color: '#fde047', height: '80px', resize: 'none', fontSize: '13px' }}
                            placeholder={mode === 'edit' ? "Enter your notes here..." : "No notes yet."}
                            readOnly={mode !== 'edit'}
                        />
                    </div>

                    <button
                        onClick={deleteRoom}
                        style={{ marginTop: '8px', padding: '14px', backgroundColor: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#991b1b')}
                    >
                        Delete Room
                    </button>
                </div>
            )}

            {selectedMarkerId && markers[selectedMarkerId] && (
                <div
                    ref={cardRef}
                    style={{ position: 'absolute', top: '48px', left: '8px', zIndex: 100, backgroundColor: '#18181b', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.8)', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', width: '280px', color: '#e4e4e7', pointerEvents: 'auto', touchAction: 'pan-y' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '18px', fontWeight: 'bold' }}>Marker Editor</h3>
                        <button onClick={() => setSelectedMarkerId(null)} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Label Text</label>
                        <input
                            type="text"
                            value={markers[selectedMarkerId].text || ''}
                            onChange={(e) => setMarkers(prev => ({ ...prev, [selectedMarkerId]: { ...prev[selectedMarkerId], text: e.target.value } }))}
                            style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '8px 12px', borderRadius: '8px', color: 'white', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                            placeholder="Marker text..."
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <label style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Dot Size</label>
                            <input
                                type="number"
                                value={markers[selectedMarkerId].dotSize || 6}
                                onChange={(e) => setMarkers(prev => ({ ...prev, [selectedMarkerId]: { ...prev[selectedMarkerId], dotSize: Number(e.target.value) } }))}
                                style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '8px 12px', borderRadius: '8px', color: 'white', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                            <label style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Font Size</label>
                            <input
                                type="number"
                                value={markers[selectedMarkerId].fontSize || 16}
                                onChange={(e) => setMarkers(prev => ({ ...prev, [selectedMarkerId]: { ...prev[selectedMarkerId], fontSize: Number(e.target.value) } }))}
                                style={{ backgroundColor: '#1c1c1f', border: '1px solid #3f3f46', padding: '8px 12px', borderRadius: '8px', color: 'white', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (confirm("Delete this marker?")) {
                                setMarkers(prev => {
                                    const next = { ...prev };
                                    delete next[selectedMarkerId];
                                    return next;
                                });
                                setSelectedMarkerId(null);
                            }
                        }}
                        style={{ marginTop: '8px', padding: '12px', backgroundColor: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#450a0a'}
                    >
                        Delete Marker
                    </button>
                </div>
            )}

            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    className="block touch-none"
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none',
                        filter: isDarkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                        backgroundColor: '#ffffff'
                    }}
                    onContextMenu={(e) => {
                        if (mode !== 'edit') return;
                        e.preventDefault();
                        const rect = canvasRef.current!.getBoundingClientRect();
                        const lx = e.clientX - rect.left;
                        const ly = e.clientY - rect.top;
                        const world = screenToWorld(lx, ly);
                        const roomId = getRoomAt(world.x, world.y, true);
                        setContextMenu({ x: lx, y: ly, wx: world.x, wy: world.y, roomId });
                    }}
                />
            </div>

            {contextMenu && (
                <div
                    style={{
                        position: 'absolute',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        zIndex: 500,
                        backgroundColor: '#181825',
                        border: '1px solid #313244',
                        borderRadius: '8px',
                        padding: '4px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        minWidth: '150px'
                    }}
                >
                    {!contextMenu.roomId ? (
                        <button
                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#a6e3a1', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(166, 227, 161, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => {
                                const newId = generateId();
                                const gx = Math.floor(contextMenu.wx / GRID_SIZE);
                                const gy = Math.floor(contextMenu.wy / GRID_SIZE);
                                const currentZ = currentRoomId ? (rooms[currentRoomId]?.z || 0) : 0;
                                setRooms(prev => ({
                                    ...prev,
                                    [newId]: {
                                        id: newId,
                                        gmcpId: 0,
                                        name: 'New Room',
                                        x: gx,
                                        y: gy,
                                        z: currentZ,
                                        terrain: 'Field',
                                        exits: {},
                                        zone: 'Manual',
                                        createdAt: Date.now()
                                    }
                                }));
                                setContextMenu(null);
                            }}
                        >
                            + Create Room
                        </button>
                    ) : (
                        <>
                            <div style={{ padding: '6px 12px', fontSize: '10px', color: '#585b70', textTransform: 'uppercase', fontWeight: 'bold' }}>Set Terrain</div>
                            {Object.entries(TERRAIN_MAP).map(([symbol, name]) => (
                                <button
                                    key={symbol}
                                    style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#cdd6f4', cursor: 'pointer', borderRadius: '4px', fontSize: '12px' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    onClick={() => {
                                        setRooms(prev => ({
                                            ...prev,
                                            [contextMenu.roomId!]: { ...prev[contextMenu.roomId!], terrain: name }
                                        }));
                                        setContextMenu(null);
                                    }}
                                >
                                    {name} ({symbol})
                                </button>
                            ))}
                        </>
                    )
                    }
                    <div style={{ height: '1px', backgroundColor: '#313244', margin: '4px' }} />
                    <button
                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(252, 165, 165, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => {
                            const id = generateId();
                            const currentZ = currentRoomId ? (rooms[currentRoomId]?.z || 0) : 0;
                            setMarkers(prev => ({
                                ...prev,
                                [id]: { id, x: contextMenu.wx / GRID_SIZE, y: contextMenu.wy / GRID_SIZE, z: currentZ, text: "Label", dotSize: 6, fontSize: 16, createdAt: Date.now() }
                            }));
                            setContextMenu(null);
                            setSelectedMarkerId(id);
                            setInfoRoomId(null);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        Add Marker
                    </button>
                    <div style={{ height: '1px', backgroundColor: '#313244', margin: '4px' }} />
                    <button
                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#f38ba8', cursor: 'pointer', borderRadius: '4px', fontSize: '13px' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(243, 139, 168, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => setContextMenu(null)}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
});
