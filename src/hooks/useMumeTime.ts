/**
 * @file useMumeTime.ts
 * @description Hook that provides the current MUME game time on-the-fly from the starting epoch, ticking smoothly.
 */

import { useState, useEffect } from 'react';
import { MumeTime } from '../types';
import { getMumeTimeFromEpoch } from '../utils/mumeTimeUtils';

export function useMumeTime(gameTime: MumeTime | null): MumeTime {
    const epoch = gameTime?.mumeStartEpoch ?? 1517443173;

    // State to trigger re-renders
    const [, setTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000); // Tick every second
        return () => clearInterval(interval);
    }, []);

    // Calculate current time dynamically based on the current real-world timestamp
    const currentMumeTime = getMumeTimeFromEpoch(epoch, Date.now());

    // Preserve era from gameTime if available
    if (gameTime?.era) {
        currentMumeTime.era = gameTime.era;
    }

    return currentMumeTime;
}
