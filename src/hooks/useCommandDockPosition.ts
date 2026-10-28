/** @file useCommandDockPosition.ts — Measures only active dock menus when their anchor moves. */
import { useCallback, useEffect, useRef, useState } from 'react';

// --- Logic Section ---
export const useCommandDockPosition = (isMobile: boolean, open: boolean, anchorKey?: unknown) => {
    const anchorRef = useRef<HTMLElement | null>(null);
    const [position, setPosition] = useState<{right:number;bottom:number;maxWidth:number;left?:number;rightMaxWidth?:number} | null>(null);

    const resolveAnchor = useCallback(() => {
        const current = anchorRef.current;
        if (current && (!current.parentElement?.classList.contains('command-tree-root-actions') || current.getAttribute('aria-expanded') === 'true')) {
            return current;
        }
        const active = typeof document !== 'undefined'
            ? document.querySelector<HTMLElement>('.command-tree-root-actions > .command-tree-row[aria-expanded="true"]')
            : null;
        if (active) anchorRef.current = active;
        return active || current;
    }, []);

    const update = useCallback(() => {
        const anchor = resolveAnchor();
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const isDesktopCategoryAnchor = anchor.parentElement?.classList.contains('command-tree-desktop-category-actions') === true;
        let horizontalOffset = !isMobile && isDesktopCategoryAnchor ? 28 : 0;
        if (horizontalOffset > 0 && rect.left + horizontalOffset + 220 > window.innerWidth - 8) {
            horizontalOffset = rect.left - horizontalOffset >= 8 ? -horizontalOffset : 0;
        }
        const next = {
            right: isMobile ? 8 : Math.max(8, window.innerWidth - rect.right - horizontalOffset),
            bottom: Math.max(8, window.innerHeight - rect.top + 4),
            maxWidth: isMobile ? window.innerWidth - 16 : Math.max(0, rect.right + horizontalOffset - 8),
            left: isMobile ? undefined : rect.left + horizontalOffset,
            rightMaxWidth: isMobile ? undefined : Math.max(0, window.innerWidth - rect.left - horizontalOffset - 8)
        };
        setPosition(previous => previous?.right === next.right && previous.bottom === next.bottom
            && previous.maxWidth === next.maxWidth && previous.left === next.left
            && previous.rightMaxWidth === next.rightMaxWidth ? previous : next);
    }, [isMobile, resolveAnchor]);

    useEffect(() => {
        const anchor = resolveAnchor();
        if (!open || !anchor) return;
        update();
        let frame = 0;
        const schedule = () => { if (!frame) frame = requestAnimationFrame(() => {frame = 0; update();}); };
        const scroll = (event: Event) => {
            // Log and submenu scrolling do not move a fixed command-bar anchor.
            if (event.target instanceof Element && event.target.contains(anchor)) schedule();
        };
        const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        observer?.observe(anchor);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', scroll, true);
        window.visualViewport?.addEventListener('resize', schedule);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', scroll, true);
            window.visualViewport?.removeEventListener('resize', schedule);
        };
    }, [open, update, anchorKey, resolveAnchor]);

    return {position, anchorRef, update};
};
