/**
 * @file useHaptics.ts
 * @description Hook for mobile haptic feedback.
 */

import { useCallback } from 'react';

export const useHaptics = () => {
    /**
     * Triggers a haptic vibration on mobile devices.
     * @param ms Duration in milliseconds.
     */
    const triggerHaptic = useCallback((ms: number) => {
        if (navigator && typeof navigator.vibrate === 'function') {
            // Slight dampening to make it feel more "premium" and less aggressive
            const dampenedDuration = Math.max(1, Math.floor(ms * 0.5));
            try {
                navigator.vibrate(dampenedDuration);
            } catch (err) {
                // Silently fail if blocked by browser policy
            }
        }
    }, []);

    return { triggerHaptic };
};
