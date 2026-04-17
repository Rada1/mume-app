/**
 * @file useMumeTime.ts
 * @description Hook that provides the current MUME game time by advancing it based on real-time elapsed.
 */

import { useMemo } from 'react';
import { MumeTime } from '../types';

export function useMumeTime(gameTime: MumeTime | null) {
    const currentTime = useMemo(() => {
        if (!gameTime) return null;

        const realTimeElapsedMs = Date.now() - gameTime.lastSyncRealTime;
        const mumeHoursElapsed = Math.floor(realTimeElapsedMs / 60000); // 1 MUME hour = 1 real minute

        if (mumeHoursElapsed === 0) return gameTime;

        // Clone and advance
        let { hour, day, month, year, weekday } = gameTime;
        
        const weekdays = ['Sterday', 'Sunday', 'Monday', 'Trewsday', 'Hevenly Day', 'Mersday', 'Highday'];
        const months = ['Afteryule', 'Solmath', 'Rethe', 'Astron', 'Thrimidge', 'Forelithe', 'Afterlithe', 'Wedmath', 'Halimath', 'Winterfilth', 'Blotmath', 'Foreyule'];

        let weekdayIndex = weekdays.indexOf(weekday);
        let monthIndex = months.indexOf(month);

        hour += mumeHoursElapsed;
        while (hour >= 24) {
            hour -= 24;
            day++;
            if (weekdayIndex !== -1) {
                weekdayIndex = (weekdayIndex + 1) % 7;
                weekday = weekdays[weekdayIndex];
            }
            if (day > 30) {
                day = 1;
                if (monthIndex !== -1) {
                    monthIndex = (monthIndex + 1) % 12;
                    month = months[monthIndex];
                    if (monthIndex === 0) {
                        year++;
                    }
                }
            }
        }

        return {
            ...gameTime,
            hour,
            day,
            month,
            year,
            weekday
        };
    }, [gameTime]);

    return currentTime;
}
