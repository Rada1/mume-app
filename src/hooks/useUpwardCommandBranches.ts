/** @file useUpwardCommandBranches.ts — Align cascading columns with their parent rows. */
import { useLayoutEffect, type RefObject } from 'react';
import { menuVerticalPlacement } from '../utils/menuVerticalPlacement';

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

            for (let index = 1; index < columns.length; index++) {
                const parent = columns[kind === 'gear' ? 0 : index - 1];
                const anchorSelector = kind === 'gear'
                    ? '.command-tree-object[aria-expanded="true"]'
                    : '.command-tree-row[aria-expanded="true"]';
                const anchor = parent.querySelector<HTMLElement>(anchorSelector);
                const column = columns[index];
                if (!anchor) continue;
                const anchorRect = anchor.getBoundingClientRect();
                const placement = menuVerticalPlacement(anchorRect.top, anchorRect.bottom, window.innerHeight, true);
                const maxHeight = `min(62dvh, ${placement.maxHeight}px)`;
                if (column.style.maxHeight !== maxHeight) column.style.maxHeight = maxHeight;
                const columnRect = column.getBoundingClientRect();
                const offset = placement.top === undefined
                    ? anchorRect.bottom - columnRect.bottom + (offsets.get(column) || 0) : anchorRect.top - columnRect.top + (offsets.get(column) || 0);
                if (offsets.get(column) !== offset) {
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
        const resize = new ResizeObserver(schedule);
        resize.observe(list);
        list.addEventListener('scroll', schedule, true);
        window.addEventListener('resize', schedule);
        align();
        return () => {
            cancelAnimationFrame(frame);
            mutation.disconnect();
            resize.disconnect();
            list.removeEventListener('scroll', schedule, true);
            window.removeEventListener('resize', schedule);
            getColumns().forEach(column => {
                column.style.transform = '';
                column.style.maxHeight = '';
            });
        };
    }, [enabled, ref, kind]);
};
