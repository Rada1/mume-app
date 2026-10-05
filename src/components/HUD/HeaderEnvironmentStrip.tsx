/**
 * @file HeaderEnvironmentStrip.tsx
 * @description Persistent environment HUD in the client header displaying room title, zone, terrain, weather, lighting, and time.
 */

import React, { FC, memo } from 'react';
import { UtensilsCrossed, Droplets } from 'lucide-react';
import { useActiveRoom } from '../../stores/useActiveGameState';
import { useGame, useVitals } from '../../context/GameContext';
import { useMumeTime } from '../../hooks/useMumeTime';
import { stripAnsiCodes } from '../../utils/ansi';
import {
    getLightingLabel, getLightingIcon,
    getTerrainLabel, getTerrainIcon,
    getWeatherLabel, getWeatherIcon,
    formatMumeTime, getTimeIcon
} from './customPromptHelpers';
import './HeaderEnvironmentStrip.css';

export const HeaderEnvironmentStrip: FC = () => {
    const activeRoom = useActiveRoom();
    const { stats } = useVitals();
    const {
        lighting, currentTerrain, weather, isFoggy, gameTime,
        gameState,
        sessionMode
    } = useGame();
    const currentTime = useMumeTime(gameTime);

    if (gameState === 'account' && sessionMode !== 'replay') return <div className="header-environment-spacer" />;

    const roomName = stripAnsiCodes(activeRoom.roomName);
    const rawZone = stripAnsiCodes(activeRoom.roomZone);
    const cleanZone = rawZone.replace(/^\(+|\)+$/g, '').trim();
    const terrain = currentTerrain || activeRoom.terrain;

    const terrainLabel = stripAnsiCodes(getTerrainLabel(terrain));
    const weatherLabel = stripAnsiCodes(getWeatherLabel(weather));
    const lightingLabel = stripAnsiCodes(getLightingLabel(lighting));
    const timeLabel = stripAnsiCodes(formatMumeTime(currentTime));

    const envItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [];
    if (terrainLabel) envItems.push({ id: 'terrain', label: terrainLabel, icon: getTerrainIcon(terrain) });
    if (weatherLabel) {
        envItems.push({ id: 'weather', label: weatherLabel, icon: getWeatherIcon(weather, isFoggy) });
    } else if (isFoggy) {
        envItems.push({ id: 'weather', label: 'Fog', icon: getWeatherIcon('fog', true) });
    }
    if (lightingLabel) envItems.push({ id: 'lighting', label: lightingLabel, icon: getLightingIcon(lighting) });
    if (timeLabel) envItems.push({ id: 'time', label: timeLabel, icon: getTimeIcon() });

    if (!roomName && envItems.length === 0) {
        return <div className="header-environment-spacer" />;
    }

    return (
        <div className="header-environment-strip">
            <div className="header-environment-card" aria-label="Room and environment status">
                {roomName && (
                    <div className="header-room-info">
                        <span className="header-room-name" title={roomName}>{roomName}</span>
                        {cleanZone && <span className="header-room-zone">({cleanZone})</span>}
                    </div>
                )}

                {roomName && envItems.length > 0 && (
                    <span className="header-env-divider">│</span>
                )}

                {envItems.length > 0 && (
                    <div className="header-env-items">
                        {envItems.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {index > 0 && <span className="header-env-sep">·</span>}
                                <span className="header-env-item">
                                    {item.icon}
                                    <span>{item.label}</span>
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {(stats?.conditions?.hungry || stats?.conditions?.thirsty) && (
                    <div className="header-env-conditions">
                        {stats?.conditions?.hungry && (
                            <span title="Hungry" className="header-env-condition-wrap">
                                <UtensilsCrossed size={10} className="header-env-hungry" />
                            </span>
                        )}
                        {stats?.conditions?.thirsty && (
                            <span title="Thirsty" className="header-env-condition-wrap">
                                <Droplets size={10} className="header-env-thirsty" />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(HeaderEnvironmentStrip);
