import React from 'react';
import { CloudFog, Swords, Crosshair } from 'lucide-react';
import { useGame } from '../../context/GameContext';

interface EnvControlsProps {
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
    isLandscape?: boolean;
}

export const EnvControls: React.FC<EnvControlsProps> = ({ getLightingIcon, getWeatherIcon, isLandscape }) => {
    const { lighting, weather, isFoggy, inCombat, target, setTarget, teleportTargets, viewport, setPopoverState } = useGame();
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
            {(lighting !== 'none' || weather !== 'none' || isFoggy) && (
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
                            {lighting !== 'none' ? lighting.toUpperCase() : ''}
                            {weather !== 'none' && weather !== 'clear' ? ` | ${weather.toUpperCase().replace('-', ' ')}` : ''}
                            {isFoggy ? ' | FOG' : ''}
                        </span>
                    )}
                </div>
            )}
            {inCombat && (
                <div
                    className="status-indicator"
                    style={{ color: 'var(--ansi-red, #ef4444)', gap: 4, padding: '4px 6px', animation: 'combat-pulse 1s ease-in-out infinite' }}
                    title="In Combat"
                >
                    <Swords size={12} />
                    {!viewport.isMobile && <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>COMBAT</span>}
                </div>
            )}
            <div
                className="status-indicator"
                style={{
                    color: target ? 'var(--map-accent)' : 'var(--text-faded)',
                    gap: 4, padding: '4px 6px',
                    cursor: 'pointer',
                    opacity: target ? 1 : 0.6,
                    border: target ? '1px solid var(--map-accent)' : '1px solid var(--border-color)',
                    maxWidth: viewport.isMobile ? '80px' : 'none',
                    overflow: 'hidden'
                }}
                title={target ? "Current Target (Click to clear)" : "No Target"}
                onClick={() => target && onClearTarget && onClearTarget()}
            >
                <Crosshair size={12} />
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {target ? target.toUpperCase() : (viewport.isMobile ? '' : 'NO TARGET')}
                </span>
            </div>

            <div
                className="status-indicator"
                style={{
                    color: teleportTargetsCount && teleportTargetsCount > 0 ? 'var(--accent)' : 'var(--text-faded)',
                    gap: 4, padding: '4px 6px',
                    cursor: 'pointer',
                    opacity: teleportTargetsCount && teleportTargetsCount > 0 ? 1 : 0.6,
                    border: '1px solid var(--border-color)'
                }}
                title="Stored Teleport Rooms"
                onClick={() => onTeleportClick && onTeleportClick()}
            >
                <Crosshair size={12} style={{ transform: 'rotate(45deg)' }} />
                <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{teleportTargetsCount || 0}</span>
            </div>
        </div>
    );
};
