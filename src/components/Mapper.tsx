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

export interface MapperRef {
    handleRoomInfo: (data: any) => void;
    handleTerrain: (terrain: string) => void;
    pushPendingMove: (dir: string) => void;
    handleMoveFailure: () => void;
}

export interface MapperProps {
    isDesignMode?: boolean;
}

export const Mapper = forwardRef<MapperRef, MapperProps>(({ isDesignMode }, ref) => {
    // --- STATE ---
    const [mode, setMode] = useState<'edit' | 'play'>('play');
    const [rooms, setRooms] = useState<Record<string, any>>({});
    const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [infoRoomId, setInfoRoomId] = useState<string | null>(null);
    const [autoCenter, setAutoCenter] = useState(true);

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
    const dragTypeRef = useRef<'pan' | 'room' | 'pinch' | null>(null);
    const [isDragging, setIsDragging] = useState(false); // Kept for UI cursor style only
    const activePointersRef = useRef<Map<number, { x: number, y: number }>>(new Map());
    const lastPointersRef = useRef<{ id: number, x: number, y: number }[]>([]);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const startMouseRef = useRef({ x: 0, y: 0 });
    const dragInfoRef = useRef({
        startRoomX: 0,
        startRoomY: 0,
        startCamX: 0,
        startCamY: 0
    });
    const cardRef = useRef<HTMLDivElement>(null);
    const scrollLockRef = useRef(false);

    // Persistence Logic
    useEffect(() => {
        const saved = localStorage.getItem('mume_mapper_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') setRooms(parsed);
            } catch (e) {
                console.error("Failed to load map data:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (Object.keys(rooms).length > 0) {
            localStorage.setItem('mume_mapper_data', JSON.stringify(rooms));
        }
    }, [rooms]);

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
                        zone, terrain: freshTerrain || lastDetectedTerrainRef.current || 'Unknown Terrain', exits: {}, notes: ""
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
        if (!infoRoomId) return;
        setRooms(prev => {
            const newRooms = { ...prev };
            delete newRooms[infoRoomId];
            return newRooms;
        });
        setInfoRoomId(null);
        setSelectedRoomId(null);
    }, [infoRoomId]);

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

    useEffect(() => {
        if (!currentRoomId || !autoCenter || isDragging) return;
        const room = rooms[currentRoomId];
        if (room) centerCameraOn(room.x, room.y);
    }, [currentRoomId, rooms, centerCameraOn, autoCenter, isDragging]);

    const screenToWorld = (sx: number, sy: number) => ({
        x: (sx / cameraRef.current.zoom) + cameraRef.current.x,
        y: (sy / cameraRef.current.zoom) + cameraRef.current.y
    });

    const getRoomAt = (wx: number, wy: number) => {
        const margin = 2;
        let foundRoom: string | null = null;
        let bestDist = Infinity;
        const currentZ = currentRoomId ? (rooms[currentRoomId]?.z || 0) : 0;

        for (const key in rooms) {
            const r = rooms[key];
            const rx = r.x * GRID_SIZE;
            const ry = r.y * GRID_SIZE;
            if (wx >= rx - margin && wx <= rx + GRID_SIZE + margin && wy >= ry - margin && wy <= ry + GRID_SIZE + margin) {
                const rz = r.z || 0;
                if (rz === currentZ) return r.id;
                const dist = Math.abs(rz - currentZ);
                if (dist < bestDist) { bestDist = dist; foundRoom = r.id; }
            }
        }
        return foundRoom;
    };

    // Native Interaction Engine - Bypasses React's passive listener defaults
    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;

        const onDown = (e: PointerEvent) => {
            // In design mode, we want the parent container to handle dragging/resizing
            if (isDesignMode) {
                isDraggingRef.current = false;
                return;
            }

            // Block map interaction if we touch the UI card
            if (cardRef.current && cardRef.current.contains(e.target as Node)) {
                scrollLockRef.current = true;
                return;
            }
            scrollLockRef.current = false;

            // Block default scroll/gestures on the map ONLY
            e.preventDefault();
            e.stopPropagation();

            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            activePointersRef.current.set(e.pointerId, { x: mx, y: my });
            cvs.setPointerCapture(e.pointerId);

            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const pointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = pointers;

            if (pointers.length === 1) {
                hasDraggedRef.current = false;
                const world = screenToWorld(mx, my);
                const clickedRoomId = getRoomAt(world.x, world.y);

                if (clickedRoomId && mode === 'edit') {
                    const r = rooms[clickedRoomId];
                    setSelectedRoomId(clickedRoomId);
                    isDraggingRef.current = true;
                    dragTypeRef.current = 'room';
                    setIsDragging(true);
                    dragInfoRef.current = { startRoomX: r.x, startRoomY: r.y, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y };
                    if (infoRoomId && infoRoomId !== clickedRoomId) setInfoRoomId(null);
                } else {
                    isDraggingRef.current = true;
                    dragTypeRef.current = 'pan';
                    setIsDragging(true);
                    if (!clickedRoomId) { setSelectedRoomId(null); setInfoRoomId(null); }
                }
                startMouseRef.current = { x: mx, y: my };
            } else if (pointers.length === 2) {
                isDraggingRef.current = true;
                dragTypeRef.current = 'pinch';
                setIsDragging(true);
            }
            lastMouseRef.current = { x: mx, y: my };
        };

        const onMove = (e: PointerEvent) => {
            if (scrollLockRef.current) return;
            if (!isDraggingRef.current) return;
            // Stop if we catch an event that started on the card
            if (cardRef.current && cardRef.current.contains(e.target as Node)) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            activePointersRef.current.set(e.pointerId, { x: mx, y: my });
            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const pointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));

            if (pointers.length === 1 && (dragTypeRef.current === 'pan' || dragTypeRef.current === 'room')) {
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
                } else if (dragTypeRef.current === 'room' && selectedRoomId && mode === 'edit') {
                    const worldDx = dx / cameraRef.current.zoom;
                    const worldDy = dy / cameraRef.current.zoom;
                    setRooms(prev => {
                        const r = prev[selectedRoomId];
                        if (!r) return prev;
                        return { ...prev, [selectedRoomId]: { ...r, x: r.x + (worldDx / GRID_SIZE), y: r.y + (worldDy / GRID_SIZE) } };
                    });
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

                    // 1. Move camera by the weighted physical finger drag
                    cam.x -= ((mid.x - lastMid.x) * DRAG_SENSITIVITY) / oldZoom;
                    cam.y -= ((mid.y - lastMid.y) * DRAG_SENSITIVITY) / oldZoom;

                    // 2. Adjust camera for zoom to keep the world point at 'mid' stable
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
            scrollLockRef.current = false;
            activePointersRef.current.delete(e.pointerId);
            const pointerIds = Array.from(activePointersRef.current.keys()).sort((a, b) => a - b);
            const remPointers = pointerIds.map(id => ({ id, ...activePointersRef.current.get(id)! }));
            lastPointersRef.current = remPointers;

            if (activePointersRef.current.size === 0) {
                if (!hasDraggedRef.current && dragTypeRef.current === 'room' && selectedRoomId) setInfoRoomId(selectedRoomId);
                if (dragTypeRef.current === 'room' && selectedRoomId && hasDraggedRef.current) {
                    setRooms(prev => {
                        const r = prev[selectedRoomId];
                        if (!r) return prev;
                        return { ...prev, [selectedRoomId]: { ...r, x: Math.round(r.x), y: Math.round(r.y) } };
                    });
                }
                isDraggingRef.current = false;
                dragTypeRef.current = null;
                setIsDragging(false);
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
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const cam = cameraRef.current;
            const factor = Math.pow(1.05, -e.deltaY / 120);
            const oldZoom = cam.zoom;
            const newZoom = Math.max(0.1, Math.min(oldZoom * factor, 5));
            if (Math.abs(newZoom - oldZoom) < 0.001) return;
            const wx = (mx / oldZoom) + cam.x;
            const wy = (my / oldZoom) + cam.y;
            cam.x = wx - (mx / newZoom);
            cam.y = wy - (my / newZoom);
            cam.zoom = newZoom;
            setAutoCenter(false);
        };

        cvs.addEventListener('pointerdown', onDown, { passive: false });
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
        window.addEventListener('pointercancel', onUp, { passive: false });
        cvs.addEventListener('wheel', onWheel, { passive: false });

        // Isolate card from global interaction engine
        const card = cardRef.current;
        if (card) {
            // We do NOT block events here via manual stopPropagation on Move, 
            // the Logic in onDown/onMove handles it with scrollLockRef.
            // This allows the browser to 'see' the move for scrolling.
            card.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
        }

        return () => {
            cvs.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            cvs.removeEventListener('wheel', onWheel);
            if (card) {
                // block was removed in favor of internal logic
            }
        };
    }, [mode, rooms, selectedRoomId, infoRoomId, currentRoomId, isDesignMode]);

    const sortedRooms = useMemo(() => {
        try {
            const currentRoom = currentRoomId ? rooms[currentRoomId] : null;
            const currentZ = currentRoom?.z || 0;
            return Object.values(rooms).sort((a, b) => {
                if (!a || !b) return 0;
                const aDist = Math.abs((a.z || 0) - currentZ);
                const bDist = Math.abs((b.z || 0) - currentZ);
                return bDist - aDist;
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
            ctx.fillStyle = '#1e1e2e';
            ctx.fillRect(0, 0, width, height);

            if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y) || !Number.isFinite(cam.zoom)) return;

            ctx.save();
            stackPushed = true;
            ctx.scale(cam.zoom * dpr, cam.zoom * dpr);
            ctx.translate(-cam.x, -cam.y);

            const zoom = cam.zoom;
            const invZoom = 1 / zoom;
            ctx.strokeStyle = '#313244';
            ctx.lineWidth = (1 / dpr) * invZoom;

            const startX = Math.floor(cam.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
            const startY = Math.floor(cam.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
            const endX = cam.x + (width / dpr) * invZoom + GRID_SIZE;
            const endY = cam.y + (height / dpr) * invZoom + GRID_SIZE;

            if (Number.isFinite(startX) && Number.isFinite(endX)) {
                for (let x = startX; x <= endX; x += GRID_SIZE) {
                    ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
                }
            }
            if (Number.isFinite(startY) && Number.isFinite(endY)) {
                for (let y = startY; y <= endY; y += GRID_SIZE) {
                    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
                }
            }

            const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, thickness: number = 2, dashed = false) => {
                if (!Number.isFinite(x1) || !Number.isFinite(y1)) return;
                ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = (thickness / dpr) * invZoom;
                if (dashed) ctx.setLineDash([5 * invZoom, 5 * invZoom]);
                ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
            };

            const currentRoom = currentRoomId ? rooms[currentRoomId] : null;
            const currentZ = currentRoom?.z || 0;

            Object.values(rooms).forEach(room => {
                if (!room || !room.exits) return;
                const rz = room.z || 0;
                if (Math.abs(rz - currentZ) > 4) return;
                const rx = room.x * GRID_SIZE + GRID_SIZE / 2;
                const ry = room.y * GRID_SIZE + GRID_SIZE / 2;
                ctx.globalAlpha = rz === currentZ ? 1.0 : 0.25;
                Object.entries(room.exits).forEach(([dir, exitData]: [string, any]) => {
                    const target = rooms[exitData.target];
                    if (!target) return;
                    const d = DIRS[dir];
                    if (d) {
                        const isNondirectional = Math.abs(target.x - (room.x + d.dx)) > 0.1 || Math.abs(target.y - (room.y + d.dy)) > 0.1;
                        drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, isNondirectional ? '#89b4fa' : '#45475a', isNondirectional ? 2 : 1.5, exitData.closed);
                    } else if (dir === 'u' || dir === 'd') {
                        drawLine(rx, ry, target.x * GRID_SIZE + GRID_SIZE / 2, target.y * GRID_SIZE + GRID_SIZE / 2, '#f9e2af', 2, exitData.closed);
                    }
                });
            });

            ctx.globalAlpha = 1.0;
            const coordMap: Record<string, number> = {};
            sortedRooms.forEach(r => { if (r) { const k = `${Math.round(r.x)},${Math.round(r.y)}`; coordMap[k] = (coordMap[k] || 0) + 1; } });

            sortedRooms.forEach(room => {
                if (!room) return;
                const rx = room.x * GRID_SIZE, ry = room.y * GRID_SIZE, s = GRID_SIZE, rz = room.z || 0;
                if (Math.abs(rz - currentZ) > 4) return;
                ctx.globalAlpha = rz === currentZ ? 1.0 : 0.35;
                ctx.fillStyle = room.id === currentRoomId ? '#a6e3a1' : (room.id === selectedRoomId ? '#f9e2af' : '#45475a');
                ctx.fillRect(rx, ry, s, s);

                if (coordMap[`${Math.round(room.x)},${Math.round(room.y)}`] > 1) {
                    ctx.fillStyle = '#f38ba8'; ctx.beginPath(); ctx.arc(rx + s - 6, ry + 6, Math.max(2, 4 * invZoom), 0, Math.PI * 2); ctx.fill();
                }

                const drawWall = (x1: number, y1: number, x2: number, y2: number, dir: string) => {
                    const exit = room.exits[dir];
                    if (!exit) drawLine(x1, y1, x2, y2, '#cdd6f4', 1);
                    else if (exit.closed) {
                        drawLine(x1, y1, x2, y2, '#f38ba8', 2);
                        const wmx = (x1 + x2) / 2, wmy = (y1 + y2) / 2;
                        if (dir === 'n' || dir === 's') drawLine(wmx, wmy - 4, wmx, wmy + 4, '#f38ba8', 2);
                        if (dir === 'e' || dir === 'w') drawLine(wmx - 4, wmy, wmx + 4, wmy, '#f38ba8', 2);
                    }
                };
                drawWall(rx, ry, rx + s, ry, 'n'); drawWall(rx, ry + s, rx + s, ry + s, 's');
                drawWall(rx + s, ry, rx + s, ry + s, 'e'); drawWall(rx, ry, rx, ry + s, 'w');

                if (rz === currentZ && zoom > 0.4) {
                    ctx.fillStyle = '#1e1e2e'; ctx.font = `${Math.max(8, 10 * invZoom)}px Arial`; ctx.textAlign = 'center';
                    ctx.fillText((room.name || 'Room').substring(0, 6), rx + s / 2, ry + s / 2 + 3);
                }
            });
        } catch (e) {
            console.error("Canvas Render Crash:", e);
        } finally {
            if (stackPushed && ctx) ctx.restore();
        }
    }, [rooms, currentRoomId, selectedRoomId, sortedRooms]);

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
        const resizeObserver = new ResizeObserver(() => {
            const dpr = getDPR();
            const w = Math.round(parent.clientWidth * dpr), h = Math.round(parent.clientHeight * dpr);
            if (w > 0 && h > 0 && (cvs.width !== w || cvs.height !== h)) {
                cvs.width = w; cvs.height = h;
                // Re-center on resize if auto-center is on (crucial for mobile layout shifts)
                if (autoCenter && currentRoomId && rooms[currentRoomId]) {
                    const r = rooms[currentRoomId];
                    centerCameraOn(r.x, r.y);
                }
            }
        });
        resizeObserver.observe(parent);
        const dpr = getDPR();
        const initW = Math.round(parent.clientWidth * dpr), initH = Math.round(parent.clientHeight * dpr);
        if (initW > 0 && initH > 0) { cvs.width = initW; cvs.height = initH; }
        return () => resizeObserver.disconnect();
    }, [autoCenter, currentRoomId, rooms, centerCameraOn]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', height: '100%', backgroundColor: '#181825', borderLeft: '1px solid #313244', color: '#cdd6f4', fontFamily: 'sans-serif' }}>
            <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10, backgroundColor: 'rgba(30, 30, 46, 0.9)', padding: '4px', borderRadius: '4px', border: '1px solid #313244', display: 'flex', gap: '8px', alignItems: 'center', backdropFilter: 'blur(4px)', fontSize: '12px' }}>
                <div style={{ display: 'flex', backgroundColor: '#313244', borderRadius: '4px', overflow: 'hidden' }}>
                    <button style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'edit' ? '#89b4fa' : 'transparent', color: mode === 'edit' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'edit' ? 'bold' : 'normal' }} onClick={() => setMode('edit')}>Edit</button>
                    <button style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'play' ? '#a6e3a1' : 'transparent', color: mode === 'play' ? '#11111b' : '#cdd6f4', fontWeight: mode === 'play' ? 'bold' : 'normal' }} onClick={() => setMode('play')}>Play</button>
                </div>
                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: autoCenter ? '#f9e2af' : '#313244', color: autoCenter ? '#11111b' : '#cdd6f4', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => { setAutoCenter(!autoCenter); if (!autoCenter && currentRoomId && rooms[currentRoomId]) centerCameraOn(rooms[currentRoomId].x, rooms[currentRoomId].y); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                    Center
                </button>

                <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

                <button
                    style={{ padding: '4px 8px', border: 'none', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#89b4fa', fontWeight: 'bold' }}
                    onClick={exportMap}
                    title="Save map as file"
                >
                    Export
                </button>

                <label style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: '#313244', color: '#a6e3a1', fontWeight: 'bold' }}>
                    Import
                    <input type="file" onChange={importMap} style={{ display: 'none' }} accept=".json" />
                </label>
            </div>

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
                        <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px' }}>
                            <span style={{ color: '#71717a' }}>Zone: </span><span style={{ color: '#d4d4d8' }}>{rooms[infoRoomId].zone || 'Unknown Zone'}</span>
                        </div>
                        <div style={{ backgroundColor: '#1c1c1f', border: '1px solid #27272a', padding: '8px 12px', borderRadius: '8px', flex: 1, fontSize: '12px', textAlign: 'center' }}>
                            <span style={{ color: '#71717a' }}>Terrain: </span><span style={{ color: '#10b981' }}>{rooms[infoRoomId].terrain || 'Road'}</span>
                        </div>
                    </div>

                    {rooms[infoRoomId].desc && (
                        <div style={{ fontSize: '13px', color: '#d1d5db', backgroundColor: '#141417', padding: '14px', borderRadius: '8px', border: '1px solid #27272a', lineHeight: '1.6' }}>
                            {rooms[infoRoomId].desc}
                        </div>
                    )}

                    <div style={{ height: '1px', backgroundColor: '#27272a', margin: '4px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exits</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {['n', 's', 'e', 'w', 'u', 'd'].map(d => {
                                const exit = rooms[infoRoomId].exits[d];
                                const isActive = !!exit;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            if (mode !== 'edit') return;
                                            setRooms(prev => {
                                                const r = prev[infoRoomId];
                                                if (!r.exits[d]) return prev; // Only toggle existing for now
                                                const targetId = r.exits[d].target;
                                                const closed = !r.exits[d].closed;
                                                return {
                                                    ...prev,
                                                    [infoRoomId]: { ...r, exits: { ...r.exits, [d]: { ...r.exits[d], closed } } },
                                                    ...(targetId ? { [targetId]: { ...prev[targetId], exits: { ...prev[targetId].exits, [DIRS[d].opp]: { ...prev[targetId].exits[DIRS[d].opp] || {}, closed, target: infoRoomId } } } } : {})
                                                };
                                            });
                                        }}
                                        style={{
                                            backgroundColor: isActive ? (exit.closed ? '#991b1b' : '#065f46') : '#1c1c1f',
                                            color: isActive ? '#ecfdf5' : '#3f3f46',
                                            border: '1px solid',
                                            borderColor: isActive ? (exit.closed ? '#f87171' : '#10b981') : '#27272a',
                                            padding: '12px 0',
                                            borderRadius: '8px',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold',
                                            cursor: mode === 'edit' && isActive ? 'pointer' : 'default',
                                            transition: 'all 0.2s'
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

            <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                <canvas ref={canvasRef} className="block touch-none" style={{ width: '100%', height: '100%', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }} />
            </div>
        </div>
    );
});
