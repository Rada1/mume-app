import { useEffect, useRef, useCallback } from 'react';
import { useButtons } from './useButtons';

export const useButtonEditor = (btn: ReturnType<typeof useButtons>, containerRef?: React.RefObject<HTMLDivElement>) => {
    const wasDraggingRef = useRef(false);
    const dragStateRef = useRef<any>(null);
    const rafRef = useRef<number | null>(null);

    const handleMouseMove = useCallback((e: PointerEvent) => {
        const ds = dragStateRef.current;
        if (!ds) return;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            const containerRect = containerRef?.current?.getBoundingClientRect();
            const containerW = containerRect ? containerRect.width : window.innerWidth;
            const containerH = containerRect ? containerRect.height : window.innerHeight;

            const dx = e.clientX - ds.startX;
            const dy = e.clientY - ds.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasDraggingRef.current = true;

            if (ds.type === 'cluster') {
                const clusterId = ds.id as string;
                // Xbox is anchored to right, so a positive dx (mouse right) means less distance from right
                let newX = clusterId === 'xbox' ? ds.initialX - dx : ds.initialX + dx;
                let newY = ds.initialY + dy;

                if (btn.isGridEnabled) {
                    const snapX = (btn.gridSize / 100) * containerW;
                    const snapY = (btn.gridSize / 100) * containerH;
                    newX = Math.round(newX / snapX) * snapX;
                    newY = Math.round(newY / snapY) * snapY;
                }

                ds.elements.forEach((item: any) => {
                    // We only apply the delta via transform to avoid fighting the base CSS right/left/top
                    item.el.style.transform = `translate(${clusterId === 'xbox' ? -dx : dx}px, ${dy}px) ${ds.initialW !== 1 ? `scale(${ds.initialW})` : ''}`;
                });

                ds.finalX = newX;
                ds.finalY = newY;
            }
 else if (ds.type === 'cluster-resize') {
                const clusterId = ds.id as string;
                if (clusterId === 'mapper') {
                    let newW = ds.initialW + dx;
                    let newH = ds.initialH + dy;
                    if (btn.isGridEnabled) {
                        const snapX = (btn.gridSize / 100) * containerW;
                        const snapY = (btn.gridSize / 100) * containerH;
                        newW = Math.round(newW / snapX) * snapX;
                        newH = Math.round(newH / snapY) * snapY;
                    }
                    const w = Math.max(200, newW);
                    const h = Math.max(200, newH);
                    ds.elements.forEach((item: any) => {
                        item.el.style.width = `${w}px`;
                        item.el.style.height = `${h}px`;
                    });
                    ds.finalW = w;
                    ds.finalH = h;
                } else {
                    const newScale = Math.max(0.5, Math.min(2.5, ds.initialW + dx / 200));
                    ds.elements.forEach((item: any) => {
                        item.el.style.setProperty('--scale', newScale.toString());
                        item.el.style.transform = `scale(${newScale})`;
                    });
                    ds.finalScale = newScale;
                }
            } else if (ds.type === 'resize') {
                if (!ds.finalSizes) ds.finalSizes = {};
                ds.elements.forEach((item: any) => {
                    const bId = item.el.getAttribute('data-id');
                    let newW = item.initW + dx;
                    let newH = item.initH + dy;
                    if (btn.isGridEnabled) {
                        const pixSnapX = (btn.gridSize / 100) * containerW;
                        const pixSnapY = (btn.gridSize / 100) * containerH;
                        newW = Math.round(newW / pixSnapX) * pixSnapX;
                        newH = Math.round(newH / pixSnapY) * pixSnapY;
                    }
                    const w = Math.max(20, newW);
                    const h = Math.max(20, newH);
                    item.el.style.width = `${w}px`;
                    item.el.style.height = `${h}px`;
                    if (bId) ds.finalSizes[bId] = { w, h };
                });
            } else if (ds.type === 'move') {
                if (!ds.finalPositions) ds.finalPositions = {};
                ds.elements.forEach((item: any) => {
                    const bId = item.el.getAttribute('data-id');
                    const dXPercent = (dx / containerW) * 100;
                    const dYPercent = (dy / containerH) * 100;
                    let finalX = item.initX + dXPercent;
                    let finalY = item.initY + dYPercent;

                    if (btn.isGridEnabled) {
                        finalX = Math.round(finalX / btn.gridSize) * btn.gridSize;
                        finalY = Math.round(finalY / btn.gridSize) * btn.gridSize;
                    }

                    const x = Math.min(100, Math.max(0, finalX));
                    const y = Math.min(100, Math.max(0, finalY));

                    item.el.style.left = `${x}%`;
                    item.el.style.top = `${y}%`;

                    if (bId) ds.finalPositions[bId] = { x, y };
                });
            }
        });
    }, [btn.isGridEnabled, btn.gridSize, containerRef]);

    const handleDragStart = (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => {
        if (!btn.isEditMode) return;
        e.stopPropagation(); e.preventDefault();

        let startX = 0, startY = 0, initialW = 0, initialH = 0;

        if (type === 'cluster' || type === 'cluster-resize') {
            const clusterId = id as any;
            const el = document.getElementById(`cluster-${clusterId}`);
            const rect = el ? el.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
            const pos = btn.uiPositions[clusterId];
            startX = pos?.x ?? (clusterId === 'xbox' ? (window.innerWidth - rect.right) : rect.left);
            startY = pos?.y ?? rect.top;
            initialW = pos?.scale ?? 1;

            if (clusterId === 'mapper' && type === 'cluster-resize') {
                const mapperPos = pos as any;
                initialW = mapperPos?.w ?? 320;
                initialH = mapperPos?.h ?? 320;
            }
        } else {
            const button = btn.buttons.find(b => b.id === id);
            if (!button || button.display === 'inline') return;
            startX = button.style.x;
            startY = button.style.y;
            initialW = button.style.w;
            initialH = button.style.h;
        }

        wasDraggingRef.current = false;
        document.body.classList.add('global-dragging');

        // Selection logic for buttons
        let effectiveSelected = new Set(btn.selectedButtonIds);
        if (type === 'move' || type === 'resize') {
            if (!effectiveSelected.has(id)) {
                if (!e.ctrlKey && !e.metaKey) effectiveSelected = new Set([id]);
                else effectiveSelected.add(id);
                btn.setSelectedIds(effectiveSelected);
            }
        }

        const initialPositions: Record<string, { x: number, y: number }> = {};
        const initialSizes: Record<string, { w: number, h: number }> = {};

        if (type === 'move' || type === 'resize') {
            effectiveSelected.forEach(selId => {
                const b = btn.buttons.find(x => x.id === selId);
                if (b) {
                    initialPositions[selId] = { x: b.style.x, y: b.style.y };
                    initialSizes[selId] = { w: b.style.w, h: b.style.h };
                }
            });
        }

        const dragInfo: any = {
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: startX,
            initialY: startY,
            type,
            initialW,
            initialH,
            initialPositions,
            initialSizes,
            elements: []
        };

        // Cache elements and add dragging class
        if (type === 'cluster' || type === 'cluster-resize') {
            const el = document.getElementById(`cluster-${id}`);
            if (el) {
                el.classList.add('dragging');
                dragInfo.elements.push({ el, initX: startX, initY: startY, initW: initialW, initH: initialH });
            }
        } else {
            effectiveSelected.forEach(selId => {
                const el = document.querySelector(`[data-id="${selId}"]`) as HTMLElement;
                const b = btn.buttons.find(x => x.id === selId);
                if (el && b) {
                    el.classList.add('dragging');
                    dragInfo.elements.push({ el, initX: b.style.x, initY: b.style.y, initW: b.style.w, initH: b.style.h });
                }
            });
        }

        dragStateRef.current = dragInfo;
        btn.setDragState(dragInfo);
    };

    useEffect(() => {
        const handleMouseUp = () => {
            const ds = dragStateRef.current;
            if (ds) {
                document.body.classList.remove('global-dragging');
                ds.elements.forEach((item: any) => {
                    item.el.classList.remove('dragging');
                });
                if (rafRef.current) cancelAnimationFrame(rafRef.current);

                // Commit final positions to React State
                if (ds.type === 'cluster') {
                    if (ds.finalX !== undefined) {
                        const clusterId = ds.id as 'joystick' | 'xbox' | 'stats' | 'mapper';
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                x: ds.finalX,
                                y: ds.finalY
                            }
                        }));
                    }
                } else if (ds.type === 'cluster-resize') {
                    const clusterId = ds.id as 'joystick' | 'xbox' | 'stats' | 'mapper';
                    if (clusterId === 'mapper' && ds.finalW !== undefined) {
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                w: ds.finalW,
                                h: ds.finalH
                            }
                        }));
                    } else if (ds.finalScale !== undefined) {
                        btn.setUiPositions(prev => ({
                            ...prev,
                            [clusterId]: {
                                ...prev[clusterId],
                                scale: ds.finalScale
                            }
                        }));
                    }
                } else {
                    const finalPos = ds.finalPositions;
                    const finalSizes = ds.finalSizes;
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
            dragStateRef.current = null;
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
