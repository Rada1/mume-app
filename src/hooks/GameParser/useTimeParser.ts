/**
 * @file useTimeParser.ts
 * @description Specialized hook for parsing MUME's 'time' command output.
 */

import { useCallback } from 'react';
import { MumeTime } from '../../types';
import { dateToMumeMinutes, getMumeTimeFromEpoch, MUME_MONTHS, MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';

// --- Logic Section: Calendar Line Parsing ---

const normalizeCalendarName = (value: string): string =>
    value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const findMonthIndex = (month: string): number => {
    const normalizedMonth = normalizeCalendarName(month);
    const westronIndex = MUME_MONTHS.findIndex(candidate => normalizeCalendarName(candidate) === normalizedMonth);
    if (westronIndex >= 0) return westronIndex;

    return MUME_MONTHS.findIndex(candidate =>
        normalizeCalendarName(MUME_MONTH_DETAILS[candidate].sindarin) === normalizedMonth
    );
};

interface TimeParserDeps {
    setGameTime: (time: MumeTime | null) => void;
    gameTime: MumeTime | null;
}

export function useTimeParser({ setGameTime, gameTime }: TimeParserDeps) {
    const parseTimeLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
        
        // 1. Full time command output, including MMapper's minute precision format.
        const timeRegex = /(\d+|noon|midnight)(?::(\d{2}))?\s*(am|pm)?\s*on\s*([^,]+),\s*the\s*(\d+)(?:st|nd|rd|th)\s+of\s*(\w+),\s*year\s*(\d+)\s*of\s*the\s*(.+)\./i;

        // 2. Indoor `time` output reports the calendar date without a game-clock hour.
        const calendarDateRegex = /^(?:[^,]+,\s*)?the\s*(\d+)(?:st|nd|rd|th)\s+of\s+(\w+),\s*year\s*(\d+)\s+of\s+the\s+(.+?)\.?$/i;
        
        // 3. Look clock output: "The current time is 9:38 pm."
        const clockRegex = /The current time is (\d+):(\d+)\s*(am|pm)\./i;
        
        const match = cleanLine.match(timeRegex);
        if (match) {
            const [_, hourRaw, minuteRaw, ampm, weekday, day, month, year, era] = match;
            
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
            const minute = minuteRaw ? parseInt(minuteRaw) : 0;

            const monthIndex = findMonthIndex(month);
            if (monthIndex < 0) return false;

            const now = Date.now();
            const mumeMinutes = dateToMumeMinutes(parseInt(year), monthIndex, parseInt(day), hour, minute);
            const mumeStartEpoch = Math.floor(now / 1000) - mumeMinutes;

            const mumeTime: MumeTime = getMumeTimeFromEpoch(mumeStartEpoch, now);
            mumeTime.era = era;

            console.log('[TimeParser] Parsed Mume Time:', mumeTime);
            setGameTime(mumeTime);
            return true;
        }

        const calendarDateMatch = cleanLine.match(calendarDateRegex);
        if (calendarDateMatch) {
            const [, day, month, year, era] = calendarDateMatch;
            const monthIndex = findMonthIndex(month);
            if (monthIndex < 0) return false;

            const now = Date.now();
            const currentClock = gameTime?.mumeStartEpoch !== undefined
                ? getMumeTimeFromEpoch(gameTime.mumeStartEpoch, now)
                : gameTime ?? getMumeTimeFromEpoch(1517443173, now);
            const hour = currentClock?.hour ?? 0;
            const minute = currentClock?.minute ?? 0;
            const mumeMinutes = dateToMumeMinutes(parseInt(year), monthIndex, parseInt(day), hour, minute);
            const mumeStartEpoch = Math.floor(now / 1000) - mumeMinutes;
            const mumeTime = getMumeTimeFromEpoch(mumeStartEpoch, now);
            mumeTime.era = era.trim();

            console.log('[TimeParser] Parsed Mume Calendar Date:', mumeTime);
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
                const monthIndex = findMonthIndex(gameTime.month);
                if (monthIndex < 0) return false;
                const now = Date.now();
                const mumeMinutes = dateToMumeMinutes(gameTime.year, monthIndex, gameTime.day, hour, minute);
                const mumeStartEpoch = Math.floor(now / 1000) - mumeMinutes;
                
                const updatedTime: MumeTime = getMumeTimeFromEpoch(mumeStartEpoch, now);
                if (gameTime.era) updatedTime.era = gameTime.era;

                console.log('[TimeParser] Calibrated Mume Time from clock:', updatedTime);
                setGameTime(updatedTime);
            } else {
                // Initial sync if we only have the clock
                // We default to starting epoch 1517443173 to get the day/month/year
                const defaultEpoch = 1517443173;
                const baseTime = getMumeTimeFromEpoch(defaultEpoch, Date.now());
                
                // Now perform a calibration using the newly derived day/month/year and the parsed hour/minute
                const monthIndex = findMonthIndex(baseTime.month);
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
