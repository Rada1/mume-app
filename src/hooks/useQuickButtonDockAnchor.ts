/** @file useQuickButtonDockAnchor.ts — Keep quick buttons above the input in the mobile command console. */
import { useLayoutEffect, useRef } from 'react';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';

// --- Dock Anchor Section ---
export function useQuickButtonDockAnchor(isMobile: boolean) {
    const barRef = useRef<HTMLDivElement>(null);
    const guideOpen = useCommandPanelStore(state => state.isMobileGuideOpen);
    useLayoutEffect(() => {
        const bar = barRef.current;
        if (!bar || !isMobile || !guideOpen) return;
        const log = bar.closest('.message-log-container');
        const dock = log?.querySelector<HTMLElement>('.command-dock-shell-mobile');
        const input = dock?.querySelector<HTMLElement>('.command-dock-input-main');
        const parent = bar.offsetParent;
        if (!dock || !input || !(parent instanceof HTMLElement)) return;
        const update = () => {
            bar.style.bottom = `${Math.max(0, parent.getBoundingClientRect().bottom - input.getBoundingClientRect().top) + 6}px`;
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(dock);
        observer.observe(input);
        observer.observe(parent);
        window.addEventListener('resize', update);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
            bar.style.removeProperty('bottom');
        };
    }, [isMobile, guideOpen]);
    return barRef;
}
