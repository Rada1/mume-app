import React from 'react';
import { useGame, useVitals } from '../../context/GameContext';
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
    const { hitFlash, deathStage } = useVitals();

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
