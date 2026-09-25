/**
 * @file MapRoomInfoHeader.tsx
 * @description Docked top telemetry in the left map drawer (Option A).
 * Displays room name, zone, and Middle-earth calendar/chronometer (Season, Month, Day, Time).
 */

import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveRoom } from '../../stores/useActiveGameState';
import { useMumeTime } from '../../hooks/useMumeTime';
import { MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';
import { stripAnsiCodes } from '../../utils/ansi';
import './MapRoomInfoHeader.css';

export const MapRoomInfoHeader: FC = () => {
    // --- Logic Section ---
    const { gameState, gameTime } = useGame();
    const { roomName, roomZone } = useActiveRoom();
    const currentTime = useMumeTime(gameTime);

    const isAccount = gameState === 'account';
    const displayRoom = isAccount ? 'Map & Navigation' : (stripAnsiCodes(roomName) || 'Wilderness');
    const displayZone = isAccount ? 'Middle-earth' : stripAnsiCodes(roomZone);

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

    const seasonClass = `season-${monthDetails.season.toLowerCase()}`;

    // --- Render Section ---
    return (
        <div className="map-room-info-header" role="region" aria-label="Room header and calendar">
            <div className="map-terminal-title"><span aria-hidden="true">&gt;</span> map</div>
            {/* Row 1: Room Name and Zone Badge */}
            <div className="map-header-primary-row">
                <span className="map-header-room-name" title={displayRoom}>
                    {displayRoom}
                </span>
                {displayZone && (
                    <span className="map-header-zone-badge" title={`Zone: ${displayZone}`}>
                        {displayZone}
                    </span>
                )}
            </div>

            {/* Row 2: Chronometer & Calendar Ribbon */}
            <div className="map-header-calendar-row">
                <div className="map-header-calendar-left">
                    <span className={`map-header-season-badge ${seasonClass}`}>
                        {monthDetails.season}
                    </span>
                    <span className="map-header-date">
                        {currentTime.day} {currentTime.month}
                        {monthDetails.sindarin && (
                            <span className="map-header-sindarin"> ({monthDetails.sindarin})</span>
                        )}
                    </span>
                </div>
                <div className="map-header-time-box">
                    <span className="map-header-current-time">
                        <span className="map-header-time-label">Time:</span>
                        <span className="map-header-time-value">{formattedTime}</span>
                    </span>
                    <span className="map-header-solar-times">
                        Sunrise {monthDetails.dawnStr} · Sunset {monthDetails.duskStr}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MapRoomInfoHeader;
