/** @file useMobileReadabilityMenuBounds.ts — Keeps mobile command branches between dock controls. */
import { useLayoutEffect } from 'react';

// --- Logic Section ---
type DockSlots = {
    app: HTMLElement;
    controls: HTMLElement;
    actions: HTMLElement;
    summary: HTMLElement;
};

export const useMobileReadabilityMenuBounds = (enabled: boolean, slots: DockSlots | null) => {
    useLayoutEffect(() => {
        if (!enabled || !slots) return;
        const { app, controls, actions, summary } = slots;
        const controlsContent = controls.querySelector<HTMLElement>('.command-tree-dock-controls-inner');
        const actionsContent = actions.querySelector<HTMLElement>('.command-tree-dock-action-bar');
        const input = app.querySelector<HTMLElement>('.command-dock-input-main');
        const summaryContent = summary.querySelector<HTMLElement>('.command-tree-you-summary');
        let observedMapSlot: HTMLElement | null = null;
        const updateRegion = () => {
            const isLandscape = app.classList.contains('is-landscape');
            const inputRect = input?.getBoundingClientRect();
            const controlsBottom = controlsContent?.getBoundingClientRect().bottom ?? controls.getBoundingClientRect().bottom;
            const actionsBottom = actionsContent?.getBoundingClientRect().bottom ?? actions.getBoundingClientRect().bottom;
            const menuTop = isLandscape
                ? Math.min(controlsBottom, actionsBottom)
                : Math.max(controlsBottom, actionsBottom, inputRect?.bottom ?? 0);
            const summaryTop = (summaryContent ?? summary).getBoundingClientRect().top;
            const menuBottomBoundary = Math.max(summaryTop, isLandscape ? inputRect?.top ?? 0 : 0);
            app.style.setProperty('--mobile-readability-menu-top', `${Math.ceil(menuTop + 4)}px`);
            app.style.setProperty('--mobile-readability-main-branch-offset', `${Math.max(0, Math.floor(actionsBottom - menuTop))}px`);
            app.style.setProperty('--mobile-readability-right-branch-offset', `${Math.max(0, Math.floor(controlsBottom - menuTop))}px`);
            app.style.setProperty('--mobile-readability-menu-bottom', `${Math.max(4, Math.ceil(window.innerHeight - menuBottomBoundary + 4))}px`);
            app.style.setProperty('--mobile-readability-main-branch-bottom-inset', `${isLandscape && inputRect ? Math.max(0, Math.ceil(menuBottomBoundary - inputRect.top)) : 0}px`);
            if (isLandscape) {
                app.style.setProperty('--landscape-command-input-clearance', `${Math.max(4, Math.ceil(window.innerHeight - (inputRect?.top ?? window.innerHeight) + 4))}px`);
                const mapSlotRect = app.querySelector<HTMLElement>('.command-tree-movement-map-slot')?.getBoundingClientRect();
                const summaryRect = summary.getBoundingClientRect();
                const laneRect = mapSlotRect && mapSlotRect.width > 0 ? mapSlotRect : summaryRect;
                app.style.setProperty('--landscape-character-summary-left', `${Math.round(laneRect.left)}px`);
                app.style.setProperty('--landscape-character-summary-right', `${Math.max(0, Math.round(window.innerWidth - laneRect.right))}px`);
                app.style.setProperty('--landscape-character-summary-top', `${Math.round(mapSlotRect?.height ? mapSlotRect.top : menuTop + 4)}px`);
                app.style.setProperty('--landscape-character-summary-bottom', `${Math.max(0, Math.round(window.innerHeight - summaryRect.bottom))}px`);
            }
        };

        updateRegion();
        const observer = new ResizeObserver(updateRegion);
        const observeMapSlot = () => {
            const nextMapSlot = app.querySelector<HTMLElement>('.command-tree-movement-map-slot');
            if (nextMapSlot === observedMapSlot) return;
            if (observedMapSlot) observer.unobserve(observedMapSlot);
            observedMapSlot = nextMapSlot;
            if (observedMapSlot) observer.observe(observedMapSlot);
            updateRegion();
        };
        observer.observe(controls);
        observer.observe(actions);
        observer.observe(summary);
        [controlsContent, actionsContent, input, summaryContent].forEach(element => {
            if (element) observer.observe(element);
        });
        const commandColumn = app.querySelector<HTMLElement>('.mobile-command-column');
        if (commandColumn) observer.observe(commandColumn);
        const mutationObserver = new MutationObserver(observeMapSlot);
        mutationObserver.observe(app, { childList: true, subtree: true });
        observeMapSlot();
        window.addEventListener('resize', updateRegion);
        window.visualViewport?.addEventListener('resize', updateRegion);
        window.visualViewport?.addEventListener('scroll', updateRegion);
        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener('resize', updateRegion);
            window.visualViewport?.removeEventListener('resize', updateRegion);
            window.visualViewport?.removeEventListener('scroll', updateRegion);
            app.style.removeProperty('--mobile-readability-menu-top');
            app.style.removeProperty('--mobile-readability-main-branch-offset');
            app.style.removeProperty('--mobile-readability-right-branch-offset');
            app.style.removeProperty('--mobile-readability-menu-bottom');
            app.style.removeProperty('--mobile-readability-main-branch-bottom-inset');
            app.style.removeProperty('--landscape-command-input-clearance');
            app.style.removeProperty('--landscape-character-summary-left');
            app.style.removeProperty('--landscape-character-summary-right');
            app.style.removeProperty('--landscape-character-summary-top');
            app.style.removeProperty('--landscape-character-summary-bottom');
        };
    }, [enabled, slots]);
};
