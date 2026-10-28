/** @file useDesktopMapMovementMenu.ts — Hover lifetime and placement beside desktop direction buttons. */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { menuVerticalPlacement } from '../utils/menuVerticalPlacement';

// --- Hover navigation and cleanup ---
export const useDesktopMapMovementMenu = (clearPreview: () => void) => {
    const [menu, setMenu] = useState<{direction: string; style: CSSProperties} | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearPreviewRef = useRef(clearPreview); clearPreviewRef.current = clearPreview;
    const cancelClose = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };
    const close = () => { cancelClose(); setMenu(null); clearPreviewRef.current(); };
    const scheduleClose = () => { cancelClose(); timer.current = setTimeout(close, 200); };
    const show = (direction: string, element: HTMLElement) => {
        cancelClose();
        const rect = element.getBoundingClientRect();
        const left = rect.right + 8;
        const width = Math.min(240, Math.max(0, window.innerWidth - left - 8));
        setMenu({direction, style: {width, left,
            ...menuVerticalPlacement(rect.top, rect.bottom, window.innerHeight, true)}});
    };
    useEffect(() => () => { cancelClose(); clearPreviewRef.current(); }, []);
    useEffect(() => {
        if (!menu) return;
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
        const outside = (event: PointerEvent) => {
            if (event.target instanceof Element && !event.target.closest('.desktop-map-movement-pad,.desktop-map-movement-menu')) close();
        };
        window.addEventListener('keydown', escape);
        window.addEventListener('pointerdown', outside);
        window.addEventListener('resize', close);
        return () => { window.removeEventListener('keydown', escape); window.removeEventListener('pointerdown', outside); window.removeEventListener('resize', close); };
    }, [Boolean(menu)]);
    return {menu, show, close, scheduleClose, cancelClose};
};
