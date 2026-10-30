/** @file useRoomInfoDrag.ts — Move the desktop room card by its header. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent, RefObject } from 'react';

// --- Desktop drag lifecycle ---
export const useRoomInfoDrag = (cardRef: RefObject<HTMLDivElement | null>, isMobile: boolean) => {
    const [offset, setOffset] = useState({x:0,y:0});
    const cleanupRef = useRef<(() => void) | null>(null);
    useEffect(() => () => cleanupRef.current?.(), []);
    const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
        if (isMobile || event.button !== 0 || (event.target as Element).closest('button, input, textarea, select, a')) return;
        const card = cardRef.current;
        if (!card) return;
        cleanupRef.current?.();
        const rect = card.getBoundingClientRect();
        const startX = event.clientX, startY = event.clientY, pointerId = event.pointerId;
        const move = (next: globalThis.PointerEvent) => {
            if (next.pointerId !== pointerId) return;
            // Keep enough of the header visible to drag the panel back.
            const dx = Math.max(48 - rect.right, Math.min(window.innerWidth - 48 - rect.left, next.clientX - startX));
            const dy = Math.max(-rect.top, Math.min(window.innerHeight - 40 - rect.top, next.clientY - startY));
            setOffset({x:offset.x + dx,y:offset.y + dy});
        };
        const finish = (next: globalThis.PointerEvent) => { if (next.pointerId === pointerId) cleanup(); };
        const cleanup = () => {
            window.removeEventListener('pointermove', move, true);
            window.removeEventListener('pointerup', finish, true);
            window.removeEventListener('pointercancel', finish, true);
            cleanupRef.current = null;
        };
        cleanupRef.current = cleanup;
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', finish, true);
        window.addEventListener('pointercancel', finish, true);
        event.preventDefault();
        event.stopPropagation();
    }, [cardRef, isMobile, offset]);
    return {offset, onPointerDown};
};
