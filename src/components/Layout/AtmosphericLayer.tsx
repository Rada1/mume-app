import React from 'react';
import { useGame } from '../../context/GameContext';
import { EnvironmentEffects } from '../Atmosphere/EnvironmentEffects';

export const AtmosphericLayer: React.FC = () => {
    const {
        lighting,
        weather,
        isFoggy,
        inCombat,
        lightningEnabled,
        isImmersionMode
    } = useGame();

    return (
        <EnvironmentEffects
            lighting={lighting}
            weather={weather}
            isFoggy={isFoggy}
            lightning={lightningEnabled}
            isImmersionMode={isImmersionMode}
        />
    );
};
