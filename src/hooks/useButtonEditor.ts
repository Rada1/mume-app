import { useEffect, useRef, useCallback } from 'react';
import { useButtons } from './useButtons';

export const useButtonEditor = (btn: ReturnType<typeof useButtons>, containerRef?: React.RefObject<HTMLDivElement>) => {
    const wasDraggingRef = useRef(false);

    const handleDragStart = (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => {
        if (!btn.isEditMode) return;
        e.stopPropagation(); e.preventDefault();

        if (type === 'cluster' || type === 'cluster-resize') {
            const clusterId = id as 'joystick' | 'xbox' | 'stats' | 'mapper';
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const pos = btn.uiPositions[clusterId];
            const startX = pos?.x ?? (clusterId === 'xbox' ? (window.innerWidth - rect.right) : rect.left);
            const startY = pos?.y ?? rect.top;
            let initialW = pos?.scale ?? 1;
            let initialH = 0;

            if (clusterId === 'mapper' && type === 'cluster-resize') {
                const mapperPos = pos as any;
                initialW = mapperPos?.w ?? 320;
                initialH = mapperPos?.h ?? 320;
            }

            btn.setDragState({
                id: clusterId,
                startX: e.clientX,
                startY: e.clientY,
                initialX: startX,
                initialY: startY,
                type: type as any,
                initialW: initialW,
                initialH: initialH
            });
            return;
        }

        const button = btn.buttons.find(b => b.id === id); if (!button || button.display === 'inline') return;
        wasDraggingRef.current = false;

        // Selection logic
        let effectiveSelected = new Set(btn.selectedButtonIds);
        if (!effectiveSelected.has(id)) {
            if (!e.ctrlKey && !e.metaKey) effectiveSelected = new Set([id]);
            else effectiveSelected.add(id);
            btn.setSelectedIds(effectiveSelected);
        }

        const initialPositions: Record<string, { x: number, y: number }> = {};
        const initialSizes: Record<string, { w: number, h: number }> = {};
        effectiveSelected.forEach(selId => {
            const b = btn.buttons.find(x => x.id === selId);
            if (b) {
                initialPositions[selId] = { x: b.style.x, y: b.style.y };
                initialSizes[selId] = { w: b.style.w, h: b.style.h };
            }
        });

        btn.setDragState({
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: button.style.x,
            initialY: button.style.y,
            type,
            initialW: button.style.w,
            initialH: button.style.h,
            initialPositions: type === 'move' ? initialPositions : (type === 'resize' ? initialPositions : undefined),
            initialSizes: type === 'resize' ? initialSizes : undefined
        });
    };

    const handleMouseMove = useCallback((e: PointerEvent) => {
        const containerRect = containerRef?.current?.getBoundingClientRect();
        const containerW = containerRect ? containerRect.width : window.innerWidth;
        const containerH = containerRect ? containerRect.height : window.innerHeight;
        const containerOffsetX = containerRect ? containerRect.left : 0;
        const containerOffsetY = containerRect ? containerRect.top : 0;

        if (btn.dragState?.type === 'cluster') {
            const dx = e.clientX - btn.dragState.startX;
            const dy = e.clientY - btn.dragState.startY;
            const clusterId = btn.dragState.id as 'joystick' | 'xbox' | 'stats' | 'mapper';

            let newX = clusterId === 'xbox' ? btn.dragState!.initialX - dx : btn.dragState!.initialX + dx;
            let newY = btn.dragState!.initialY + dy;

            if (btn.isGridEnabled) {
                const snapX = (btn.gridSize / 100) * containerW;
                const snapY = (btn.gridSize / 100) * containerH;
                newX = Math.round(newX / snapX) * snapX;
                newY = Math.round(newY / snapY) * snapY;
            }

            btn.setUiPositions(prev => ({
                ...prev,
                [clusterId]: {
                    ...prev[clusterId],
                    x: newX,
                    y: newY
                }
            }));
            return;
        }

        if (btn.dragState?.type === 'cluster-resize') {
            const dx = e.clientX - btn.dragState.startX;
            const dy = e.clientY - btn.dragState.startY;
            const clusterId = btn.dragState.id as 'joystick' | 'xbox' | 'stats' | 'mapper';

            if (clusterId === 'mapper') {
                let newW = btn.dragState.initialW + dx;
                let newH = btn.dragState.initialH + dy;

                if (btn.isGridEnabled) {
                    const snapX = (btn.gridSize / 100) * containerW;
                    const snapY = (btn.gridSize / 100) * containerH;
                    newW = Math.round(newW / snapX) * snapX;
                    newH = Math.round(newH / snapY) * snapY;
                }

                btn.setUiPositions(prev => ({
                    ...prev,
                    [clusterId]: {
                        ...prev[clusterId],
                        w: Math.max(200, newW),
                        h: Math.max(200, newH)
                    }
                }));
            } else {
                const newScale = Math.max(0.5, Math.min(2.5, btn.dragState.initialW + dx / 200));
                btn.setUiPositions(prev => ({
                    ...prev,
                    [clusterId]: {
                        ...prev[clusterId],
                        scale: newScale
                    }
                }));
            }
            return;
        }

        if (btn.dragState) {
            const dx = e.clientX - btn.dragState.startX, dy = e.clientY - btn.dragState.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDraggingRef.current = true;
            btn.setButtons(prev => prev.map(b => {
                if (btn.dragState?.type === 'resize') {
                    if (btn.dragState.initialSizes && btn.dragState.initialSizes[b.id]) {
                        const init = btn.dragState.initialSizes[b.id];
                        let newW = init.w + dx;
                        let newH = init.h + dy;

                        if (btn.isGridEnabled) {
                            const pixSnapX = (btn.gridSize / 100) * containerW;
                            const pixSnapY = (btn.gridSize / 100) * containerH;
                            newW = Math.round(newW / pixSnapX) * pixSnapX;
                            newH = Math.round(newH / pixSnapY) * pixSnapY;
                        }

                        return { ...b, style: { ...b.style, w: Math.max(20, newW), h: Math.max(20, newH) } };
                    }
                    if (b.id !== btn.dragState?.id) return b;
                    let newW = btn.dragState.initialW + dx;
                    let newH = btn.dragState.initialH + dy;

                    if (btn.isGridEnabled) {
                        const pixSnapX = (btn.gridSize / 100) * containerW;
                        const pixSnapY = (btn.gridSize / 100) * containerH;
                        newW = Math.round(newW / pixSnapX) * pixSnapX;
                        newH = Math.round(newH / pixSnapY) * pixSnapY;
                    }

                    return { ...b, style: { ...b.style, w: Math.max(20, newW), h: Math.max(20, newH) } };
                }

                if (btn.dragState?.initialPositions && btn.dragState.initialPositions[b.id]) {
                    const init = btn.dragState.initialPositions[b.id];
                    let dXPercent = (dx / containerW) * 100;
                    let dYPercent = (dy / containerH) * 100;

                    let finalX = init.x + dXPercent;
                    let finalY = init.y + dYPercent;

                    if (btn.isGridEnabled) {
                        finalX = Math.round(finalX / btn.gridSize) * btn.gridSize;
                        finalY = Math.round(finalY / btn.gridSize) * btn.gridSize;
                    }

                    return { ...b, style: { ...b.style, x: Math.min(100, Math.max(0, finalX)), y: Math.min(100, Math.max(0, finalY)) } };
                }

                if (b.id !== btn.dragState?.id) return b;

                let finalX = btn.dragState.initialX + (dx / containerW) * 100;
                let finalY = btn.dragState.initialY + (dy / containerH) * 100;

                if (btn.isGridEnabled) {
                    finalX = Math.round(finalX / btn.gridSize) * btn.gridSize;
                    finalY = Math.round(finalY / btn.gridSize) * btn.gridSize;
                }

                return { ...b, style: { ...b.style, x: Math.min(100, Math.max(0, finalX)), y: Math.min(100, Math.max(0, finalY)) } };
            }));
        }
    }, [btn, containerRef]);

    useEffect(() => {
        const handleMouseUp = () => {
            btn.setDragState(null);
        };
        if (btn.dragState) {
            window.addEventListener('pointermove', handleMouseMove);
            window.addEventListener('pointerup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp);
        };
    }, [btn.dragState, handleMouseMove]);

    return {
        handleDragStart,
        wasDraggingRef
    };
};
