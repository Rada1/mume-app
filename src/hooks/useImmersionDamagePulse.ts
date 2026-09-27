/**
 * @file useImmersionDamagePulse.ts
 * @description Pulses the immersion frame on incoming combat damage.
 */

import { useEffect, RefObject } from 'react';
import { gmcpBus } from '../events/gmcpBus';

// --- Logic Section ---
export const useImmersionDamagePulse = (
    containerRef: RefObject<HTMLDivElement>,
    enabled: boolean
) => {
    useEffect(() => {
        const container = containerRef.current;
        if (!enabled || !container) return;

        let resetTimer: ReturnType<typeof setTimeout> | null = null;
        const unsubscribe = gmcpBus.on('Game.CombatPulse', ({ direction }) => {
            if (direction !== 'incoming') return;

            if (resetTimer) clearTimeout(resetTimer);
            container.classList.remove('immersion-damage-pulse');
            void container.offsetWidth;
            container.classList.add('immersion-damage-pulse');
            resetTimer = setTimeout(() => {
                container.classList.remove('immersion-damage-pulse');
                resetTimer = null;
            }, 1400);
        });

        return () => {
            unsubscribe();
            if (resetTimer) clearTimeout(resetTimer);
            container.classList.remove('immersion-damage-pulse');
        };
    }, [containerRef, enabled]);
};
