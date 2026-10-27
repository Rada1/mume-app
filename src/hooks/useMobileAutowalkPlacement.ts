/** @file useMobileAutowalkPlacement.ts — Tracks the moving player room without React frame updates. */
import { useLayoutEffect, useRef } from 'react';
import type { MobileAutowalkPopoverProps } from '../types/mapAutowalk';
import { GRID_SIZE } from '../components/Mapper/mapperUtils';
import { resolveCanonicalMapPosition } from '../components/Mapper/whereScanLocations';

// --- Room anchored placement ---
export const useMobileAutowalkPlacement = (props: MobileAutowalkPopoverProps) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const { canvasRef, cameraRef, playerPosRef, room, currentRoomId, performanceMap } = props;
    useLayoutEffect(() => {
        const popover = popoverRef.current;
        if (!popover) return;
        popover.showPopover?.();
        let frame = 0;
        let lastPosition = '';
        const place = () => {
            const canvas = canvasRef.current;
            const rect = canvas?.getBoundingClientRect();
            const worker = canvas?.dataset.mapRenderer?.endsWith('-worker');
            const canonical = worker && performanceMap
                ? resolveCanonicalMapPosition(performanceMap, currentRoomId, room?.gmcpId)
                : null;
            const player = canonical ?? playerPosRef.current ?? room;
            if (rect && rect.width > 0 && rect.height > 0 && player) {
                const camera = cameraRef.current;
                const x = rect.left + (player.x * GRID_SIZE + GRID_SIZE / 2 - camera.x) * camera.zoom;
                const y = rect.top + (player.y * GRID_SIZE + GRID_SIZE / 2 - (worker ? GRID_SIZE : 0) - camera.y) * camera.zoom;
                const viewport = window.visualViewport;
                const left = (viewport?.offsetLeft ?? 0) + 8;
                const top = (viewport?.offsetTop ?? 0) + 8;
                const right = left + (viewport?.width ?? window.innerWidth) - 16;
                const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
                const width = popover.offsetWidth;
                const height = popover.offsetHeight;
                const gap = Math.max(12, GRID_SIZE * camera.zoom / 2 + 6);
                const nextX = Math.round(Math.max(left, Math.min(x - width / 2, right - width)));
                const above = y - gap - height;
                const nextY = Math.round(Math.max(top, Math.min(above >= top ? above : y + gap, bottom - height)));
                const nextPosition = `${nextX},${nextY}`;
                if (nextPosition !== lastPosition) {
                    popover.style.left = `${nextX}px`;
                    popover.style.top = `${nextY}px`;
                    lastPosition = nextPosition;
                }
                if (popover.style.visibility !== 'visible') popover.style.visibility = 'visible';
            } else {
                if (popover.style.visibility !== 'hidden') popover.style.visibility = 'hidden';
            }
            frame = requestAnimationFrame(place);
        };
        place();
        return () => {
            cancelAnimationFrame(frame);
            if (typeof popover.hidePopover === 'function' && popover.matches(':popover-open')) popover.hidePopover();
        };
    }, [canvasRef, cameraRef, playerPosRef, room, currentRoomId, performanceMap]);
    return popoverRef;
};
