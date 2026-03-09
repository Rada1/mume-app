import { useEffect, useRef, useCallback } from 'react';
import { useButtons } from './useButtons';

export const useButtonEditor = (
    btn: ReturnType<typeof useButtons>, 
    containerRef?: React.RefObject<HTMLDivElement>
) => {
    const wasDraggingRef = useRef(false);
    const dragStateRef = useRef<any>(null);
    const rafRef = useRef<number | null>(null);

    const handleMouseMove = useCallback((e: PointerEvent) => {
        const ds = dragStateRef.current;
        if (!ds) return;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
            const dx = e.clientX - ds.startX;
            const dy = e.clientY - ds.startY;
            const timeElapsed = Date.now() - ds.startTime;

            if (!wasDraggingRef.current) {
                if (Math.abs(dx) > 15 || Math.abs(dy) > 15 || timeElapsed > 150) {
                    wasDraggingRef.current = true;
                }
            }

            if (!wasDraggingRef.current) return;

            if (ds.type === 'cluster') {
                const newX = ds.initialX + dx;
                const newY = ds.initialY + dy;
                ds.elements.forEach((item: any) => {
                    item.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) ${ds.initialScale !== 1 ? `scale(${ds.initialScale})` : ''}`;
                });
                ds.finalX = newX;
                ds.finalY = newY;

            } else if (ds.type === 'move') {
                if (!ds.finalPositions) ds.finalPositions = {};
                const parentW = ds.parentRect.width;
                const parentH = ds.parentRect.height;
                if (parentW <= 0 || parentH <= 0) return;

                ds.elements.forEach((item: any) => {
                    const targetPixelX = e.clientX - item.pointerOffsetX - ds.parentRect.left;
                    const targetPixelY = e.clientY - item.pointerOffsetY - ds.parentRect.top;

                    let xPercent = (targetPixelX / parentW) * 100;
                    let yPercent = (targetPixelY / parentH) * 100;

                    if (btn.isGridEnabled) {
                        xPercent = Math.round(xPercent / btn.gridSize) * btn.gridSize;
                        yPercent = Math.round(yPercent / btn.gridSize) * btn.gridSize;
                    }

                    const x = Math.min(100, Math.max(0, xPercent));
                    const y = Math.min(100, Math.max(0, yPercent));

                    item.el.style.left = `${x}%`;
                    item.el.style.top = `${y}%`;

                    ds.finalPositions[item.id] = { x, y };
                });
            } else if (ds.type === 'resize') {
                if (!ds.finalSizes) ds.finalSizes = {};
                ds.elements.forEach((item: any) => {
                    const newW = Math.max(20, item.initW + dx);
                    const newH = Math.max(20, item.initH + dy);
                    item.el.style.width = `${newW}px`;
                    item.el.style.height = `${newH}px`;
                    ds.finalSizes[item.id] = { w: newW, h: newH };
                });
            }
        });
    }, [btn.isGridEnabled, btn.gridSize]);

    const handleDragStart = (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => {
        if (!btn.isEditMode || btn.editingButtonId) return;
        
        const container = containerRef?.current;
        if (!container) return;

        dragStateRef.current = null;

        e.stopPropagation();
        const targetEl = e.currentTarget as HTMLElement;
        
        try {
            targetEl.setPointerCapture(e.pointerId);
        } catch (err) { /* ignore */ }

        const containerRect = container.getBoundingClientRect();
        wasDraggingRef.current = false;
        
        const elements: any[] = [];
        let parentRect = containerRect;

        if (type === 'cluster' || type === 'cluster-resize') {
            const el = document.getElementById(`cluster-${id}`);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const pos = btn.uiPositions[id] || {};
            const initialX = pos.x !== undefined ? pos.x : (rect.left - containerRect.left);
            const initialY = pos.y !== undefined ? pos.y : (rect.top - containerRect.top);
            
            el.classList.add('dragging');
            elements.push({ el });
            
            dragStateRef.current = {
                id, type, startX: e.clientX, startY: e.clientY, startTime: Date.now(),
                initialX, initialY, initialScale: pos.scale ?? 1,
                initialW: pos.w ?? rect.width, initialH: pos.h ?? rect.height,
                elements, parentRect: containerRect,
                pointerId: e.pointerId,
                targetEl
            };
        } else {
            let effectiveSelected = new Set(btn.selectedButtonIds);
            if (!effectiveSelected.has(id)) {
                effectiveSelected = (e.ctrlKey || e.metaKey) ? new Set([...Array.from(effectiveSelected), id]) : new Set([id]);
                btn.setSelectedIds(effectiveSelected);
            }

            effectiveSelected.forEach(selId => {
                const el = document.querySelector(`.custom-btn[data-id="${selId}"]`) as HTMLElement;
                const b = btn.buttons.find(x => x.id === selId);
                if (el && b) {
                    const rect = el.getBoundingClientRect();
                    if (!elements.length) parentRect = el.parentElement?.getBoundingClientRect() || containerRect;
                    
                    el.classList.add('dragging');
                    elements.push({
                        el, id: selId,
                        pointerOffsetX: e.clientX - rect.left,
                        pointerOffsetY: e.clientY - rect.top,
                        initW: rect.width,
                        initH: rect.height
                    });
                }
            });

            dragStateRef.current = {
                id, type, startX: e.clientX, startY: e.clientY, startTime: Date.now(),
                elements, parentRect, finalPositions: null, finalSizes: null,
                pointerId: e.pointerId,
                targetEl
            };
        }

        btn.setDragState(dragStateRef.current);
        document.body.classList.add('global-dragging');
    };

    useEffect(() => {
        const handleMouseUp = (e: PointerEvent) => {
            const ds = dragStateRef.current;
            if (!ds) return;

            if (ds.targetEl && ds.pointerId !== undefined) {
                try {
                    ds.targetEl.releasePointerCapture(ds.pointerId);
                } catch (err) { /* ignore */ }
            }

            document.body.classList.remove('global-dragging');
            
            ds.elements.forEach((item: any) => {
                item.el.classList.remove('dragging');
                item.el.style.transform = ''; 
            });

            const isIntentional = wasDraggingRef.current;
            const finalPos = ds.finalPositions;
            const finalSizes = ds.finalSizes;
            const finalX = ds.finalX;
            const finalY = ds.finalY;
            const dsId = ds.id;
            const dsType = ds.type;

            dragStateRef.current = null;
            btn.setDragState(null);

            if (isIntentional) {
                if (dsType === 'cluster' && finalX !== undefined) {
                    btn.setUiPositions((prev: any) => ({
                        ...prev,
                        [dsId]: { ...prev[clusterId], x: finalX, y: finalY }
                    }));
                } else if (dsType === 'move' || dsType === 'resize') {
                    if (finalPos || finalSizes) {
                        btn.setButtons((prev: any[]) => prev.map(b => {
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
        };

        if (btn.dragState) {
            window.addEventListener('pointermove', handleMouseMove, { passive: true });
            window.addEventListener('pointerup', handleMouseUp, { capture: true });
            window.addEventListener('pointercancel', handleMouseUp, { capture: true });
        }
        return () => {
            window.removeEventListener('pointermove', handleMouseMove);
            window.removeEventListener('pointerup', handleMouseUp, { capture: true });
            window.removeEventListener('pointercancel', handleMouseUp, { capture: true });
        };
    }, [btn.dragState, btn.editingButtonId, handleMouseMove, btn.setButtons, btn.setUiPositions]);

    return {
        handleDragStart,
        wasDraggingRef
    };
};
