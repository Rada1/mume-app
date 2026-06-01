/**
 * @file useHaptics.ts
 * @description Hook for mobile haptic feedback.
 */

import { useCallback, useRef } from 'react';

type HapticKind = 'tick' | 'select' | 'heavy';

interface HapticPattern {
    kind: HapticKind;
    duration: number;
    minGap: number;
    priority: number;
}

const toPattern = (ms: number): HapticPattern => {
    if (ms <= 8) {
        return { kind: 'tick', duration: 12, minGap: 45, priority: 1 };
    }
    if (ms <= 25) {
        return { kind: 'select', duration: Math.max(16, ms), minGap: 60, priority: 2 };
    }
    return { kind: 'heavy', duration: Math.min(70, Math.max(35, ms)), minGap: 90, priority: 3 };
};

const canVibrate = () =>
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const useHaptics = () => {
    const lastFireAtRef = useRef(0);
    const lastKindRef = useRef<HapticKind | null>(null);
    const pendingRef = useRef<{ pattern: HapticPattern; timeout: ReturnType<typeof setTimeout> } | null>(null);

    const fire = useCallback((pattern: HapticPattern) => {
        if (!canVibrate()) return;

        try {
            navigator.vibrate(pattern.duration);
            lastFireAtRef.current = performance.now();
            lastKindRef.current = pattern.kind;
        } catch (err) {
            // Silently fail if blocked by browser policy.
        }
    }, []);

    /**
     * Triggers a haptic vibration on mobile devices.
     * @param ms Duration in milliseconds.
     */
    const triggerHaptic = useCallback((ms: number) => {
        if (!canVibrate()) return;

        const pattern = toPattern(ms);
        const now = performance.now();
        const elapsed = now - lastFireAtRef.current;

        if (elapsed >= pattern.minGap) {
            if (pendingRef.current) {
                clearTimeout(pendingRef.current.timeout);
                pendingRef.current = null;
            }
            fire(pattern);
            return;
        }

        const pending = pendingRef.current;
        if (pending && pending.pattern.priority >= pattern.priority) return;

        if (pending) {
            clearTimeout(pending.timeout);
        }

        const delay = Math.max(0, pattern.minGap - elapsed);
        pendingRef.current = {
            pattern,
            timeout: setTimeout(() => {
                pendingRef.current = null;
                fire(pattern);
            }, delay),
        };
    }, [fire]);

    return { triggerHaptic };
};
