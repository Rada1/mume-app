/** @file useSwipeLetterBlink.ts — Keeps the last cardinal swipe letter blinking briefly after release. */

import { useEffect, useRef, useState } from 'react';
import type { SwipeDirection } from '../../../types';

// --- Logic Section ---
const CARDINAL_DIRECTIONS = new Set<SwipeDirection>(['up', 'right', 'down', 'left']);

export const useSwipeLetterBlink = (activeDirection: SwipeDirection | null): SwipeDirection | null => {
    const [feedbackDirection, setFeedbackDirection] = useState<SwipeDirection | null>(null);
    const lastActiveDirectionRef = useRef<SwipeDirection | null>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;

        if (activeDirection && CARDINAL_DIRECTIONS.has(activeDirection)) {
            lastActiveDirectionRef.current = activeDirection;
            setFeedbackDirection(activeDirection);
            return;
        }

        if (!activeDirection && lastActiveDirectionRef.current) {
            const lastDirection = lastActiveDirectionRef.current;
            resetTimerRef.current = setTimeout(() => {
                setFeedbackDirection(current => current === lastDirection ? null : current);
                lastActiveDirectionRef.current = null;
                resetTimerRef.current = null;
            }, 650);
            return;
        }

        lastActiveDirectionRef.current = null;
        setFeedbackDirection(null);
    }, [activeDirection]);

    useEffect(() => () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    }, []);

    return feedbackDirection;
};
