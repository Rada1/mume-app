/**
 * @file MobileHeaderTime.tsx
 * @description Compact MUME clock and sunrise/sunset times in the mobile header.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useMumeTime } from '../../hooks/useMumeTime';
import { getMumeTimeOfDayClass, getNextSolarEventLabel, MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';
import './MobileHeaderTime.css';
import { getWeatherLabel } from './customPromptHelpers';

export const MobileHeaderTime: FC<{ expanded?: boolean; showTime?: boolean }> = ({ expanded = false, showTime = true }) => {
    const { gameTime, isFoggy } = useGame();
    const { weather } = useActiveVitals();
    const weatherLabel = [getWeatherLabel(weather) || (isFoggy ? '' : 'None'), isFoggy ? 'Fog' : ''].filter(Boolean).join(' · ');
    const currentTime = useMumeTime(gameTime);
    const solarTimes = MUME_MONTH_DETAILS[currentTime.month];
    const hour = currentTime.hour ?? 12;
    const minute = currentTime.minute ?? 0;
    const timeOfDayClass = getMumeTimeOfDayClass(currentTime.month, hour, minute);
    const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`;
    const solarLabel = expanded
        ? `dawn ${solarTimes?.dawnStr ?? '7 am'} · dusk ${solarTimes?.duskStr ?? '7 pm'}`
        : getNextSolarEventLabel(currentTime.month, hour, minute);

    return (
        <div className="mobile-header-time" aria-label={expanded ? undefined : `Time ${time}, ${solarLabel}, weather ${weatherLabel}`}>
            {showTime && <span className={`mobile-header-time-current ${timeOfDayClass}`}>{time}</span>}
            {expanded && <>
                <span className="client-time-calendar">{currentTime.weekday}, {currentTime.day} {currentTime.month}</span>
                <span className="client-time-weekday">{solarTimes?.season} · {currentTime.year} {currentTime.era}</span>
            </>}
            <span className="mobile-header-time-solar">{solarLabel}</span>
            {!expanded && <span className="mobile-header-time-weather" title={`Weather: ${weatherLabel}`}>{weatherLabel}</span>}
        </div>
    );
};
