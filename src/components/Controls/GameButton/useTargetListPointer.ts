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
    pendingScrollDelta: number;
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
    const onHoverTargetRef = useRef(onHoverTarget);
    onHoverTargetRef.current = onHoverTarget;

    const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        const list = target?.closest('.tactical-target-bar-list, .shop-target-menu .shop-panel-content, .right-panel-content, .tactical-target-bar-custom-content');
        if (list instanceof HTMLDivElement && (event.pointerType !== 'mouse' || event.button === 0)) {
            dragRef.current.set(event.pointerId, {
                pointerId: event.pointerId,
                y: event.clientY,
                x: event.clientX,
                pendingScrollDelta: 0,
                isScrolling: false,
                list
            });
        }
    }, []);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        event.stopPropagation();
        const touch = touchesRef.current.get(event.pointerId);
        if (touch && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) touch.moved = true;
        if (event.pointerType === 'touch' && !event.isPrimary
            && (event.currentTarget.classList.contains('is-remove-target-menu')
                || (event.currentTarget.classList.contains('has-custom-content')
                    && event.currentTarget.classList.contains('is-swipe-targeting')))) return;
        const drag = dragRef.current.get(event.pointerId);
        if (!drag) return;

        const deltaY = event.clientY - drag.y;
        const pendingScrollDelta = drag.pendingScrollDelta - deltaY;
        const isScrolling = drag.isScrolling || Math.abs(pendingScrollDelta) > 8;
        dragRef.current.set(event.pointerId, {
            ...drag,
            y: event.clientY,
            x: event.clientX,
            pendingScrollDelta: isScrolling ? 0 : pendingScrollDelta,
            isScrolling
        });
        if (!isScrolling) return;

        event.preventDefault();
        drag.list.scrollTop += drag.isScrolling ? -deltaY : pendingScrollDelta;
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
            const previous = dragRef.current.get(event.pointerId);
            const isSecondaryRemoveTouch = event.pointerType === 'touch'
                && !event.isPrimary
                && Boolean(previous?.list.closest('.tactical-target-bar.is-remove-target-menu'));
            const isSecondaryCustomPanelTouch = event.pointerType === 'touch'
                && !event.isPrimary
                && Boolean(previous?.list.closest('.tactical-target-bar.has-custom-content.is-swipe-targeting'));
            if (!eventTarget?.closest('.custom-btn') && !isSecondaryRemoveTouch && !isSecondaryCustomPanelTouch) return;
            if (event.pointerType !== 'touch' && event.buttons === 0) return;

            const hit = document.elementFromPoint?.(event.clientX, event.clientY) as HTMLElement | null | undefined;
            const listCandidate = hit?.closest('.tactical-target-bar-list, .shop-target-menu .shop-panel-content, .right-panel-content, .tactical-target-bar-custom-content') as HTMLDivElement | null;
            const list = isSecondaryRemoveTouch
                ? listCandidate?.closest('.tactical-target-bar.is-remove-target-menu') ? listCandidate : null
                : isSecondaryCustomPanelTouch
                    ? listCandidate?.closest('.tactical-target-bar.has-custom-content.is-swipe-targeting') ? listCandidate : null
                : listCandidate;
            if (!list) {
                dragRef.current.delete(event.pointerId);
                if (previous) updateListScrollState(previous.list);
                clearSettleTimer(event.pointerId);
                return;
            }

            (event as PointerEvent & { __targetListScrollHandled?: boolean }).__targetListScrollHandled = true;
            if (!previous) {
                dragRef.current.set(event.pointerId, {
                    pointerId: event.pointerId,
                    y: event.clientY,
                    x: event.clientX,
                    pendingScrollDelta: 0,
                    isScrolling: false,
                    list
                });
                const item = hit?.closest('.tactical-target-bar-item, .shop-target-menu [data-shop-target-value]') as HTMLElement | null;
                onHoverTargetRef.current?.(item?.dataset.targetValue ?? item?.dataset.shopTargetValue ?? null);
                return;
            }

            const deltaY = event.clientY - previous.y;
            const touch = touchesRef.current.get(event.pointerId);
            if (touch && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 8) touch.moved = true;
            const pendingScrollDelta = previous.pendingScrollDelta - deltaY;
            const isScrolling = previous.isScrolling || Math.abs(pendingScrollDelta) > 8;
            dragRef.current.set(event.pointerId, {
                pointerId: event.pointerId,
                y: event.clientY,
                x: event.clientX,
                pendingScrollDelta: isScrolling ? 0 : pendingScrollDelta,
                isScrolling,
                list
            });
            if (!isScrolling) {
                const item = hit?.closest('.tactical-target-bar-item, .shop-target-menu [data-shop-target-value]') as HTMLElement | null;
                onHoverTargetRef.current?.(item?.dataset.targetValue ?? item?.dataset.shopTargetValue ?? null);
                return;
            }

            list.dataset.scrolling = 'true';
            list.scrollTop += previous.isScrolling ? -deltaY : pendingScrollDelta;
            if (event.cancelable) event.preventDefault();
            onHoverTargetRef.current?.(null);
            clearSettleTimer(event.pointerId);
            settleTimerRef.current.set(event.pointerId, window.setTimeout(() => {
                const current = dragRef.current.get(event.pointerId);
                if (!current?.isScrolling) {
                    settleTimerRef.current.delete(event.pointerId);
                    return;
                }
                dragRef.current.set(event.pointerId, { ...current, pendingScrollDelta: 0, isScrolling: false });
                updateListScrollState(current.list);
                const settledHit = document.elementFromPoint?.(current.x, current.y) as HTMLElement | null | undefined;
                const settledItem = settledHit?.closest('.tactical-target-bar-item, .shop-target-menu [data-shop-target-value]') as HTMLElement | null;
                onHoverTargetRef.current?.(settledItem?.dataset.targetValue ?? settledItem?.dataset.shopTargetValue ?? null);
                settleTimerRef.current.delete(event.pointerId);
            }, 180));
        };

        const resetPointer = (event: PointerEvent) => {
            const drag = dragRef.current.get(event.pointerId);
            if (!drag) return;
            clearSettleTimer(event.pointerId);
            dragRef.current.delete(event.pointerId);
            // The command's pointer-up handler still needs to see that this
            // gesture scrolled, so clear the flag after release is dispatched.
            queueMicrotask(() => updateListScrollState(drag.list));
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
    }, [isOpen]);

    return { touchesRef, lastPointerUpSelectionRef, onPointerDownCapture, onPointerMove };
};
