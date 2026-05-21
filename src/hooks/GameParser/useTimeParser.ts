/**
 * @file useTimeParser.ts
 * @description Specialized hook for parsing MUME's 'time' command output.
 */

import { useCallback } from 'react';
import { MumeTime } from '../../types';
import { dateToMumeMinutes, getMumeTimeFromEpoch, MUME_MONTHS } from '../../utils/mumeTimeUtils';

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

            const monthIndex = MUME_MONTHS.indexOf(month);
            const mumeMinutes = dateToMumeMinutes(parseInt(year), monthIndex >= 0 ? monthIndex : 0, parseInt(day), hour, 0);
            const mumeStartEpoch = Math.floor(Date.now() / 1000) - mumeMinutes;

            const mumeTime: MumeTime = getMumeTimeFromEpoch(mumeStartEpoch, Date.now());
            mumeTime.era = era;

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
                const monthIndex = MUME_MONTHS.indexOf(gameTime.month);
                const mumeMinutes = dateToMumeMinutes(gameTime.year, monthIndex >= 0 ? monthIndex : 0, gameTime.day, hour, minute);
                const mumeStartEpoch = Math.floor(Date.now() / 1000) - mumeMinutes;
                
                const updatedTime: MumeTime = getMumeTimeFromEpoch(mumeStartEpoch, Date.now());
                if (gameTime.era) updatedTime.era = gameTime.era;

                console.log('[TimeParser] Calibrated Mume Time from clock:', updatedTime);
                setGameTime(updatedTime);
            } else {
                // Initial sync if we only have the clock
                // We default to starting epoch 1517443173 to get the day/month/year
                const defaultEpoch = 1517443173;
                const baseTime = getMumeTimeFromEpoch(defaultEpoch, Date.now());
                
                // Now perform a calibration using the newly derived day/month/year and the parsed hour/minute
                const monthIndex = MUME_MONTHS.indexOf(baseTime.month);
                const mumeMinutes = dateToMumeMinutes(baseTime.year, monthIndex >= 0 ? monthIndex : 0, baseTime.day, hour, minute);
                const mumeStartEpoch = Math.floor(Date.now() / 1000) - mumeMinutes;
                
                const updatedTime: MumeTime = getMumeTimeFromEpoch(mumeStartEpoch, Date.now());
                console.log('[TimeParser] Initial Mume Time from clock (calibrated):', updatedTime);
                setGameTime(updatedTime);
            }
            return true;
        }

        return false;
    }, [setGameTime, gameTime]);

    return { parseTimeLine };
}
