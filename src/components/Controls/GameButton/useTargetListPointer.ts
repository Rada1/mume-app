/**
 * @file useTargetListPointer.ts
 * @description Supports scrolling and selection in target lists while another pointer holds a command.
 */

// --- Logic Section ---
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface TargetListDrag {
    pointerId: number;
    y: number;
    scrollDistance: number;
    isScrolling: boolean;
    x: number;
    list: HTMLDivElement;
}

export interface TargetListTouch {
    x: number;
    y: number;
    moved: boolean;
}

// --- UI Section ---
export const useTargetListPointer = (isOpen: boolean, onHoverTarget?: (value: string | null) => void) => {
    const touchesRef = useRef(new Map<number, TargetListTouch>());
    const lastPointerUpSelectionRef = useRef(new Map<string, number>());
    const dragRef = useRef(new Map<number, TargetListDrag>());
    const settleTimerRef = useRef(new Map<number, number>());

    const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        const list = target?.closest('.tactical-target-bar-list');
        if (list instanceof HTMLDivElement && (event.pointerType !== 'mouse' || event.button === 0)) {
            dragRef.current.set(event.pointerId, {
                pointerId: event.pointerId,
                y: event.clientY,
                x: event.clientX,
                scrollDistance: 0,
                isScrolling: false,
                list
            });
        }
    }, []);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        const touch = touchesRef.current.get(event.pointerId);
        if (touch && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) touch.moved = true;
        const drag = dragRef.current.get(event.pointerId);
        if (!drag) return;

        const deltaY = event.clientY - drag.y;
        const scrollDistance = drag.scrollDistance + Math.abs(deltaY);
        const isScrolling = drag.isScrolling || scrollDistance > 8;
        dragRef.current.set(event.pointerId, { ...drag, y: event.clientY, x: event.clientX, scrollDistance, isScrolling });
        if (!isScrolling) return;

        event.preventDefault();
        drag.list.scrollTop -= deltaY;
        drag.list.dataset.scrolling = 'true';
        if (touch) touch.moved = true;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            dragRef.current.clear();
            touchesRef.current.clear();
            lastPointerUpSelectionRef.current.clear();
            settleTimerRef.current.forEach(timer => window.clearTimeout(timer));
            settleTimerRef.current.clear();
            return;
        }

        const clearSettleTimer = (pointerId?: number) => {
            if (pointerId !== undefined) {
                const timer = settleTimerRef.current.get(pointerId);
                if (timer !== undefined) window.clearTimeout(timer);
                settleTimerRef.current.delete(pointerId);
                return;
            }
            settleTimerRef.current.forEach(timer => window.clearTimeout(timer));
            settleTimerRef.current.clear();
        };

        const updateListScrollState = (list: HTMLDivElement) => {
            const hasActiveScroll = [...dragRef.current.values()].some(drag => drag.list === list && drag.isScrolling);
            list.dataset.scrolling = hasActiveScroll ? 'true' : 'false';
        };

        // Route the captured initiating finger over a list to its own scroll tracker.
        const handleHeldPointerMove = (event: PointerEvent) => {
            const eventTarget = event.target instanceof Element ? event.target : null;
            if (!eventTarget?.closest('.custom-btn')) return;
            if (event.pointerType !== 'touch' && event.buttons === 0) return;

            const hit = document.elementFromPoint?.(event.clientX, event.clientY) as HTMLElement | null | undefined;
            const list = hit?.closest('.tactical-target-bar-list') as HTMLDivElement | null;
            const previous = dragRef.current.get(event.pointerId);
            if (!list) {
                dragRef.current.delete(event.pointerId);
                if (previous) updateListScrollState(previous.list);
                clearSettleTimer(event.pointerId);
                return;
            }

            if (!previous) {
                dragRef.current.set(event.pointerId, { pointerId: event.pointerId, y: event.clientY, x: event.clientX, scrollDistance: 0, isScrolling: false, list });
                const item = hit?.closest('.tactical-target-bar-item') as HTMLElement | null;
                onHoverTarget?.(item?.dataset.targetValue ?? null);
                return;
            }

            const deltaY = event.clientY - previous.y;
            const scrollDistance = previous.scrollDistance + Math.abs(deltaY);
            const isScrolling = previous.isScrolling || scrollDistance > 24;
            dragRef.current.set(event.pointerId, { pointerId: event.pointerId, y: event.clientY, x: event.clientX, scrollDistance, isScrolling, list });
            if (!isScrolling) {
                const item = hit?.closest('.tactical-target-bar-item') as HTMLElement | null;
                onHoverTarget?.(item?.dataset.targetValue ?? null);
                return;
            }

            list.dataset.scrolling = 'true';
            list.scrollTop -= deltaY;
            onHoverTarget?.(null);
            clearSettleTimer(event.pointerId);
            settleTimerRef.current.set(event.pointerId, window.setTimeout(() => {
                const current = dragRef.current.get(event.pointerId);
                if (!current?.isScrolling) {
                    settleTimerRef.current.delete(event.pointerId);
                    return;
                }
                dragRef.current.set(event.pointerId, { ...current, scrollDistance: 0, isScrolling: false });
                updateListScrollState(current.list);
                const settledHit = document.elementFromPoint?.(current.x, current.y) as HTMLElement | null | undefined;
                const settledItem = settledHit?.closest('.tactical-target-bar-item') as HTMLElement | null;
                onHoverTarget?.(settledItem?.dataset.targetValue ?? null);
                settleTimerRef.current.delete(event.pointerId);
            }, 180));
        };

        const resetPointer = (event: PointerEvent) => {
            const drag = dragRef.current.get(event.pointerId);
            if (!drag) return;
            clearSettleTimer(event.pointerId);
            dragRef.current.delete(event.pointerId);
            updateListScrollState(drag.list);
        };

        window.addEventListener('pointermove', handleHeldPointerMove, true);
        window.addEventListener('pointerup', resetPointer, true);
        window.addEventListener('pointercancel', resetPointer, true);
        return () => {
            window.removeEventListener('pointermove', handleHeldPointerMove, true);
            window.removeEventListener('pointerup', resetPointer, true);
            window.removeEventListener('pointercancel', resetPointer, true);
            clearSettleTimer();
            dragRef.current.clear();
        };
    }, [isOpen, onHoverTarget]);

    return { touchesRef, lastPointerUpSelectionRef, onPointerDownCapture, onPointerMove };
};
