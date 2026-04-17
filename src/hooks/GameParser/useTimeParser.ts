/**
 * @file useTimeParser.ts
 * @description Specialized hook for parsing MUME's 'time' command output.
 */

import { useCallback } from 'react';
import { MumeTime } from '../../types';

interface TimeParserDeps {
    setGameTime: (time: MumeTime | null) => void;
    gameTime: MumeTime | null;
}

export function useTimeParser({ setGameTime, gameTime }: TimeParserDeps) {
    const parseTimeLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        
        // 1. Full time command output: "1 pm on Highday, the 6th of Foreyule, year 3004 of the Third Age."
        const timeRegex = /(\d+|noon|midnight)\s*(am|pm)?\s*on\s*(\w+),\s*the\s*(\d+)(?:st|nd|rd|th)\s*of\s*(\w+),\s*year\s*(\d+)\s*of\s*the\s*(.+)\./i;
        
        // 2. Look clock output: "The current time is 9:38 pm."
        const clockRegex = /The current time is (\d+):(\d+)\s*(am|pm)\./i;
        
        const match = cleanLine.match(timeRegex);
        if (match) {
            const [_, hourRaw, ampm, weekday, day, month, year, era] = match;
            
            let hour = 0;
            if (hourRaw.toLowerCase() === 'noon') {
                hour = 12;
            } else if (hourRaw.toLowerCase() === 'midnight') {
                hour = 0;
            } else {
                hour = parseInt(hourRaw);
                if (ampm?.toLowerCase() === 'pm' && hour < 12) hour += 12;
                if (ampm?.toLowerCase() === 'am' && hour === 12) hour = 0;
            }

            const mumeTime: MumeTime = {
                hour,
                minute: 0,
                day: parseInt(day),
                month,
                year: parseInt(year),
                weekday,
                era,
                lastSyncRealTime: Date.now()
            };

            console.log('[TimeParser] Parsed Mume Time:', mumeTime);
            setGameTime(mumeTime);
            return true;
        }

        const clockMatch = cleanLine.match(clockRegex);
        if (clockMatch) {
            const [_, hStr, mStr, ampm] = clockMatch;
            let hour = parseInt(hStr);
            const minute = parseInt(mStr);
            
            if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
            if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
            
            if (gameTime) {
                const updatedTime: MumeTime = {
                    ...gameTime,
                    hour,
                    minute,
                    lastSyncRealTime: Date.now()
                };
                console.log('[TimeParser] Updated Mume Time from clock:', updatedTime);
                setGameTime(updatedTime);
            } else {
                // Initial sync if we only have the clock
                const initialTime: MumeTime = {
                    hour,
                    minute,
                    day: 1,
                    month: 'Unknown',
                    year: 0,
                    weekday: 'Unknown',
                    era: 'Third Age',
                    lastSyncRealTime: Date.now()
                };
                setGameTime(initialTime);
            }
            return true;
        }

        return false;
    }, [setGameTime, gameTime]);

    return { parseTimeLine };
}
