/**
 * @file MapRoomInfoFooter.tsx
 * @description Docked bottom room telemetry in the left map drawer.
 * Displays exits, terrain, lighting, and weather.
 */

import React, { FC } from 'react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals, useActiveRoomExits } from '../../stores/useActiveGameState';
import { useMumeTime } from '../../hooks/useMumeTime';
import { MUME_MONTH_DETAILS } from '../../utils/mumeTimeUtils';
import './MapRoomInfoFooter.css';

export const MapRoomInfoFooter: FC = () => {
    // --- Logic Section ---
    const { currentTerrain, gameTime } = useGame();
    const { lighting, weather } = useActiveVitals();
    const { exits } = useActiveRoomExits();
    const currentTime = useMumeTime(gameTime);
    const monthDetails = MUME_MONTH_DETAILS[currentTime.month];

    const formattedExits = exits && exits.length > 0
        ? exits.map(e => e.toUpperCase()).join(', ')
        : '—';

    const formattedTerrain = currentTerrain
        ? currentTerrain.charAt(0).toUpperCase() + currentTerrain.slice(1)
        : '—';

    const formattedLighting = lighting
        ? lighting.charAt(0).toUpperCase() + lighting.slice(1)
        : '—';

    const lightingTooltip = monthDetails
        ? `${formattedLighting} (Dawn ${monthDetails.dawnStr}, Dusk ${monthDetails.duskStr})`
        : formattedLighting;

    const formattedWeather = weather
        ? weather.charAt(0).toUpperCase() + weather.slice(1)
        : '—';

    // --- Render Section ---
    return (
        <div className="map-room-info-footer" role="region" aria-label="Room details">
            <div className="map-room-info-item">
                <span className="map-room-info-label">Exits:</span>
                <strong className="map-room-info-value exits" title={formattedExits}>{formattedExits}</strong>
            </div>
            <div className="map-room-info-item">
                <span className="map-room-info-label">Terrain:</span>
                <strong className="map-room-info-value terrain" title={formattedTerrain}>{formattedTerrain}</strong>
            </div>
            <div className="map-room-info-item">
                <span className="map-room-info-label">Light:</span>
                <strong className="map-room-info-value lighting" title={lightingTooltip}>{formattedLighting}</strong>
            </div>
            <div className="map-room-info-item">
                <span className="map-room-info-label">Weather:</span>
                <strong className="map-room-info-value weather" title={formattedWeather}>{formattedWeather}</strong>
            </div>
        </div>
    );
};

export default MapRoomInfoFooter;
