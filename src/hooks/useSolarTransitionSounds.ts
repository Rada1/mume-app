/** @file useSolarTransitionSounds.ts -- Plays cues when the clock-driven sun crosses the horizon. */
import { useEffect, useRef } from 'react';
import type { MumeTime } from '../types';
import { getSunPosition } from '../utils/sunPosition';

// --- Solar Sound Transitions ---
interface PreviousSolarState {
    isSunVisible: boolean;
    mumeStartEpoch?: number;
}

export const useSolarTransitionSounds = (
    time: MumeTime,
    isEnabled: boolean,
    playEffect: (key: string) => void
): void => {
    const previousStateRef = useRef<PreviousSolarState | null>(null);
    const isSunVisible = getSunPosition(time).opacity > 0;
    const mumeStartEpoch = time.mumeStartEpoch;

    useEffect(() => {
        if (!isEnabled) {
            previousStateRef.current = null;
            return;
        }

        const previousState = previousStateRef.current;
        if (previousState?.mumeStartEpoch === mumeStartEpoch && previousState.isSunVisible !== isSunVisible) {
            playEffect(isSunVisible ? 'day' : 'night');
        }

        previousStateRef.current = { isSunVisible, mumeStartEpoch };
    }, [isEnabled, isSunVisible, mumeStartEpoch, playEffect]);
};
