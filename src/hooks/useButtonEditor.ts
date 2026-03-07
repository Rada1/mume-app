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

            // Fast DOM mutation for visual feedback
            const el = document.getElementById(`cluster-${clusterId}`);
            if (el) {
                el.style.transform = `translate(${clusterId === 'xbox' ? -newX : newX}px, ${newY}px)`;
            }
            // Store the final computed value without triggering a render
            (btn.dragState as any).finalX = newX;
            (btn.dragState as any).finalY = newY;
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

                const w = Math.max(200, newW);
                const h = Math.max(200, newH);
                const el = document.getElementById(`cluster-mapper`);
                if (el) {
                    el.style.width = `${w}px`;
                    el.style.height = `${h}px`;
                }
                (btn.dragState as any).finalW = w;
                (btn.dragState as any).finalH = h;
            } else {
                const newScale = Math.max(0.5, Math.min(2.5, btn.dragState.initialW + dx / 200));
                const el = document.getElementById(`cluster-${clusterId}`);
                if (el) {
                    // Assuming position is also applied via transform in the component,
                    // we would need to read it. For now, we update scale via CSS variable if possible
                    el.style.setProperty('--scale', newScale.toString());
                }
                (btn.dragState as any).finalScale = newScale;
            }
            return;
        }

        if (btn.dragState) {
            const dx = e.clientX - btn.dragState.startX, dy = e.clientY - btn.dragState.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDraggingRef.current = true;

            // Fast DOM mutation for buttons
            if (btn.dragState.type === 'resize') {
                const itemsToUpdate = btn.dragState.initialSizes ? Object.keys(btn.dragState.initialSizes) : [btn.dragState.id];
                itemsToUpdate.forEach(bId => {
                    const init = (btn.dragState?.initialSizes && btn.dragState.initialSizes[bId])
                        ? btn.dragState.initialSizes[bId]
                        : { w: btn.dragState!.initialW, h: btn.dragState!.initialH };

                    let newW = init.w + dx;
                    let newH = init.h + dy;

                    if (btn.isGridEnabled) {
                        const pixSnapX = (btn.gridSize / 100) * containerW;
                        const pixSnapY = (btn.gridSize / 100) * containerH;
                        newW = Math.round(newW / pixSnapX) * pixSnapX;
                        newH = Math.round(newH / pixSnapY) * pixSnapY;
                    }

                    const w = Math.max(20, newW);
                    const h = Math.max(20, newH);

                    const el = document.querySelector(`[data-id="${bId}"]`) as HTMLElement;
                    if (el) {
                        el.style.width = `${w}px`;
                        el.style.height = `${h}px`;
                    }
                    if (!(btn.dragState as any).finalSizes) (btn.dragState as any).finalSizes = {};
                    (btn.dragState as any).finalSizes[bId] = { w, h };
                });
            } else {
                const itemsToUpdate = btn.dragState.initialPositions ? Object.keys(btn.dragState.initialPositions) : [btn.dragState.id];
                itemsToUpdate.forEach(bId => {
                    const init = (btn.dragState?.initialPositions && btn.dragState.initialPositions[bId])
                        ? btn.dragState.initialPositions[bId]
                        : { x: btn.dragState!.initialX, y: btn.dragState!.initialY };

                    let dXPercent = (dx / containerW) * 100;
                    let dYPercent = (dy / containerH) * 100;

                    let finalX = init.x + dXPercent;
                    let finalY = init.y + dYPercent;

                    if (btn.isGridEnabled) {
                        finalX = Math.round(finalX / btn.gridSize) * btn.gridSize;
                        finalY = Math.round(finalY / btn.gridSize) * btn.gridSize;
                    }

                    const x = Math.min(100, Math.max(0, finalX));
                    const y = Math.min(100, Math.max(0, finalY));

                    const el = document.querySelector(`[data-id="${bId}"]`) as HTMLElement;
                    if (el) {
                        el.style.left = `${x}%`;
                        el.style.top = `${y}%`;
                    }
                    if (!(btn.dragState as any).finalPositions) (btn.dragState as any).finalPositions = {};
                    (btn.dragState as any).finalPositions[bId] = { x, y };
                });
            }
        }
    }, [btn.dragState, btn.isGridEnabled, btn.gridSize, containerRef]);

    useEffect(() => {
        const handleMouseUp = () => {
            if (btn.dragState) {
                // Commit final positions to React State
                if (btn.dragState.type === 'cluster') {
                    if ((btn.dragState as any).finalX !== undefined) {
                        const clusterId = btn.dragState.id as 'joystick' | 'xbox' | 'stats' | 'mapper';
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                x: (btn.dragState as any).finalX,
                                y: (btn.dragState as any).finalY
                            }
                        }));
                    }
                } else if (btn.dragState.type === 'cluster-resize') {
                    const clusterId = btn.dragState.id as 'joystick' | 'xbox' | 'stats' | 'mapper';
                    if (clusterId === 'mapper' && (btn.dragState as any).finalW !== undefined) {
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                w: (btn.dragState as any).finalW,
                                h: (btn.dragState as any).finalH
                            }
                        }));
                    } else if ((btn.dragState as any).finalScale !== undefined) {
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                scale: (btn.dragState as any).finalScale
                            }
                        }));
                    }
                } else {
                    const finalPos = (btn.dragState as any).finalPositions;
                    const finalSizes = (btn.dragState as any).finalSizes;
                    if (finalPos || finalSizes) {
                        btn.setButtons(prev => prev.map(b => {
                            if (finalSizes && finalSizes[b.id]) {
                                return { ...b, style: { ...b.style, w: finalSizes[b.id].w, h: finalSizes[b.id].h } };
                            }
                            if (finalPos && finalPos[b.id]) {
                                return { ...b, style: { ...b.style, x: finalPos[b.id].x, y: finalPos[b.id].y } };
                            }
                            return b;
                        }));
                    }
                }
            }
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
