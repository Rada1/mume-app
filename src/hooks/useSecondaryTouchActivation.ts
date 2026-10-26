/** @file useSecondaryTouchActivation.ts — Second-finger taps and scrolling while a hold is active. */
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// --- Pending Touch Section ---
interface PendingTouch {
    pointerId: number;
    startX: number;
    startY: number;
    container: HTMLElement;
    scroller: HTMLElement | null;
    initialScrollTop: number;
    initialScrollLeft: number;
    canScrollX: boolean;
    canScrollY: boolean;
    moved: boolean;
    timer: number | null;
    cleanup: () => void;
}

// --- Activation Section ---
export const useSecondaryTouchActivation = () => {
    const pendingRef = useRef<PendingTouch | null>(null);

    const clearPending = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        if (pending.timer !== null) window.clearTimeout(pending.timer);
        pending.cleanup();
        pendingRef.current = null;
    }, []);

    const onPointerDownCapture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'touch' || event.isPrimary || event.button !== 0) return;
        clearPending();
        let scroller: HTMLElement | null = event.target instanceof HTMLElement ? event.target
            : event.target instanceof Element ? event.target.parentElement : event.currentTarget;
        let canScrollX = false;
        let canScrollY = false;
        while (scroller && event.currentTarget.contains(scroller)) {
            const style = window.getComputedStyle(scroller);
            canScrollX = scroller.scrollWidth > scroller.clientWidth && /auto|scroll/.test(style.overflowX);
            canScrollY = scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(style.overflowY);
            if (canScrollX || canScrollY) break;
            scroller = scroller.parentElement;
        }
        if (scroller && !event.currentTarget.contains(scroller)) scroller = null;
        const pending: PendingTouch = {
            pointerId:event.pointerId,
            startX:event.clientX,
            startY:event.clientY,
            container:event.currentTarget,
            scroller,
            initialScrollTop:scroller?.scrollTop ?? 0,
            initialScrollLeft:scroller?.scrollLeft ?? 0,
            canScrollX,
            canScrollY,
            moved:false,
            timer:null,
            cleanup:() => undefined
        };
        const handleMove = (pointerEvent: PointerEvent) => {
            if (pointerEvent.pointerId !== pending.pointerId) return;
            if (Math.hypot(pointerEvent.clientX - pending.startX, pointerEvent.clientY - pending.startY) > 12) pending.moved = true;
            // Browsers do not reliably pan a second contact while the first holds a command.
            if (pending.moved && pending.scroller) {
                if (pending.canScrollY) pending.scroller.scrollTop = pending.initialScrollTop + pending.startY - pointerEvent.clientY;
                if (pending.canScrollX) pending.scroller.scrollLeft = pending.initialScrollLeft + pending.startX - pointerEvent.clientX;
            }
        };
        const handleUp = (pointerEvent: PointerEvent) => {
            if (pointerEvent.pointerId !== pending.pointerId || pendingRef.current !== pending) return;
            if (pending.moved) { clearPending(); return; }
            const {clientX, clientY} = pointerEvent;
            pending.timer = window.setTimeout(() => {
                if (pendingRef.current !== pending) return;
                const target = document.elementFromPoint(clientX, clientY);
                const action = target?.closest<HTMLElement>('button, [data-menu-item="true"]');
                const belongsToRow = action && (pending.container === action || pending.container.contains(action));
                clearPending();
                if (belongsToRow && !action.hasAttribute('disabled')) action.click();
            }, 40);
        };
        const handleCancel = (pointerEvent: PointerEvent) => {
            if (pointerEvent.pointerId === pending.pointerId) clearPending();
        };
        pending.cleanup = () => {
            window.removeEventListener('pointermove', handleMove, true);
            window.removeEventListener('pointerup', handleUp, true);
            window.removeEventListener('pointercancel', handleCancel, true);
        };
        pendingRef.current = pending;
        window.addEventListener('pointermove', handleMove, true);
        window.addEventListener('pointerup', handleUp, true);
        window.addEventListener('pointercancel', handleCancel, true);
    }, [clearPending]);

    const onClickCapture = useCallback(() => clearPending(), [clearPending]);

    useEffect(() => () => clearPending(), [clearPending]);

    return {onPointerDownCapture, onClickCapture};
};
