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
        triggerHaptic, playDoorSound, playRideSound, playStopRidingSound, playEffect,
        setPlayerPosition, setSpectatePosition, setIsRiding, refreshCombatStats, isSpectateMode
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

        // --- Posture / Position / Riding ---
        const posSetter = (isSnoop && setSpectatePosition) ? setSpectatePosition : setPlayerPosition;
        
        // Only first-person action confirmations represent a player position change.
        // Room prose may mention mounts, reins, or riding without the player mounting.
        const isMounting = /\byou\s+(?:mount|start riding|pick(?:s)? up some reins|pick(?:s)? up the reins)\b/.test(lower);
        const isDismounting = /\byou\s+(?:dismount|stop riding)\b/.test(lower);
        const isSelfSitting = /\byou\b.*\bsit(?: down| up)?\b/.test(lower);
        const isSelfStanding = /\byou\b.*\bstand(?: up)?\b/.test(lower);
        const isSelfResting = /\byou\b.*\b(?:rest|lie down)\b/.test(lower);
        const isSelfSleeping = /\byou\b.*\bgo to sleep\b/.test(lower);

        if (isMounting) {
            setIsRiding?.(true);
            posSetter('riding');
            playRideSound?.();
        } else if (isDismounting) {
            setIsRiding?.(false);
            posSetter('standing');
            playStopRidingSound?.();
        } else if (isSelfSitting || lower.includes('is now sitting')) {
            posSetter('sitting');
            if (!isSnoop && isSelfSitting) playEffect?.('rest', { pitch: 1.12, skipJitter: true });
            if (!isSnoop && isSelfSitting) refreshCombatStats?.();
        } else if (isSelfStanding || lower.includes('is now standing')) {
            posSetter('standing');
            if (!isSnoop && isSelfStanding) playEffect?.('rest', { pitch: 1.24, skipJitter: true });
            if (!isSnoop && isSelfStanding) refreshCombatStats?.();
        } else if (isSelfResting || lower.includes('is now resting')) {
            posSetter('resting');
            if (!isSnoop && isSelfResting) playEffect?.('rest', { pitch: 1, skipJitter: true });
            if (!isSnoop && isSelfResting) refreshCombatStats?.();
        } else if (isSelfSleeping || lower.includes('is now sleeping')) {
            posSetter('sleeping');
            if (!isSnoop && isSelfSleeping) playEffect?.('rest', { pitch: 0.8, skipJitter: true });
            if (!isSnoop && isSelfSleeping) refreshCombatStats?.();
        }
    }, [setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, playRideSound, playStopRidingSound, playEffect, setPlayerPosition, setSpectatePosition, setIsRiding, refreshCombatStats, isSpectateMode]);

    return { parseAtmosphere };
}
