/**
 * @file useAtmosphereParser.ts
 * @description Extracts weather, lighting, door sounds, and player posture from game text.
 */

import { useCallback } from 'react';

export interface AtmosphereParserDeps {
    setWeather: (w: string | null) => void;
    setIsFoggy: (f: boolean) => void;
    setLightningEnabled: (l: boolean) => void;
    setSpectateWeather?: (w: string | null) => void;
    setSpectateIsFoggy?: (f: boolean) => void;
    setSpectateLightningEnabled?: (l: boolean) => void;
    triggerHaptic?: (ms: number) => void;
    playDoorSound?: (isOpen: boolean) => void;
    playRideSound?: () => void;
    playStopRidingSound?: () => void;
    setPlayerPosition: (pos: string) => void;
    setSpectatePosition?: (pos: string) => void;
    setIsRiding?: (val: boolean) => void;
    isSpectateMode?: boolean;
}

export function useAtmosphereParser(deps: AtmosphereParserDeps) {
    const {
        setIsFoggy, setLightningEnabled,
        setSpectateIsFoggy, setSpectateLightningEnabled,
        triggerHaptic, playDoorSound, playRideSound, playStopRidingSound,
        setPlayerPosition, setSpectatePosition, setIsRiding, isSpectateMode
    } = deps;

    const parseAtmosphere = useCallback((lower: string, isSnoop: boolean = false) => {
        // --- Logic Selection ---
        const fogSetter = (isSnoop && setSpectateIsFoggy) ? setSpectateIsFoggy : setIsFoggy;
        const lightningSetter = (isSnoop && setSpectateLightningEnabled) ? setSpectateLightningEnabled : setLightningEnabled;

        // --- Fog ---
        // Weather visuals are driven by GMCP only; text weather lines are log text.
        if (lower.includes('thick fog rolls in')) {
            fogSetter(true);
        } else if (lower.includes('fog lifts')) {
            fogSetter(false);
        }

        // --- Lightning ---
        if (lower.includes('white flash illuminates the area')) {
            lightningSetter(true);
            triggerHaptic?.(100);
            // Lightning is usually a transient flash
            setTimeout(() => lightningSetter(false), 500);
        }

        // --- Environmental Sounds ---
        if (lower.includes('clank of a door')) {
            playDoorSound?.(true); // Generic clank implies something opened/closed
        } else if (lower.includes('opens a door')) {
            playDoorSound?.(true);
        } else if (lower.includes('closes a door')) {
            playDoorSound?.(false);
        }

        // --- Posture / Position / Riding ---
        const posSetter = (isSnoop && setSpectatePosition) ? setSpectatePosition : setPlayerPosition;
        
        const isMounting = lower.includes("you mount ") || lower.includes("mounts ") || lower.includes("start riding") || lower.includes("picks up some reins") || lower.includes("pick up some reins");
        const isDismounting = lower.includes("you dismount") || lower.includes("dismounts ") || lower.includes("stop riding");

        if (isMounting) {
            setIsRiding?.(true);
            posSetter('riding');
            playRideSound?.();
        } else if (isDismounting) {
            setIsRiding?.(false);
            posSetter('standing');
            playStopRidingSound?.();
        } else if (lower.includes('you sit down') || lower.includes('is now sitting')) {
            posSetter('sitting');
        } else if (lower.includes('you stand up') || lower.includes('is now standing')) {
            posSetter('standing');
        } else if (lower.includes('you lie down') || lower.includes('is now resting')) {
            posSetter('resting');
        } else if (lower.includes('you go to sleep') || lower.includes('is now sleeping')) {
            posSetter('sleeping');
        }
    }, [setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, playRideSound, playStopRidingSound, setPlayerPosition, setSpectatePosition, setIsRiding, isSpectateMode]);

    return { parseAtmosphere };
}
