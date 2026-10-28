/** @file useLogSurfaceLayout.ts — Coalesced log/map geometry for target menus and wheels. */
import { useLayoutEffect, type RefObject } from 'react';
import { uiPerformance } from '../utils/uiPerformance';

// --- Surface Geometry Section ---
export function useLogSurfaceLayout(ref: RefObject<HTMLDivElement | null>) {
    useLayoutEffect(() => {
        let frame: number | null = null;
        let mapPanels: HTMLElement[] = [];
        const measure = () => {
            frame = null;
            const log = ref.current;
            if (!log?.isConnected) return;
            const finish = uiPerformance.startWork('Log surface layout');
            try {
                const rect = log.getBoundingClientRect();
                const input = log.querySelector<HTMLElement>('.command-dock-input-main:not(.is-inline), .message-log-docked-input:not(.command-dock-row)');
                const inputRect = input?.getBoundingClientRect();
                mapPanels = [document.querySelector<HTMLElement>('.mobile-map-panel'),
                    document.querySelector<HTMLElement>('.map-drawer-desktop.open')]
                    .filter((panel): panel is HTMLElement => panel !== null);
                const mapRect = mapPanels.map(panel => panel.getBoundingClientRect())
                    .find(bounds => bounds.width > 0 && bounds.height > 0);
                const values = {
                    '--wheel-center-x': rect.left + rect.width / 2,
                    '--wheel-center-y': rect.top + rect.height / 2,
                    '--target-menu-log-bottom': rect.bottom,
                    '--message-log-left': rect.left,
                    '--message-log-top': rect.top,
                    '--message-log-width': rect.width,
                    '--message-log-height': rect.height,
                    '--message-log-action-area-height': inputRect ? Math.max(0, inputRect.top - rect.top) : rect.height,
                    '--tactical-map-left': mapRect?.left ?? 0,
                    '--tactical-map-top': mapRect?.top ?? 0,
                    '--tactical-map-width': mapRect?.width ?? window.innerWidth,
                    '--tactical-map-height': mapRect?.height ?? window.innerHeight
                };
                const style = document.documentElement.style;
                Object.entries(values).forEach(([name, value]) => {
                    const css = `${value}px`;
                    if (style.getPropertyValue(name) !== css) style.setProperty(name, css);
                });
            } finally { finish(); }
        };
        const schedule = () => {
            if (frame === null) frame = requestAnimationFrame(measure);
        };
        const onScroll = (event: Event) => {
            const target = event.target;
            // Scrolling a log, menu or sibling pane changes its contents, not
            // the outer surface bounds. Only an ancestor can move those bounds.
            if (target instanceof Element && !target.contains(ref.current)
                && !mapPanels.some(panel => target.contains(panel))) return;
            if (target === ref.current || mapPanels.includes(target as HTMLElement)) return;
            schedule();
        };
        const observer = new ResizeObserver(schedule);
        const log = ref.current;
        if (log) {
            observer.observe(log);
            if (log.parentElement) observer.observe(log.parentElement);
            const input = log.querySelector<HTMLElement>('.command-dock-input-main:not(.is-inline), .message-log-docked-input:not(.command-dock-row)');
            if (input) observer.observe(input);
            document.querySelectorAll<HTMLElement>('.mobile-map-panel, .map-drawer-desktop.open')
                .forEach(panel => observer.observe(panel));
        }
        schedule();
        const timeout = setTimeout(schedule, 100);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            if (frame !== null) cancelAnimationFrame(frame);
            clearTimeout(timeout);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [ref]);
}
