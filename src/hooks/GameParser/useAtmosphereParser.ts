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
    triggerHaptic: (ms: number) => void;
    playDoorSound: (isOpen: boolean) => void;
    setPlayerPosition: (pos: string) => void;
    setSpectatePosition?: (pos: string) => void;
    isSpectateMode?: boolean;
}

export function useAtmosphereParser(deps: AtmosphereParserDeps) {
    const {
        setWeather,
        setIsFoggy,
        setLightningEnabled,
        triggerHaptic,
        playDoorSound,
        setPlayerPosition,
        setSpectatePosition,
        isSpectateMode
    } = deps;

    const parseAtmosphere = useCallback((lower: string, isSnoop?: boolean) => {
        const targetSetter = (isSpectateMode && isSnoop && setSpectatePosition) ? setSpectatePosition : setPlayerPosition;

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

        // Position/Riding state updates from text triggers (handles both local and snoop)
        const isMounting = lower.includes("mounts ") || lower.includes("start riding") || lower.includes("picks up some reins") || lower.includes("pick up some reins");
        const isDismounting = lower.includes("dismounts ") || lower.includes("stop riding");
        const isSitting = lower.includes("sits down") || lower.includes("rests");
        const isSleeping = lower.includes("lies down") || lower.includes("goes to sleep");
        const isStanding = lower.includes("wakes up") || lower.includes("stands up");

        if (isMounting) {
            targetSetter('riding');
        } else if (isDismounting) {
            targetSetter('standing');
        } else if (isSitting) {
            targetSetter('sitting');
        } else if (isSleeping) {
            targetSetter('sleeping');
        } else if (isStanding) {
            targetSetter('standing');
        }

        const stopMovementMsg = lower.includes("alas, you cannot go that way") ||
            lower.includes("there is no exit") ||
            lower.includes("your mount refuses to go there");

        if (stopMovementMsg) {
            triggerHaptic(100);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
        }

        // Door sound triggers (Text-based fallback)
        const isDoorOpen = lower.includes('is opened') || lower.includes('someone opens') || lower.includes('you hear a door open') || lower.includes('you open ') || lower.includes('you unlock and open');
        const isDoorClose = lower.includes('is closed') || lower.includes('someone closes') || lower.includes('you hear a door close') || lower.includes('you close ') || lower.includes('you lock and close');

        if (isDoorOpen) {
            playDoorSound(true);
        } else if (isDoorClose) {
            playDoorSound(false);
        }
    }, [setWeather, setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, setPlayerPosition]);

    return { parseAtmosphere };
}
