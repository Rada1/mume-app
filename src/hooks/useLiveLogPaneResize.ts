/**
 * @file useLiveLogPaneResize.ts
 * @description Handles pointer and keyboard resizing for the recent-output pane.
 */

// --- Logic Section ---
import { useCallback, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

const DEFAULT_PANE_HEIGHT = 12.5;
const MIN_PANE_HEIGHT = 10;
const MAX_PANE_HEIGHT = 65;
const KEYBOARD_STEP = 2.5;

const clampPaneHeight = (height: number) =>
    Math.min(MAX_PANE_HEIGHT, Math.max(MIN_PANE_HEIGHT, height));

export function useLiveLogPaneResize() {
    const layoutRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<{
        pointerId: number;
        startY: number;
        startPaneHeight: number;
        layoutHeight: number;
    } | null>(null);
    const [paneHeightPercent, setPaneHeightPercent] = useState(DEFAULT_PANE_HEIGHT);
    const [isResizing, setIsResizing] = useState(false);

    const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const layout = layoutRef.current;
        const pane = event.currentTarget.nextElementSibling;
        if (!layout || !(pane instanceof HTMLElement)) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startPaneHeight: pane.getBoundingClientRect().height,
            layoutHeight: layout.getBoundingClientRect().height,
        };
        setIsResizing(true);
    }, []);

    const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || drag.layoutHeight <= 0) return;

        const nextHeight = drag.startPaneHeight + drag.startY - event.clientY;
        setPaneHeightPercent(clampPaneHeight((nextHeight / drag.layoutHeight) * 100));
    }, []);

    const finishPointerResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setIsResizing(false);
    }, []);

    const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setPaneHeightPercent(height => clampPaneHeight(height + KEYBOARD_STEP));
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setPaneHeightPercent(height => clampPaneHeight(height - KEYBOARD_STEP));
        } else if (event.key === 'Home') {
            event.preventDefault();
            setPaneHeightPercent(DEFAULT_PANE_HEIGHT);
        } else if (event.key === 'End') {
            event.preventDefault();
            setPaneHeightPercent(MAX_PANE_HEIGHT);
        }
    }, []);

    return {
        layoutRef,
        paneHeightPercent,
        isResizing,
        onPointerDown,
        onPointerMove,
        onPointerUp: finishPointerResize,
        onPointerCancel: finishPointerResize,
        onKeyDown,
    };
}
