/** @file useQuickStateMenuPosition.ts — Anchor compact state dropdowns directly below their button. */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

// --- Menu Placement Section ---
const MENU_STYLE: CSSProperties = { position: 'fixed', width: 'min(190px, calc(100vw - 16px))', right: 'auto', bottom: 'auto', margin: 0 };

export function useQuickStateMenuPosition(active: string | null) {
    const anchorRef = useRef<HTMLElement | null>(null);
    const menuRef = useRef<HTMLElement | null>(null);
    const [position, setPosition] = useState<CSSProperties>({ ...MENU_STYLE, left: 8, top: 8 });

    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        const menu = menuRef.current;
        if (!active || !anchor || !menu) return;
        menu.showPopover?.();
        const update = () => {
            const rect = anchor.getBoundingClientRect();
            const width = Math.min(menu.getBoundingClientRect().width, window.innerWidth - 16);
            const roomLeft = rect.right - 8;
            const roomRight = window.innerWidth - rect.left - 8;
            const preferredLeft = roomRight >= roomLeft ? rect.left : rect.right - width;
            const left = Math.max(8, Math.min(window.innerWidth - width - 8, preferredLeft));
            const viewportBottom = (window.visualViewport?.offsetTop ?? 0) + (window.visualViewport?.height ?? window.innerHeight);
            const below = viewportBottom - rect.bottom - 12;
            const openBelow = below >= 44;
            const maxHeight = Math.max(0, Math.min(480, openBelow ? below : rect.top - 12));
            const top = openBelow ? rect.bottom : Math.max(8, rect.top - Math.min(menu.scrollHeight, maxHeight));
            setPosition(previous => previous.left === left && previous.top === top && previous.maxHeight === maxHeight
                ? previous : { ...MENU_STYLE, left, top, maxHeight });
        };
        let frame = 0;
        const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
        const scroll = (event: Event) => {
            if (event.target instanceof Element && event.target.contains(anchor)) schedule();
        };
        const observer = new ResizeObserver(schedule);
        observer.observe(anchor);
        observer.observe(menu);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', scroll, true);
        update();
        return () => {
            menu.hidePopover?.();
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', scroll, true);
        };
    }, [active]);

    return { anchorRef, menuRef, position };
}
