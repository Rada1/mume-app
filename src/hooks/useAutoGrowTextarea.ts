/**
 * @file useAutoGrowTextarea.ts
 * @description Resizes a textarea to keep its wrapped input visible.
 */

// --- Logic Section ---
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export function useAutoGrowTextarea(value: string, enabled: boolean) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resizeTextarea = useCallback((textarea = textareaRef.current) => {
        if (!textarea) return;
        if (!enabled) {
            textarea.style.height = '';
            return;
        }

        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [enabled]);

    useLayoutEffect(() => {
        resizeTextarea();
    }, [resizeTextarea, value]);

    useEffect(() => {
        const textarea = textareaRef.current;
        const wrap = textarea?.parentElement;
        if (!enabled || !textarea || !wrap || typeof ResizeObserver === 'undefined') return;

        let previousWidth = wrap.getBoundingClientRect().width;
        const observer = new ResizeObserver(entries => {
            const nextWidth = entries[0]?.contentRect.width;
            if (nextWidth === undefined || Math.abs(nextWidth - previousWidth) < 1) return;
            previousWidth = nextWidth;
            resizeTextarea(textarea);
        });

        observer.observe(wrap);
        return () => observer.disconnect();
    }, [enabled, resizeTextarea]);

    return { textareaRef, resizeTextarea };
}
