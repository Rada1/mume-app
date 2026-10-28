/** @file useQuickStateMenuGesture.ts — Long-press state controls and release on a choice. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// --- Quick State Gesture ---
interface ActiveGesture {
    label: string;
    pointerId: number;
    startX: number;
    startY: number;
    trigger: HTMLElement;
    timer: number;
    opened: boolean;
    canceled: boolean;
}

export const useQuickStateMenuGesture = (
    enabled: boolean,
    openMenu: (label: string, trigger: HTMLElement) => void,
    closeMenu: () => void,
    haptic?: (duration: number) => void
) => {
    const active = useRef<ActiveGesture | null>(null);
    const suppressClickUntil = useRef(0);
    const hoveredRef = useRef<string | null>(null);
    const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);

    const clear = useCallback(() => {
        const gesture = active.current;
        if (gesture) window.clearTimeout(gesture.timer);
        active.current = null;
    }, []);

    const setHovered = useCallback((id: string | null) => {
        if (hoveredRef.current === id) return;
        hoveredRef.current = id;
        setHoveredOptionId(id);
        if (id) haptic?.(12);
    }, [haptic]);

    const optionAt = (x: number, y: number) => document.elementFromPoint(x, y)
        ?.closest<HTMLElement>('[data-quick-state-option]')?.dataset.quickStateOption || null;

    const onPointerDown = useCallback((label: string, event: ReactPointerEvent<HTMLElement>) => {
        if (!enabled || !['touch', 'pen'].includes(event.pointerType) || event.button !== 0 || active.current) return;
        suppressClickUntil.current = 0;
        const gesture: ActiveGesture = {
            label, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
            trigger: event.currentTarget, timer: 0, opened: false, canceled: false
        };
        active.current = gesture;
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.timer = window.setTimeout(() => {
            if (active.current !== gesture) return;
            gesture.opened = true;
            setHovered(null);
            openMenu(label, gesture.trigger);
            haptic?.(15);
        }, 200);
    }, [enabled, haptic, openMenu, setHovered]);

    const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const gesture = active.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        if (!gesture.opened) {
            if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 12) {
                window.clearTimeout(gesture.timer);
                gesture.canceled = true;
            }
            return;
        }
        setHovered(optionAt(event.clientX, event.clientY));
    }, [setHovered]);

    const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const gesture = active.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        window.clearTimeout(gesture.timer);
        active.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (gesture.canceled) suppressClickUntil.current = Date.now() + 500;
        if (!gesture.opened) return;

        suppressClickUntil.current = Date.now() + 500;
        const optionId = optionAt(event.clientX, event.clientY);
        const option = optionId && Array.from(document.querySelectorAll<HTMLElement>('[data-quick-state-option]'))
            .find(candidate => candidate.dataset.quickStateOption === optionId);
        const action = option?.querySelector<HTMLButtonElement>('button:not(:disabled)');
        action?.click();
        setHovered(null);
        closeMenu();
    }, [closeMenu, setHovered]);

    const onPointerCancel = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const gesture = active.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        clear();
        setHovered(null);
        if (gesture.opened) closeMenu();
    }, [clear, closeMenu, setHovered]);

    const shouldSuppressClick = useCallback(() => Date.now() < suppressClickUntil.current, []);

    useEffect(() => () => clear(), [clear]);

    return { hoveredOptionId, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture: onPointerCancel, shouldSuppressClick };
};
