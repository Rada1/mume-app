/**
 * @file MobileHeaderTime.tsx
 * @description Compact MUME clock and sunrise/sunset times in the mobile header.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useMumeTime } from '../../hooks/useMumeTime';
import { getMumeTimeOfDayClass, MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';
import './MobileHeaderTime.css';

export const MobileHeaderTime: FC = () => {
    const { gameTime } = useGame();
    const currentTime = useMumeTime(gameTime);
    const solarTimes = MUME_MONTH_DETAILS[currentTime.month];
    const hour = currentTime.hour ?? 12;
    const minute = currentTime.minute ?? 0;
    const timeOfDayClass = getMumeTimeOfDayClass(currentTime.month, hour, minute);
    const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`;

    return (
        <div className="mobile-header-time" aria-label={`Time ${time}, dawn ${solarTimes?.dawnStr ?? '7 am'}, dusk ${solarTimes?.duskStr ?? '7 pm'}`}>
            <span className={`mobile-header-time-current ${timeOfDayClass}`}>{time}</span>
            <span className="mobile-header-time-solar">dawn {solarTimes?.dawnStr ?? '7 am'} · dusk {solarTimes?.duskStr ?? '7 pm'}</span>
        </div>
    );
};
