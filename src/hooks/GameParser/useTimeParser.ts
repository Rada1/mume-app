/**
 * @file useTimeParser.ts
 * @description Specialized hook for parsing MUME's 'time' command output.
 */

import { useCallback } from 'react';
import { MumeTime } from '../../types';

interface TimeParserDeps {
    setGameTime: (time: MumeTime | null) => void;
}

export function useTimeParser({ setGameTime }: TimeParserDeps) {
    const parseTimeLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        
        // Regex for: "1 pm on Highday, the 6th of Foreyule, year 3004 of the Third Age."
        // Also handles: "noon on Sterday, the 1st of Rethe..."
        // Also handles: "midnight on Sunday, the 30th of Blotmath..."
        const timeRegex = /(\d+|noon|midnight)\s*(am|pm)?\s*on\s*(\w+),\s*the\s*(\d+)(?:st|nd|rd|th)\s*of\s*(\w+),\s*year\s*(\d+)\s*of\s*the\s*(.+)\./i;
        
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

        return false;
    }, [setGameTime]);

    return { parseTimeLine };
}
