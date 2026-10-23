/** @file useEnvironmentTransitions.ts -- Projects one sky transition into light and weather layers. */
import type { EnvironmentTransitionOptions, EnvironmentTransitionResult } from '../types';
import { useRef } from 'react';
import type { LightingType } from '../types';
import { useOutdoorTwilight } from './useOutdoorTwilight';
import { getSceneStarsOpacity, getTwilightSceneLayers } from '../utils/twilightSceneLayers';
import { useEnvironmentSceneTransition } from './useEnvironmentSceneTransition';
import { getVignetteWeatherVariant } from '../utils/environmentWeatherAppearance';

// --- Shared Lighting and Weather Snapshots ---
export const useEnvironmentTransitions = ({
    lighting, weather, isOutdoor, isIndoor, isNight, isVignetteReady = true, gameTime, blocksSky = false,
}: EnvironmentTransitionOptions): EnvironmentTransitionResult => {
    const nightLighting = useRef<LightingType>('dark');
    if (isOutdoor && !isIndoor && (lighting === 'moon' || lighting === 'dark')) nightLighting.current = lighting;
    const twilight = useOutdoorTwilight(gameTime, true, true);
    const transition = useEnvironmentSceneTransition({ lighting, weather, isOutdoor, isIndoor, isNight, isVignetteReady, blocksSky,
        nightLighting: nightLighting.current });
    const scenes = getTwilightSceneLayers(transition.layers, twilight, nightLighting.current);
    const previous = transition.previous;
    const lightingChanged = previous && (
        previous.lighting !== lighting || Boolean(previous.blocksSky) !== blocksSky || (lighting === 'dark' && previous.isIndoor !== isIndoor)
        || getVignetteWeatherVariant(previous.lighting, previous.weather) !== getVignetteWeatherVariant(lighting, weather)
    );
    const weatherChanged = previous && (
        previous.weather !== weather || previous.lighting !== lighting || previous.isIndoor !== isIndoor
    );
    return {
        starsOpacity: getSceneStarsOpacity(scenes),
        lightingTransition: {
            scenes,
            progress: lightingChanged ? transition.progress : 1,
            previousLighting: lightingChanged ? previous.lighting : null,
            previousIsIndoor: lightingChanged ? previous.isIndoor : false,
            previousIsNight: lightingChanged ? previous.isNight : false,
            previousWeather: lightingChanged ? previous.weather : null,
            isFading: Boolean(lightingChanged && transition.progress > 0),
        },
        weatherTransition: {
            scenes,
            current: weather, previous: weatherChanged ? previous.weather : null,
            currentLighting: lighting, previousLighting: weatherChanged ? previous.lighting : null,
            currentIsIndoor: isIndoor, previousIsIndoor: weatherChanged ? previous.isIndoor : false,
            progress: weatherChanged ? transition.progress : 1,
            isFading: Boolean(weatherChanged && transition.progress > 0),
        },
    };
};
