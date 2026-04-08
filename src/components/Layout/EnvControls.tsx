import React from 'react';
import { CloudFog, Swords, Crosshair } from 'lucide-react';
import { useGame, useVitals, useUI } from '../../context/GameContext';

interface EnvControlsProps {
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
    isLandscape?: boolean;
}

export const EnvControls: React.FC<EnvControlsProps> = ({ getLightingIcon, getWeatherIcon, isLandscape }) => {
    const { lighting, weather, isFoggy, inCombat, teleportTargets, viewport, isNewbieMode } = useGame();
    const { target, setTarget } = useVitals();
    const { setPopoverState } = useUI();
    const teleportTargetsCount = teleportTargets.length;
    const onClearTarget = () => setTarget(null);
    const onTeleportClick = () => {
        setPopoverState({
            type: 'teleport-manage',
            setId: 'teleport',
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });
    };

    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0, justifyContent: 'center' }}>
            {(lighting !== 'none' || weather !== 'none' || isFoggy) && !isNewbieMode && (
                <div
                    className="status-indicator"
                    style={{ color: 'var(--text-primary)', gap: 4, padding: '4px 6px' }}
                    title="Lighting/Weather Status"
                >
                    {getLightingIcon()}
                    {getWeatherIcon()}
                    {isFoggy && <CloudFog size={14} className="text-gray-400" />}
                    {!viewport.isMobile && (
                        <span style={{ fontSize: '0.75rem' }}>
                            {lighting && lighting !== 'none' ? lighting.toUpperCase() : ''}
                            {weather && weather !== 'none' && weather !== 'clear' ? ` | ${weather.toUpperCase().replace('-', ' ')}` : ''}
                            {isFoggy ? ' | FOG' : ''}
                        </span>
                    )}
                </div>
            )}
            {inCombat && (
                <div
                    className="status-indicator"
                    style={{ color: 'var(--ansi-red, #ef4444)', gap: 4, padding: '4px 6px', animation: 'combat-pulse 2s ease-in-out infinite' }}
                    title="In Combat"
                >
                    <Swords size={12} />
                    {!viewport.isMobile && <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>COMBAT</span>}
                </div>
            )}
        </div>
    );
};
