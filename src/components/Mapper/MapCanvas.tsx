import React, { useRef, useCallback, useEffect, forwardRef } from 'react';
import { useMapperRenderer } from './useMapperRenderer';
import { useMapAnimation } from './useMapAnimation';

interface MapCanvasProps {
    rooms: Record<string, any>;
    markers: Record<string, any>;
    currentRoomId: string | null;
    selectedRoomIds: Set<string>;
    selectedMarkerId: string | null;
    camera: React.MutableRefObject<{ x: number, y: number, zoom: number }>;
    isDarkMode: boolean;
    isMobile: boolean;
    imagesRef: React.MutableRefObject<Record<string, HTMLImageElement>>;
    characterName: string | null;
    playerPosRef: React.MutableRefObject<{ x: number, y: number, z: number } | null>;
    playerTrailRef: React.MutableRefObject<{ x: number, y: number, z: number, alpha: number }[]>;
    renderVersion: number;
    isDragging: boolean;
    marquee: any;
    autoCenter?: boolean;
    stableRoomsRef: React.MutableRefObject<Record<string, any>>;
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableMarkersRef: React.MutableRefObject<Record<string, any>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>>;
    spatialIndexRef: React.MutableRefObject<Record<number, Record<string, string[]>>>;
    exploredVnums: Set<string>;
    exploredRef: React.MutableRefObject<Set<string>>;
    onMouseDown?: (e: React.MouseEvent) => void;
    onMouseMove?: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerMove?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    triggerRender?: () => void;
    unveilMap?: boolean;
    viewZ?: number | null;
}

export const MapCanvas = React.memo(forwardRef<HTMLCanvasElement, MapCanvasProps>((props, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

    const getDPR = useCallback(() => Math.min(props.isMobile ? 2.0 : 2.5, window.devicePixelRatio || 1), [props.isMobile]);
    const firstExploredAtRef = useRef<Record<string, number>>({});

    const {
        rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
        camera, isDarkMode, isMobile, imagesRef, characterName,
        playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
        preloadedCoordsRef, spatialIndexRef, exploredRef, renderVersion,
        unveilMap, viewZ
    } = props;

    const { drawMap } = useMapperRenderer({
        rooms, markers, currentRoomId, selectedRoomIds, selectedMarkerId,
        cameraRef: camera, isDarkMode, isMobile, imagesRef, characterName,
        playerPosRef, playerTrailRef, stableRoomsRef, stableRoomIdRef, stableMarkersRef,
        preloadedCoordsRef, spatialIndexRef, exploredRef, renderVersion,
        unveilMap, viewZ, firstExploredAtRef
    });

    useMapAnimation({
        drawMap,
        rooms: props.rooms,
        markers: props.markers,
        currentRoomId: props.currentRoomId,
        isDragging: props.isDragging,
        renderVersion: props.renderVersion,
        canvasRef,
        camera: props.camera,
        playerPosRef: props.playerPosRef,
        playerTrailRef: props.playerTrailRef,
        getDPR,
        marquee: props.marquee,
        autoCenter: props.autoCenter,
        stableRoomsRef: props.stableRoomsRef,
        stableRoomIdRef: props.stableRoomIdRef,
        stableMarkersRef: props.stableMarkersRef,
        firstExploredAtRef
    });

    useEffect(() => {
        const cvs = canvasRef.current;
        const parent = cvs?.parentElement;
        if (!cvs || !parent) return;

        const handleResize = () => {
            const dpr = getDPR();
            cvs.width = parent.clientWidth * dpr;
            cvs.height = parent.clientHeight * dpr;
            props.triggerRender?.();
        };

        const ro = new ResizeObserver(handleResize);
        ro.observe(parent);
        handleResize();
        return () => ro.disconnect();
    }, [getDPR, canvasRef]);

    return (
        <canvas
            ref={canvasRef}
            className="map-canvas"
            style={{
                width: '100%',
                height: '100%',
                display: 'block',
                touchAction: 'none',
                cursor: props.isDragging ? 'grabbing' : 'crosshair'
            }}
            onMouseDown={props.onMouseDown}
            onMouseMove={props.onMouseMove}
            onMouseUp={props.onMouseUp}
            onPointerDown={props.onPointerDown}
            onPointerMove={props.onPointerMove}
            onPointerUp={props.onPointerUp}
        />
    );
}));

MapCanvas.displayName = 'MapCanvas';
