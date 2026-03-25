/**
 * @file useAtmosphereParser.ts
 * @description Modular hook for atmospheric, environmental, and state-change text parsing.
 * Part of the GameParser system. Handles weather, riding, failures, and haptics.
 */

import { useCallback } from 'react';
import { WeatherType } from '../../types';

export interface AtmosphereParserDeps {
    setWeather: (w: WeatherType) => void;
    setIsFoggy: (f: boolean) => void;
    setLightningEnabled: (f: boolean) => void;
    setRumble: (val: boolean) => void;
    triggerHaptic: (ms: number) => void;
    playDoorSound: (isOpen: boolean) => void;
    setPlayerPosition: (pos: string) => void;
}

export function useAtmosphereParser(deps: AtmosphereParserDeps) {
    const {
        setWeather,
        setIsFoggy,
        setLightningEnabled,
        setRumble,
        triggerHaptic,
        playDoorSound,
        setPlayerPosition
    } = deps;

    const parseAtmosphere = useCallback((lower: string) => {
        if (lower.includes("starts to rain") || lower.includes("it is raining")) setWeather(lower.includes("heavily") ? 'heavy-rain' : 'rain');
        if (lower.includes("starts to snow") || lower.includes("it is snowing")) setWeather('snow');
        if (lower.includes("rain stops") || lower.includes("snow stops") || lower.includes("clouds disappear")) setWeather('none');
        
        if (lower.includes("starts to fog") || lower.includes("it is foggy") || lower.includes("fog has thickened") || lower.includes("thick fog covers") || lower.includes("disappears into the fog") || (lower.includes("fog") && lower.includes("thickens"))) setIsFoggy(true);
        if (lower.includes("fog thins") || lower.includes("fog dissipates") || lower.includes("fog has lifted") || lower.includes("fog disappears")) setIsFoggy(false);


        if (lower.includes("flash of lightning") || lower.includes("lightning illuminates")) {
            setLightningEnabled(true);
            setTimeout(() => setLightningEnabled(false), 200);
            setTimeout(() => setLightningEnabled(true), 350);
            setTimeout(() => setLightningEnabled(false), 450);
            triggerHaptic(50);
        }

        // Riding state updates from text triggers
        if (lower.includes("you mount ") || lower.includes("start riding") || lower.includes("you pick up") && lower.includes("reins")) {
            setPlayerPosition('riding');
        }
        if (lower.includes("you dismount ") || lower.includes("stop riding")) {
            setPlayerPosition('standing');
        }

        const stopMovementMsg = lower.includes("alas, you cannot go that way") ||
            lower.includes("there is no exit") ||
            lower.includes("your mount refuses to go there");

        if (stopMovementMsg) {
            setRumble(true);
            triggerHaptic(100);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
            setTimeout(() => setRumble(false), 300);
        }
    }, [setWeather, setIsFoggy, setLightningEnabled, setRumble, triggerHaptic, playDoorSound, setPlayerPosition]);

    return { parseAtmosphere };
}
