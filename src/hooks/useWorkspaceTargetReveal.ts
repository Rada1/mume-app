/** @file useWorkspaceTargetReveal.ts — Reveals a requested target without scrolling the game log. */
import { useLayoutEffect, type RefObject } from 'react';
import type { PopoverState } from '../types';
import { getCommandMenuSectionKey, useCommandMenuSectionsStore } from '../stores/useCommandMenuSectionsStore';

// --- Selection visibility ---
export const useWorkspaceTargetReveal = (
    rootRef: RefObject<HTMLElement | null>, targetId: string | undefined,
    request: PopoverState, location: string
) => {
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || !targetId) return;
        let frame = 0;
        let revealed = false;
        const reveal = () => {
            frame = 0;
            if (revealed) return;
            const list = root.querySelector<HTMLElement>(`.command-tree-gear-quick-list[aria-label="${location} targets"]`);
            const target = list && Array.from(list.querySelectorAll<HTMLElement>('[data-target-id]'))
                .find(row => row.dataset.targetId === targetId && row.getAttribute('aria-expanded') === 'true');
            if (!target || !list || !list.clientHeight) return;
            // Room targets may live inside a previously collapsed Characters/Objects section.
            let ancestor = target.parentElement;
            while (ancestor && ancestor !== list) {
                if (ancestor.matches('.command-tree-section-content[hidden]')) {
                    const section = ancestor.parentElement;
                    const menu = section?.parentElement?.closest('[aria-label]');
                    const key = getCommandMenuSectionKey(menu?.getAttribute('aria-label') || 'Commands', section?.getAttribute('aria-label') || '');
                    useCommandMenuSectionsStore.getState().expand(key);
                }
                ancestor = ancestor.parentElement;
            }
            if (!target.getClientRects().length) return;
            const bounds = list.getBoundingClientRect();
            const row = target.getBoundingClientRect();
            const top = bounds.top + list.clientTop + 6;
            const bottom = bounds.top + list.clientTop + list.clientHeight - 6;
            const delta = row.top < top ? row.top - top : row.bottom > bottom ? row.bottom - bottom : 0;
            // Only move this target list; scrollIntoView can also move the log and outer panels.
            if (delta) list.scrollTop += delta;
            revealed = true;
            mutations.disconnect();
            resize.disconnect();
        };
        const schedule = () => { if (!frame && !revealed) frame = requestAnimationFrame(reveal); };
        // Selection can resolve after an inventory/equipment snapshot or the panel mounts.
        const mutations = new MutationObserver(schedule);
        mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded', 'data-target-id', 'hidden'] });
        const resize = new ResizeObserver(schedule);
        resize.observe(root);
        schedule();
        return () => {
            cancelAnimationFrame(frame);
            mutations.disconnect();
            resize.disconnect();
        };
    }, [rootRef, targetId, request, location]);
};
