/** @file useMobileTargetPopoverPosition.ts — Initially place mobile target actions beside the selected log text. */
import { useLayoutEffect, type RefObject } from 'react';
import type { PopoverState } from '../types';

// --- Positioning ---
type Rect = { left: number; top: number; width: number; height: number };

export const positionMobileTargetPopover = (source: Rect, bounds: Rect, width: number, height: number) => {
    const gap = 6;
    const right = bounds.left + bounds.width;
    const bottom = bounds.top + bounds.height;
    const left = Math.max(bounds.left, Math.min(source.left, right - width));
    const above = source.top - gap - height;
    const top = Math.max(bounds.top, Math.min(above, bottom - height));
    return { left, top };
};

const findLogSource = (source: Rect): HTMLElement | null => {
    const candidates = document.querySelectorAll<HTMLElement>('.message-log .inline-btn');
    for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect();
        if (Math.abs(rect.left - source.left) < 2 && Math.abs(rect.top - source.top) < 2
            && Math.abs(rect.width - source.width) < 2 && Math.abs(rect.height - source.height) < 2) return candidate;
    }
    return null;
};

// --- Initial placement and viewport bounds ---
export const useMobileTargetPopoverPosition = (
    ref: RefObject<HTMLElement | null>, enabled: boolean, request: PopoverState
) => {
    useLayoutEffect(() => {
        const panel = ref.current;
        if (!enabled || !panel) return;
        const initial = request.sourceRect || { left: request.x, top: request.y, width: 0, height: 0 };
        const source = request.sourceRect ? findLogSource(request.sourceRect) : null;
        const log = source?.closest<HTMLElement>('.message-log');
        let frame = 0;
        const update = () => {
            frame = 0;
            const sourceRect = initial;
            const logRect = log?.getBoundingClientRect();
            const bounds = logRect && logRect.width > 0 && logRect.height > 0
                ? { left: Math.max(8, logRect.left + 4), top: Math.max(8, logRect.top + 4),
                    width: Math.min(window.innerWidth - 8, logRect.right - 4) - Math.max(8, logRect.left + 4),
                    height: Math.min(window.innerHeight - 8, logRect.bottom - 4) - Math.max(8, logRect.top + 4) }
                : { left: 8, top: 8, width: window.innerWidth - 16, height: window.innerHeight - 16 };
            const above = sourceRect.top - bounds.top - 6;
            panel.style.setProperty('--target-popover-max-height', `${Math.max(80, Math.min(360, bounds.height, above))}px`);
            panel.style.setProperty('--target-popover-max-width', `${Math.max(80, bounds.width)}px`);
            const { left, top } = positionMobileTargetPopover(sourceRect, bounds, panel.offsetWidth, panel.offsetHeight);
            panel.style.setProperty('--target-popover-left', `${left}px`);
            panel.style.setProperty('--target-popover-top', `${top}px`);
            panel.style.visibility = 'visible';
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
        if (log) observer?.observe(log);
        window.addEventListener('resize', schedule);
        return () => {
            if (frame) cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [ref, enabled, request.entityId, request.x, request.y, request.sourceRect?.left,
        request.sourceRect?.top, request.sourceRect?.width, request.sourceRect?.height]);
};
