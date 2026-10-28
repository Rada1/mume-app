/** @file useHeldTargetHover.ts — Feedback and branch navigation under a captured command hold. */
import { useEffect, useRef } from 'react';
import { previewHeldTarget } from '../utils/heldTargetPreview';

// --- Held target hit testing ---
export const getHeldTarget = (element: Element | null): HTMLElement | null => {
    const target = element?.closest<HTMLElement>('button,[data-menu-item="true"]');
    const branch = target?.closest('.command-tree-branch');
    if (!target || !branch || !target.closest('[data-mobile-tile-target-lane]')
        || branch.matches('.command-tree-main-branch:not(.is-follow-target-branch)')
        || target.matches(':disabled,[aria-disabled="true"]')) return null;
    return target;
};

export const isHeldTargetNavigation = (target: HTMLElement) => target.hasAttribute('aria-expanded')
    || target.hasAttribute('data-held-target-navigation')
    || Boolean(target.closest('.is-target-location-branch'));

// --- Per-hold feedback and navigation ---
export const useHeldTargetHover = (haptic: (duration: number) => void) => {
    const hovered = useRef<HTMLElement | null>(null);
    const clear = () => {
        hovered.current?.classList.remove('mobile-target-held-hover');
        hovered.current = null;
    };
    useEffect(() => clear, []);
    const update = (element: Element | null) => {
        const target = getHeldTarget(element);
        if (target === hovered.current) return;
        clear();
        if (!target) return;
        hovered.current = target;
        target.classList.add('mobile-target-held-hover');
        haptic(15);
        previewHeldTarget(target);
        if (isHeldTargetNavigation(target) && target.getAttribute('aria-expanded') !== 'true'
            && target.getAttribute('aria-pressed') !== 'true') target.click();
    };
    return { update, clear };
};
