import { CloudFog, Clock } from 'lucide-react';
import { useGame, useVitals, useUI } from '../../context/GameContext';
import { useMumeTime } from '../../hooks/useMumeTime';

interface EnvControlsProps {
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
    isLandscape?: boolean;
}

export const EnvControls: React.FC<EnvControlsProps> = ({ getLightingIcon, getWeatherIcon, isLandscape }) => {
    const { lighting, weather, isFoggy, teleportTargets, viewport, gameTime, gameState } = useGame();
    const { target, setTarget } = useVitals();
    const { setPopoverState } = useUI();
    const currentTime = useMumeTime(gameTime);
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
            {((lighting !== 'none' || weather !== 'none' || isFoggy) && (gameState === 'playing' || !viewport.isMobile)) && (
                <div
                    className="status-indicator"
                    style={{ color: 'var(--text-primary)', gap: 4, padding: '4px 6px' }}
                    title="Lighting/Weather Status"
                >
                    {getLightingIcon()}
                    {getWeatherIcon()}
                    {isFoggy && <CloudFog size={14} className="text-gray-400" />}
                    <span style={{ fontSize: '0.75rem' }}>
                        {lighting && lighting !== 'none' ? lighting.toUpperCase() : ''}
                        {weather && weather !== 'none' && weather !== 'clear' ? ` | ${weather.toUpperCase().replace('-', ' ')}` : ''}
                        {isFoggy ? ' | FOG' : ''}
                    </span>
                </div>
            )}
            {currentTime && (
                <div
                    className="status-indicator"
                    style={{ color: 'var(--text-primary)', gap: 4, padding: '4px 6px' }}
                    title={`${currentTime.weekday}, ${currentTime.day} of ${currentTime.month}, Year ${currentTime.year} (${currentTime.era})`}
                >
                    <Clock size={14} className="text-gray-400" />
                    <span style={{ fontSize: '0.75rem' }}>
                        {currentTime.hour === 0 ? '12' : (currentTime.hour > 12 ? currentTime.hour - 12 : currentTime.hour)}
                        :{currentTime.minute < 10 ? `0${currentTime.minute}` : currentTime.minute}
                        {currentTime.hour >= 12 ? ' PM' : ' AM'}
                        {!viewport.isMobile && ` | ${currentTime.weekday.substring(0, 3)}`}
                        {!viewport.isMobile && ` ${currentTime.day}`}
                    </span>
                </div>
            )}

        </div>
    );
};
