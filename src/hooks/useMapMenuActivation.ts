/** @file useMapMenuActivation.ts — Require a fresh press before activating mobile map actions. */
import {useRef} from 'react';
import type {MouseEvent, PointerEvent} from 'react';

// --- Pointer Ownership Section ---
export const useMapMenuActivation = (enabled: boolean) => {
    const pressedAction = useRef<HTMLButtonElement | null>(null);
    const onPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
        const action = event.target instanceof Element ? event.target.closest('button') : null;
        pressedAction.current = action instanceof HTMLButtonElement && event.currentTarget.contains(action) ? action : null;
    };
    const onPointerCancelCapture = () => { pressedAction.current = null; };
    const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
        const action = pressedAction.current;
        pressedAction.current = null;
        // Keyboard and assistive activation do not have a preceding pointer press.
        if (!enabled || event.detail === 0) return;
        if (!action || !(event.target instanceof Node) || !action.contains(event.target)) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    return {onPointerDownCapture, onPointerCancelCapture, onClickCapture};
};
