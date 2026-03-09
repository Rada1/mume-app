import React from 'react';
import { useGame } from '../../context/GameContext';
import { EnvironmentEffects } from '../Atmosphere/EnvironmentEffects';

export const AtmosphericLayer: React.FC = () => {
    const {
        lighting,
        weather,
        isFoggy,
        inCombat,
        hitFlash,
        lightningEnabled,
        deathStage,
        isImmersionMode
    } = useGame();

    return (
        <EnvironmentEffects
            lighting={lighting}
            weather={weather}
            isFoggy={isFoggy}
            inCombat={inCombat}
            hitFlash={hitFlash}
            lightning={lightningEnabled}
            deathStage={deathStage}
            isImmersionMode={isImmersionMode}
        />
    );
};
