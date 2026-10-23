/** @file useCommandDockPosition.ts — Measures only active dock menus when their anchor moves. */
import { useCallback, useEffect, useRef, useState } from 'react';

// --- Logic Section ---
export const useCommandDockPosition = (isMobile: boolean, open: boolean) => {
    const anchorRef = useRef<HTMLElement | null>(null);
    const [position, setPosition] = useState<{right:number;bottom:number;maxWidth:number} | null>(null);
    const update = useCallback(() => {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const next = {
            right: isMobile ? 8 : Math.max(8, window.innerWidth - rect.right),
            bottom: Math.max(8, window.innerHeight - rect.top + 4),
            maxWidth: isMobile ? window.innerWidth - 16 : Math.max(0, rect.right - 8)
        };
        setPosition(previous => previous?.right === next.right && previous.bottom === next.bottom
            && previous.maxWidth === next.maxWidth ? previous : next);
    }, [isMobile]);
    useEffect(() => {
        const anchor = anchorRef.current;
        if (!open || !anchor) return;
        let frame = 0;
        const schedule = () => { if (!frame) frame = requestAnimationFrame(() => {frame = 0; update();}); };
        const scroll = (event: Event) => {
            // Log and submenu scrolling do not move a fixed command-bar anchor.
            if (event.target instanceof Element && event.target.contains(anchor)) schedule();
        };
        const observer = new ResizeObserver(schedule);
        observer.observe(anchor);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', scroll, true);
        window.visualViewport?.addEventListener('resize', schedule);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', scroll, true);
            window.visualViewport?.removeEventListener('resize', schedule);
        };
    }, [open, update]);
    return {position, anchorRef, update};
};
