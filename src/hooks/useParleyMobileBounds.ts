/** @file useParleyMobileBounds.ts — Place communication panes in mobile control areas. */
import { useLayoutEffect, useState, type CSSProperties } from 'react';

interface Bounds { channels: CSSProperties; history: CSSProperties; landscape: boolean }

// --- Control area measurements ---
export const useParleyMobileBounds = (open: boolean, mobile: boolean, landscape: boolean): Bounds | null => {
    const [bounds, setBounds] = useState<Bounds | null>(null);
    useLayoutEffect(() => {
        if (!open || !mobile) return;
        const column = document.querySelector<HTMLElement>('.mobile-command-column');
        const log = document.querySelector<HTMLElement>('.desktop-center-column');
        const input = document.querySelector<HTMLElement>('.command-dock-input-main');
        if (!column || !log || !input) { setBounds(null); return; }
        let frame = 0;
        const measure = () => {
            const area = column.getBoundingClientRect();
            const logRect = log.getBoundingClientRect();
            const bar = input.getBoundingClientRect();
            if (landscape) {
                const top = area.top;
                const height = Math.max(0, bar.top - top);
                setBounds({ landscape: true,
                    channels: { left: area.left, top, width: Math.max(0, logRect.left - area.left), height },
                    history: { left: logRect.right, top, width: Math.max(0, area.right - logRect.right), height: Math.max(0, area.bottom - top) } });
            } else {
                const top = Math.max(area.top, bar.bottom);
                const height = Math.max(0, area.bottom - top);
                setBounds({ landscape: false, channels: { left: area.left, top, width: area.width, height }, history: {} });
            }
        };
        const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        [column, log, input].forEach(element => observer?.observe(element));
        window.addEventListener('resize', schedule);
        return () => { observer?.disconnect(); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); };
    }, [open, mobile, landscape]);
    return bounds;
};
