/** @file useUpwardCommandBranches.ts — Align cascading columns with their parent rows. */
import { useLayoutEffect, type RefObject } from 'react';

// --- Geometry Section ---
export const useUpwardCommandBranches = (ref: RefObject<HTMLDivElement | null>, enabled: boolean, kind: 'commands' | 'gear' = 'commands') => {
    useLayoutEffect(() => {
        const list = ref.current;
        if (!enabled || !list) return;
        const getColumns = () => kind === 'gear'
            ? [list.querySelector<HTMLElement>('.command-tree-gear-quick-list'),
                ...list.querySelectorAll<HTMLElement>('.command-tree-gear-quick-actions, .command-tree-gear-quick-contents')]
                .filter((column): column is HTMLElement => column !== null)
            : Array.from(list.querySelectorAll<HTMLElement>(':scope > .command-tree-branch'));
        let frame = 0;
        const offsets = new WeakMap<HTMLElement, number>();
        const align = () => {
            frame = 0;
            const columns = getColumns();
            const listRect = list.getBoundingClientRect();
            const rootBottom = columns[0]?.getBoundingClientRect().bottom ?? listRect.bottom;

            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                const desiredZIndex = String(10 + index);
                if (column.style.zIndex !== desiredZIndex) column.style.zIndex = desiredZIndex;
                if (index === 0) continue;
                const parent = columns[kind === 'gear' ? 0 : index - 1];
                const anchorSelector = kind === 'gear'
                    ? '.command-tree-object[aria-expanded="true"]'
                    : '.command-tree-row[aria-expanded="true"]';
                const anchor = parent.querySelector<HTMLElement>(anchorSelector);
                if (!anchor) continue;
                const anchorRect = anchor.getBoundingClientRect();
                const parentRect = parent.getBoundingClientRect();
                const parentBottom = parentRect.bottom;
                const headerEl = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.header') : null;
                const topBound = headerEl ? Math.round(headerEl.getBoundingClientRect().bottom + 8) : 8;
                const dockLimit = window.innerHeight - 58;
                const bottomBound = Math.min(
                    dockLimit,
                    Math.max(listRect.bottom, rootBottom, parentBottom, anchorRect.bottom)
                );
                const availableHeight = Math.max(180, Math.round(bottomBound - topBound));
                const maxHeight = `${availableHeight}px`;
                if (column.style.maxHeight !== maxHeight) column.style.maxHeight = maxHeight;
                const isFullHeight = column.classList.contains('command-tree-shop-stock-targets');
                if (isFullHeight) {
                    if (column.style.height !== maxHeight) column.style.height = maxHeight;
                } else if (column.style.height) {
                    column.style.height = '';
                }
                const columnRect = column.getBoundingClientRect();
                const currentOffset = offsets.get(column) || 0;
                const naturalTop = columnRect.top - currentOffset;
                const desiredTop = isFullHeight
                    ? topBound
                    : Math.max(
                        topBound,
                        Math.min(anchorRect.top, bottomBound - columnRect.height)
                    );
                const offset = Math.round(desiredTop - naturalTop);
                if (currentOffset !== offset) {
                    column.style.transform = `translateY(${offset}px)`;
                    offsets.set(column, offset);
                }
            }
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(align);
        };
        const mutation = new MutationObserver(schedule);
        mutation.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded'] });
        const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
        resize?.observe(list);
        list.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        align();
        return () => {
            cancelAnimationFrame(frame);
            mutation.disconnect();
            resize?.disconnect();
            list.removeEventListener('scroll', schedule, true);
            window.removeEventListener('resize', schedule);
            getColumns().forEach(column => {
                column.style.transform = '';
                column.style.maxHeight = '';
                column.style.height = '';
                column.style.zIndex = '';
            });
        };
    }, [enabled, ref, kind]);
};
