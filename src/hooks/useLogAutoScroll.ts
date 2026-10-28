/** @file useLogAutoScroll.ts — One geometry read/write per frame for live log following. */
import { useCallback, useEffect, useRef } from 'react';
import { uiPerformance } from '../utils/uiPerformance';

// --- Live Following Section ---
export function useLogAutoScroll() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAnimationRef = useRef<number | null>(null);
    const isAutoScrollingRef = useRef(false);
    const isLockedToBottomRef = useRef(true);
    const resetFrame = useRef<number | null>(null);
    const pending = useRef({ force: false, following: true });

    const scrollToBottom = useCallback((force = false, _instant = false, _source = 'unknown') => {
        if (!scrollContainerRef.current) return;
        if (scrollAnimationRef.current !== null) {
            pending.current.force ||= force;
            return;
        }
        pending.current = { force, following: isLockedToBottomRef.current };
        scrollAnimationRef.current = requestAnimationFrame(() => {
            scrollAnimationRef.current = null;
            const container = scrollContainerRef.current;
            // A queued arrival must not pull the reader out of history if they
            // scrolled away before the browser got a chance to service it.
            if (!container || (pending.current.following && !isLockedToBottomRef.current)) return;
            const finish = uiPerformance.startWork('Log follow layout');
            try {
                const current = container.scrollTop;
                const target = Math.max(0, container.scrollHeight - container.clientHeight);
                if ((!pending.current.force && target - current >= 40) || current === target) return;
                isAutoScrollingRef.current = true;
                container.scrollTop = target;
                if (resetFrame.current !== null) cancelAnimationFrame(resetFrame.current);
                resetFrame.current = requestAnimationFrame(() => {
                    resetFrame.current = null;
                    isAutoScrollingRef.current = false;
                });
            } finally { finish(); }
        });
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        const observer = container ? new ResizeObserver(() => {
            if (isLockedToBottomRef.current) scrollToBottom(true, true, 'ResizeObserver_Growth');
        }) : null;
        if (container) observer?.observe(container);
        return () => {
            observer?.disconnect();
            if (scrollAnimationRef.current !== null) cancelAnimationFrame(scrollAnimationRef.current);
            if (resetFrame.current !== null) cancelAnimationFrame(resetFrame.current);
            scrollAnimationRef.current = null;
            resetFrame.current = null;
            isAutoScrollingRef.current = false;
        };
    }, [scrollToBottom]);

    return { scrollContainerRef, messagesEndRef, scrollAnimationRef,
        isAutoScrollingRef, isLockedToBottomRef, scrollToBottom };
}
