/** @file heldTargetPreview.ts — Reuses target previews during captured mobile command holds. */
import type { RefCallback } from 'react';

// --- Explicit held preview event ---
const HELD_PREVIEW_EVENT = 'mume-held-target-preview';
export const heldTargetPreviewRef = (preview: () => void): RefCallback<HTMLElement> => element => {
    if (!element) return;
    const listener = (event: Event) => { event.stopPropagation(); preview(); };
    element.addEventListener(HELD_PREVIEW_EVENT, listener);
    return () => element.removeEventListener(HELD_PREVIEW_EVENT, listener);
};
export const previewHeldTarget = (element: HTMLElement) => {
    element.dispatchEvent(new Event(HELD_PREVIEW_EVENT, { bubbles: true }));
};
