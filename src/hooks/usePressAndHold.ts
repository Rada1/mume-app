/** @file usePressAndHold.ts — Touch press-and-hold gesture with click suppression. */
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// --- Gesture State Section ---
interface ActiveHold<T> {
    value: T;
    pointerId: number;
    startX: number;
    startY: number;
    timer: number;
    activated: boolean;
    cleanupTracking: () => void;
}

// --- Touch Hold Section ---
export const usePressAndHold = <T,>(
    onHold: (value: T) => void,
    onRelease: (value: T) => void,
    enabled: boolean,
    delayMs = 120
) => {
    const activeHoldRef = useRef<ActiveHold<T> | null>(null);
    const suppressedClickRef = useRef<T | null>(null);

    const finishPointer = useCallback((pointerId: number, canceled: boolean) => {
        const activeHold = activeHoldRef.current;
        if (!activeHold || activeHold.pointerId !== pointerId) return;
        window.clearTimeout(activeHold.timer);
        activeHold.cleanupTracking();
        activeHoldRef.current = null;
        if (!activeHold.activated) return;
        if (!canceled) suppressedClickRef.current = activeHold.value;
        onRelease(activeHold.value);
    }, [onRelease]);

    const cancelMovedHold = useCallback((pointerId: number, clientX: number, clientY: number) => {
        const activeHold = activeHoldRef.current;
        if (!activeHold || activeHold.activated || activeHold.pointerId !== pointerId) return;
        const distance = Math.hypot(clientX - activeHold.startX, clientY - activeHold.startY);
        if (distance <= 12) return;
        window.clearTimeout(activeHold.timer);
        activeHold.cleanupTracking();
        activeHoldRef.current = null;
    }, []);

    const onPointerDown = useCallback((value: T, event: ReactPointerEvent<HTMLElement>) => {
        if (!enabled || !['touch', 'pen'].includes(event.pointerType) || event.button !== 0 || activeHoldRef.current) return;
        const activeHold: ActiveHold<T> = {
            value,
            pointerId:event.pointerId,
            startX:event.clientX,
            startY:event.clientY,
            timer:0,
            activated:false,
            cleanupTracking:() => undefined
        };
        const handleMove = (pointerEvent: PointerEvent) => cancelMovedHold(pointerEvent.pointerId, pointerEvent.clientX, pointerEvent.clientY);
        const handleFinish = (pointerEvent: PointerEvent) => finishPointer(pointerEvent.pointerId, pointerEvent.type === 'pointercancel');
        activeHold.cleanupTracking = () => {
            window.removeEventListener('pointermove', handleMove, true);
            window.removeEventListener('pointerup', handleFinish, true);
            window.removeEventListener('pointercancel', handleFinish, true);
        };
        activeHoldRef.current = activeHold;
        window.addEventListener('pointermove', handleMove, true);
        window.addEventListener('pointerup', handleFinish, true);
        window.addEventListener('pointercancel', handleFinish, true);
        activeHold.timer = window.setTimeout(() => {
            if (activeHoldRef.current !== activeHold) return;
            activeHold.activated = true;
            onHold(value);
        }, delayMs);
    }, [cancelMovedHold, delayMs, enabled, finishPointer, onHold]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        cancelMovedHold(event.pointerId, event.clientX, event.clientY);
    }, [cancelMovedHold]);

    const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => finishPointer(event.pointerId, false), [finishPointer]);
    const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => finishPointer(event.pointerId, true), [finishPointer]);
    const cancel = useCallback(() => {
        const activeHold = activeHoldRef.current;
        if (activeHold) finishPointer(activeHold.pointerId, true);
    }, [finishPointer]);
    const shouldSuppressClick = useCallback((value: T) => {
        if (!Object.is(suppressedClickRef.current, value)) return false;
        suppressedClickRef.current = null;
        return true;
    }, []);

    useEffect(() => () => {
        if (activeHoldRef.current) {
            window.clearTimeout(activeHoldRef.current.timer);
            activeHoldRef.current.cleanupTracking();
        }
        activeHoldRef.current = null;
    }, []);

    return {onPointerDown, onPointerMove, onPointerUp, onPointerCancel, shouldSuppressClick, cancel};
};
