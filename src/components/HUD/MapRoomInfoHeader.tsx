/**
 * @file MapRoomInfoHeader.tsx
 * @description Compact map environmental telemetry header for the desktop map drawer.
 * Displays time, dawn/dusk solar hours, weather, season, date, and month in a clean,
 * monotone terminal style matching the MUME client aesthetic.
 */

// --- Logic Section ---
import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useMumeTime } from '../../hooks/useMumeTime';
import { MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';
import { useSettingsStore } from '../../stores/useSettingsStore';
import './MapRoomInfoHeader.css';

export const MapRoomInfoHeader: FC = () => {
    const hideMapHeaderFooter = useSettingsStore(s => s.hideMapHeaderFooter);
    const { gameTime, viewport } = useGame();
    const { weather } = useActiveVitals();
    const currentTime = useMumeTime(gameTime);

    const monthDetails = MUME_MONTH_DETAILS[currentTime.month] || {
        season: 'Spring' as const,
        sindarin: '',
        dawnStr: '7 am',
        duskStr: '7 pm',
    };

    const hour = currentTime.hour ?? 12;
    const minute = currentTime.minute ?? 0;
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
    const formattedTime = `${displayHour}:${displayMinute} ${ampm}`;

    const formattedWeather = weather ? weather.toLowerCase() : 'none';

    // --- Render Section ---
    if (hideMapHeaderFooter || viewport?.isMobile) return null;

    return (
        <div className="map-room-info-header" role="region" aria-label="Map environmental telemetry">
            {/* Row 1: Time, Dawn/Dusk, and Weather */}
            <div className="map-header-telemetry-row">
                <div className="map-header-solar-group">
                    <span className="map-telemetry-item">
                        <span className="map-header-label">time:</span>
                        <strong className="map-header-val time">{formattedTime}</strong>
                    </span>
                    <span className="map-telemetry-item map-solar-times">
                        <span className="map-header-label">dawn:</span>
                        <span className="map-header-val">{monthDetails.dawnStr}</span>
                        <span className="map-solar-sep">·</span>
                        <span className="map-header-label">dusk:</span>
                        <span className="map-header-val">{monthDetails.duskStr}</span>
                    </span>
                </div>
                <div className="map-header-weather-group">
                    <span className="map-telemetry-item">
                        <span className="map-header-label">weather:</span>
                        <strong className="map-header-val weather">{formattedWeather}</strong>
                    </span>
                </div>
            </div>

            {/* Row 2: Season, Date, Month (Sindarin) */}
            <div className="map-header-calendar-row">
                <div className="map-header-season-group">
                    <strong className="map-header-season">{monthDetails.season}</strong>
                    <span className="map-header-date">{currentTime.day} {currentTime.month}</span>
                </div>
                {monthDetails.sindarin && (
                    <span className="map-header-sindarin">{monthDetails.sindarin}</span>
                )}
            </div>
        </div>
    );
};

export default MapRoomInfoHeader;
