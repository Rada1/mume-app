/** @file useDesktopShopActionPopover.ts — Positions shop actions beside the selected row. */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// --- Popover placement and dismissal ---
export function useDesktopShopActionPopover(open: boolean, closeForTransaction: boolean) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const close = useCallback(() => { setAnchor(null); setPosition(null); }, []);
    useEffect(() => { if (!open || closeForTransaction) close(); }, [open, closeForTransaction, close]);
    useLayoutEffect(() => {
        if (!anchor || !open) return;
        const update = () => {
            const popup = popoverRef.current;
            const container = anchor.closest('.desktop-shop-content');
            if (!popup || !anchor.isConnected || !container) { close(); return; }
            const row = anchor.getBoundingClientRect(), bounds = container.getBoundingClientRect();
            if (row.bottom <= bounds.top || row.top >= bounds.bottom) { close(); return; }
            const width = popup.offsetWidth, height = popup.offsetHeight;
            const left = row.left >= width + 8 ? row.left - width - 8 : Math.min(window.innerWidth - width - 8, row.right + 8);
            const top = Math.max(8, Math.min(row.top, window.innerHeight - height - 8));
            setPosition(previous => previous?.left === left && previous.top === top ? previous : { left, top });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        if (popoverRef.current) observer?.observe(popoverRef.current);
        return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); observer?.disconnect(); };
    }, [anchor, open, close]);
    useEffect(() => {
        if (!anchor) return;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); anchor.focus(); } };
        const onPointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !anchor.contains(event.target) && !popoverRef.current?.contains(event.target)) close();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer);
        return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
    }, [anchor, close]);
    return { anchor, setAnchor, position, popoverRef, close };
}
