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
        let observedMapSlot: HTMLElement | null = null;
        let observedSummaryToggle: HTMLElement | null = null;
        let frame: number | null = null;
        const updateRegion = () => {
            frame = null;
            if (![app, controls, actions, summary].every(element => element.isConnected)) return;
            // Gather every geometry read before touching CSS. Interleaving them
            // forces the browser to lay out the whole mobile surface again.
            const pending = new Map<string, string>();
            const setCss = (name: string, value: string) => pending.set(name, value);
            // Rotation reparents/remounts the summary and input; never measure cached descendants.
            const controlsContent = controls.querySelector<HTMLElement>('.command-tree-dock-controls-inner');
            const actionsContent = actions.querySelector<HTMLElement>('.command-tree-dock-action-bar');
            const input = app.querySelector<HTMLElement>('.command-dock-input-main');
            const summaryContent = summary.querySelector<HTMLElement>('.command-tree-you-summary');
            const isLandscape = app.classList.contains('is-landscape');
            if (isLandscape) {
                const overlaySummary = app.querySelector<HTMLElement>('.landscape-character-summary-overlay .command-tree-you-summary');
                const identity = overlaySummary?.querySelector<HTMLElement>('.command-tree-you-toggle');
                const rows = identity && Array.from(identity.querySelectorAll<HTMLElement>(':scope > strong, :scope > span'))
                    .map(element => element.getBoundingClientRect()).filter(rect => rect.height > 0);
                if (overlaySummary && rows?.length) {
                    const padding = getComputedStyle(overlaySummary);
                    const height = Math.ceil(Math.max(...rows.map(rect => rect.bottom)) - Math.min(...rows.map(rect => rect.top))
                        + parseFloat(padding.paddingTop) + parseFloat(padding.paddingBottom) + 8);
                    const value = `${height}px`;
                    setCss('--landscape-summary-reserved-height', value);
                }
            }
            const inputRect = input?.getBoundingClientRect();
            const controlsRect = (controlsContent ?? controls).getBoundingClientRect();
            const actionsBottom = actionsContent?.getBoundingClientRect().bottom ?? actions.getBoundingClientRect().bottom;
            const menuTop = isLandscape
                ? app.querySelector<HTMLElement>('.mobile-command-column')?.getBoundingClientRect().top ?? actionsBottom
                : Math.max(actionsBottom, inputRect?.bottom ?? 0);
            const summaryTop = (summaryContent ?? summary).getBoundingClientRect().top;
            const menuBottomBoundary = isLandscape
                ? Math.max(controlsRect.top, inputRect?.top ?? 0)
                : Math.min(summaryTop, controlsRect.top);
            setCss('--mobile-readability-menu-top', `${Math.ceil(menuTop + 4)}px`);
            setCss('--mobile-readability-main-branch-offset', `${Math.max(0, Math.floor(actionsBottom - menuTop))}px`);
            setCss('--mobile-readability-right-branch-offset', '0px');
            setCss('--mobile-readability-menu-bottom', `${Math.max(4, Math.ceil(window.innerHeight - menuBottomBoundary + 4))}px`);
            setCss('--mobile-readability-main-branch-bottom-inset', `${isLandscape && inputRect ? Math.max(0, Math.ceil(menuBottomBoundary - inputRect.top)) : 0}px`);
            setCss('--mobile-readability-right-branch-bottom-inset', `${isLandscape ? Math.max(0, Math.ceil(menuBottomBoundary - controlsRect.top)) : 0}px`);
            if (isLandscape) {
                setCss('--landscape-command-input-clearance', `${Math.max(4, Math.ceil(window.innerHeight - (inputRect?.top ?? window.innerHeight) + 4))}px`);
                const mapSlotRect = app.querySelector<HTMLElement>('.command-tree-movement-map-slot')?.getBoundingClientRect();
                const summaryRect = summary.getBoundingClientRect();
                const laneRect = mapSlotRect && mapSlotRect.width > 0 ? mapSlotRect : summaryRect;
                setCss('--landscape-character-summary-left', `${Math.round(laneRect.left)}px`);
                setCss('--landscape-character-summary-right', `${Math.max(0, Math.round(window.innerWidth - laneRect.right))}px`);
                setCss('--landscape-character-summary-top', `${Math.round(mapSlotRect?.height ? mapSlotRect.top : menuTop + 4)}px`);
                setCss('--landscape-character-summary-bottom', `${Math.max(0, Math.round(window.innerHeight - summaryRect.bottom))}px`);
            }
            pending.forEach((value, name) => {
                if (app.style.getPropertyValue(name) !== value) app.style.setProperty(name, value);
            });
        };
        const schedule = () => {
            if (frame === null) frame = requestAnimationFrame(updateRegion);
        };

        updateRegion();
        const observer = new ResizeObserver(schedule);
        const observeMapSlot = () => {
            const nextMapSlot = app.querySelector<HTMLElement>('.command-tree-movement-map-slot');
            const nextSummaryToggle = app.querySelector<HTMLElement>('.landscape-character-summary-overlay .command-tree-you-toggle');
            if (nextMapSlot === observedMapSlot && nextSummaryToggle === observedSummaryToggle) return;
            if (observedMapSlot) observer.unobserve(observedMapSlot);
            observedMapSlot = nextMapSlot;
            if (observedMapSlot) observer.observe(observedMapSlot);
            if (observedSummaryToggle) observer.unobserve(observedSummaryToggle);
            observedSummaryToggle = nextSummaryToggle;
            if (observedSummaryToggle) observer.observe(observedSummaryToggle);
            schedule();
        };
        observer.observe(controls);
        observer.observe(actions);
        observer.observe(summary);
        [controls.querySelector<HTMLElement>('.command-tree-dock-controls-inner'),
            actions.querySelector<HTMLElement>('.command-tree-dock-action-bar'),
            app.querySelector<HTMLElement>('.command-dock-input-main'),
            summary.querySelector<HTMLElement>('.command-tree-you-summary')].forEach(element => {
            if (element) observer.observe(element);
        });
        const commandColumn = app.querySelector<HTMLElement>('.mobile-command-column');
        if (commandColumn) observer.observe(commandColumn);
        const mutationObserver = new MutationObserver(observeMapSlot);
        mutationObserver.observe(app, { childList: true, subtree: true });
        observeMapSlot();
        window.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('resize', schedule);
        window.visualViewport?.addEventListener('scroll', schedule);
        return () => {
            if (frame !== null) cancelAnimationFrame(frame);
            observer.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('resize', schedule);
            window.visualViewport?.removeEventListener('scroll', schedule);
            app.style.removeProperty('--mobile-readability-menu-top');
            app.style.removeProperty('--mobile-readability-main-branch-offset');
            app.style.removeProperty('--mobile-readability-right-branch-offset');
            app.style.removeProperty('--mobile-readability-menu-bottom');
            app.style.removeProperty('--mobile-readability-main-branch-bottom-inset');
            app.style.removeProperty('--mobile-readability-right-branch-bottom-inset');
            app.style.removeProperty('--landscape-summary-reserved-height');
            app.style.removeProperty('--landscape-command-input-clearance');
            app.style.removeProperty('--landscape-character-summary-left');
            app.style.removeProperty('--landscape-character-summary-right');
            app.style.removeProperty('--landscape-character-summary-top');
            app.style.removeProperty('--landscape-character-summary-bottom');
        };
    }, [enabled, slots]);
};
