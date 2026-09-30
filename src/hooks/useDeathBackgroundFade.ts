/**
 * @file useDeathBackgroundFade.ts
 * @description Cuts the client background to black on death, then reveals the zone color.
 */

import { useEffect, useRef, useState } from 'react';
import { gmcpBus } from '../events/gmcpBus';

// --- Logic Section ---
export type DeathBackgroundFadePhase = 'idle' | 'flash' | 'black' | 'fading';

export const useDeathBackgroundFade = (): DeathBackgroundFadePhase => {
    const [phase, setPhase] = useState<DeathBackgroundFadePhase>('idle');
    const flashTimerRef = useRef<number | null>(null);
    const frameRef = useRef<number | null>(null);
    const resetTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const unsubscribe = gmcpBus.on('Game.PlayerDeath', () => {
            if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
            if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
            if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);

            setPhase('flash');
            flashTimerRef.current = window.setTimeout(() => {
                flashTimerRef.current = null;
                setPhase('black');
                frameRef.current = window.requestAnimationFrame(() => {
                    frameRef.current = null;
                    setPhase('fading');
                    resetTimerRef.current = window.setTimeout(() => {
                        resetTimerRef.current = null;
                        setPhase('idle');
                    }, 10000);
                });
            }, 25);
        });

        return () => {
            unsubscribe();
            if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
            if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
            if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
        };
    }, []);

    return phase;
};
