/**
 * @file useMobileGearSwipe.ts
 * @description Opens Gear from a left swipe on the log and closes it from Gear.
 */

import { useCallback, useRef } from 'react';
import type {
    PointerEvent as ReactPointerEvent,
    TouchEvent as ReactTouchEvent,
    MouseEvent as ReactMouseEvent
} from 'react';
import { useGearPanelStore } from '../stores/useGearPanelStore';

type SwipeStart = { x: number; y: number; pointerId?: number; touchId?: number };
type SwipeSurface = 'log' | 'gear';

const IGNORE_GESTURE_TARGETS = 'button, input, textarea, select, a, [role="button"]';

export const useMobileGearSwipe = (enabled: boolean, triggerHaptic?: (duration: number) => void) => {
    const logPointerStart = useRef<SwipeStart | null>(null);
    const gearPointerStart = useRef<SwipeStart | null>(null);
    const logTouchStart = useRef<SwipeStart | null>(null);
    const gearTouchStart = useRef<SwipeStart | null>(null);
    const suppressClick = useRef(false);
    const isOpen = useGearPanelStore(state => state.isOpen);
    const setIsOpen = useGearPanelStore(state => state.setIsOpen);

    const finishSwipe = useCallback((surface: SwipeSurface, start: SwipeStart | null, x: number, y: number) => {
        if (!start) return false;
        const dx = x - start.x;
        const dy = y - start.y;
        if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.25) return false;

        if (surface === 'log' && dx < 0 && !isOpen) setIsOpen(true);
        else if (surface === 'gear' && dx > 0 && isOpen) setIsOpen(false);
        else return false;

        triggerHaptic?.(18);
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 500);
        return true;
    }, [isOpen, setIsOpen, triggerHaptic]);

    const onPointerDown = useCallback((surface: SwipeSurface, event: ReactPointerEvent<HTMLElement>) => {
        const startRef = surface === 'log' ? logPointerStart : gearPointerStart;
        startRef.current = null;
        // Touch input uses touch events below. Keep this path for pen input.
        if (!enabled || !event.isPrimary || event.pointerType !== 'pen' || event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest(IGNORE_GESTURE_TARGETS)) return;
        startRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    }, [enabled]);

    const onPointerUp = useCallback((surface: SwipeSurface, event: ReactPointerEvent<HTMLElement>) => {
        const startRef = surface === 'log' ? logPointerStart : gearPointerStart;
        const start = startRef.current;
        startRef.current = null;
        if (!start || start.pointerId !== event.pointerId) return;

        if (!finishSwipe(surface, start, event.clientX, event.clientY)) return;
        event.preventDefault();
        event.stopPropagation();
    }, [finishSwipe]);

    const onTouchStart = useCallback((surface: SwipeSurface, event: ReactTouchEvent<HTMLElement>) => {
        const startRef = surface === 'log' ? logTouchStart : gearTouchStart;
        startRef.current = null;
        if (!enabled || event.touches.length !== 1) return;
        if (event.target instanceof Element) {
            const gearItem = surface === 'gear' && event.target.closest('.gear-item-select');
            if (!gearItem && event.target.closest(IGNORE_GESTURE_TARGETS)) return;
        }
        const touch = event.touches[0];
        startRef.current = { x: touch.clientX, y: touch.clientY, touchId: touch.identifier };
    }, [enabled]);

    const onTouchEnd = useCallback((surface: SwipeSurface, event: ReactTouchEvent<HTMLElement>) => {
        const startRef = surface === 'log' ? logTouchStart : gearTouchStart;
        const start = startRef.current;
        startRef.current = null;
        if (!start || start.touchId === undefined) return;
        const touch = Array.from(event.changedTouches).find(item => item.identifier === start.touchId);
        if (!touch) return;
        if (finishSwipe(surface, start, touch.clientX, touch.clientY)) event.stopPropagation();
    }, [finishSwipe]);

    const onPointerCancel = useCallback(() => {
        logPointerStart.current = null;
        gearPointerStart.current = null;
    }, []);

    const onTouchCancel = useCallback(() => {
        logTouchStart.current = null;
        gearTouchStart.current = null;
    }, []);

    const onClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
    }, []);

    return {
        onLogTouchStartCapture: (event: ReactTouchEvent<HTMLElement>) => onTouchStart('log', event),
        onLogTouchEndCapture: (event: ReactTouchEvent<HTMLElement>) => onTouchEnd('log', event),
        onGearTouchStartCapture: (event: ReactTouchEvent<HTMLElement>) => onTouchStart('gear', event),
        onGearTouchEndCapture: (event: ReactTouchEvent<HTMLElement>) => onTouchEnd('gear', event),
        onTouchCancel,
        onLogPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown('log', event),
        onLogPointerUp: (event: ReactPointerEvent<HTMLElement>) => onPointerUp('log', event),
        onGearPointerDown: (event: ReactPointerEvent<HTMLElement>) => onPointerDown('gear', event),
        onGearPointerUp: (event: ReactPointerEvent<HTMLElement>) => onPointerUp('gear', event),
        onPointerCancel,
        onClickCapture
    };
};
