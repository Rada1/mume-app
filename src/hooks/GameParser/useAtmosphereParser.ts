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
    playEffect?: (name: string, options?: { pitch?: number; skipJitter?: boolean }) => void;
    setPlayerPosition: (pos: string) => void;
    setSpectatePosition?: (pos: string) => void;
    setIsRiding?: (val: boolean) => void;
    refreshCombatStats?: () => void;
    isSpectateMode?: boolean;
}

export function useAtmosphereParser(deps: AtmosphereParserDeps) {
    const {
        setIsFoggy, setLightningEnabled,
        setSpectateIsFoggy, setSpectateLightningEnabled,
        triggerHaptic, playDoorSound, playRideSound, playStopRidingSound, playEffect, setIsRiding, setPlayerPosition
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

        // MUME reports mount changes as text even when Char.Ride does not arrive.
        if (!isSnoop && /^you pick up .+['’]s reins and start riding (?:him|her|it)\.$/.test(lower)) {
            setIsRiding?.(true);
            setPlayerPosition('riding');
            playRideSound?.();
        } else if (!isSnoop && /^you stop riding\b.*\.$/.test(lower)) {
            setIsRiding?.(false);
            setPlayerPosition('standing');
            playStopRidingSound?.();
        }

        // --- Environmental Sounds ---
        const isKnockAtEntrance = /\bknock(?:s|ed|ing)?\b.*\b(?:door|gate|hatch|portcullis|entrance)\b|\b(?:door|gate|hatch|portcullis|entrance)\b.*\bknock(?:s|ed|ing)?\b/.test(lower);
        if (isKnockAtEntrance) {
            playEffect?.('knock');
        } else if (lower.includes('clank of a door')) {
            playDoorSound?.(true); // Generic clank implies something opened/closed
        } else if (lower.includes('opens a door')) {
            playDoorSound?.(true);
        } else if (lower.includes('closes a door')) {
            playDoorSound?.(false);
        }

    }, [setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, playRideSound, playStopRidingSound, playEffect, setIsRiding, setPlayerPosition]);

    return { parseAtmosphere };
}
