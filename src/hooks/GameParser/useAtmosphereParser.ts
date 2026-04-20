/**
 * @file useAtmosphereParser.ts
 * @description Extracts weather, lighting, door sounds, and player posture from game text.
 */

import { useCallback } from 'react';

export interface AtmosphereParserDeps {
    setWeather: (w: string | null) => void;
    setIsFoggy: (f: boolean) => void;
    setLightningEnabled: (l: boolean) => void;
    triggerHaptic?: (ms: number) => void;
    playDoorSound?: (isOpen: boolean) => void;
    setPlayerPosition: (pos: string) => void;
    setSpectatePosition?: (pos: string) => void;
    isSpectateMode?: boolean;
}

export function useAtmosphereParser(deps: AtmosphereParserDeps) {
    const {
        setWeather, setIsFoggy, setLightningEnabled, triggerHaptic,
        playDoorSound, setPlayerPosition, setSpectatePosition, isSpectateMode
    } = deps;

    const parseAtmosphere = useCallback((lower: string, isSnoop: boolean = false) => {
        // --- Weather & Fog ---
        if (lower.includes('it starts to rain') || lower.includes('is raining')) {
            setWeather('rain');
        } else if (lower.includes('starts to snow') || lower.includes('is snowing')) {
            setWeather('snow');
        } else if (lower.includes('rain has stopped') || lower.includes('snow stops') || lower.includes('sky clears')) {
            setWeather(null);
        }

        if (lower.includes('thick fog rolls in')) {
            setIsFoggy(true);
        } else if (lower.includes('fog lifts')) {
            setIsFoggy(false);
        }

        // --- Lightning ---
        if (lower.includes('white flash illuminates the area')) {
            setLightningEnabled(true);
            triggerHaptic?.(100);
            // Lightning is usually a transient flash
            setTimeout(() => setLightningEnabled(false), 500);
        }

        // --- Environmental Sounds ---
        if (lower.includes('clank of a door')) {
            playDoorSound?.(true); // Generic clank implies something opened/closed
        } else if (lower.includes('opens a door')) {
            playDoorSound?.(true);
        } else if (lower.includes('closes a door')) {
            playDoorSound?.(false);
        }

        // --- Posture / Position ---
        const posSetter = (isSpectateMode && isSnoop && setSpectatePosition) ? setSpectatePosition : setPlayerPosition;
        
        if (lower.includes('you sit down') || lower.includes('is now sitting')) {
            posSetter('sitting');
        } else if (lower.includes('you stand up') || lower.includes('is now standing')) {
            posSetter('standing');
        } else if (lower.includes('you lie down') || lower.includes('is now resting')) {
            posSetter('resting');
        } else if (lower.includes('you go to sleep') || lower.includes('is now sleeping')) {
            posSetter('sleeping');
        }
    }, [setWeather, setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, setPlayerPosition, setSpectatePosition, isSpectateMode]);

    return { parseAtmosphere };
}
