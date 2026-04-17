import { useRef, useCallback, useEffect } from 'react';
import { useSoundSystem } from './useSoundSystem';
import { useZoneMusic } from './useZoneMusic';
import { useTerrainSounds } from './useTerrainSounds';
import { useWeatherSounds } from './useWeatherSounds';
import { ZoneMusicMapping, WeatherType } from '../types';

export interface GameAudioDeps {
    isSoundEnabled: boolean;
    roomZone: string | null;
    zoneMusic: ZoneMusicMapping[];
    inCombat: boolean;
    lighting: string;
    currentTerrain: string;
    weather: WeatherType;
    playerPosition?: string;
    waiting?: boolean;
    manualCancelRef?: React.MutableRefObject<boolean>;
    gameState?: string;
    isSpectateMode?: boolean;
    spectateRoomZone?: string | null;
    spectateTerrain?: string;
    spectateLighting?: string;
    spectateWeather?: WeatherType;
    spectateIsFoggy?: boolean;
    spectateInCombat?: boolean;
    spectatePosition?: string;
}

export const useGameAudio = ({
    isSoundEnabled,
    roomZone,
    zoneMusic,
    inCombat,
    lighting,
    currentTerrain,
    weather,
    playerPosition,
    waiting,
    manualCancelRef,
    gameState,
    isSpectateMode,
    spectateRoomZone,
    spectateTerrain,
    spectateLighting,
    spectateWeather,
    spectateIsFoggy,
    spectateInCombat,
    spectatePosition
}: GameAudioDeps) => {
    const effectivePosition = isSpectateMode ? (spectatePosition || 'standing') : (playerPosition || 'standing');
    const isSleeping = effectivePosition === 'sleeping';
    const effectiveInCombat = isSpectateMode ? spectateInCombat : inCombat;

    // Use spectate values if in spectate mode
    const effectiveRoomZone = isSpectateMode ? spectateRoomZone : roomZone;
    const effectiveTerrain = isSpectateMode ? spectateTerrain : currentTerrain;
    const effectiveLighting = isSpectateMode ? spectateLighting : lighting;
    const effectiveWeather = isSpectateMode ? spectateWeather : weather;

    const playSoundRef = useRef<(buffer: AudioBuffer) => void>(() => { });
    const setPlaySound = useCallback((fn: (buffer: AudioBuffer) => void) => { playSoundRef.current = fn; }, []);
    const playSound = useCallback((buffer: AudioBuffer) => playSoundRef.current(buffer), []);

    const playMovementSoundRef = useRef<(isRiding?: boolean) => void>(() => { });

    const triggerHapticRef = useRef<(ms: number) => void>(() => { });
    const setTriggerHaptic = useCallback((fn: (ms: number) => void) => { triggerHapticRef.current = fn; }, []);
    const triggerHaptic = useCallback((ms: number) => triggerHapticRef.current(ms), []);

    const {
        audioCtxRef,
        initAudio: soundSystemInit,
        triggerHaptic: soundSystemHaptic,
        playSound: soundSystemPlay,
        playRandomSound,
        playMovementSound: soundSystemMove,
        loadMovementSound,
        playDoorSound: soundSystemPlayDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound,
        loadHitImpactSound,
        playOofSound,
        loadOofSound,
        playSlashSound,
        loadSlashSound,
        playCleaveSound,
        loadCleaveSound,
        playSmiteSound,
        loadSmiteSound,
        playPierceSound,
        loadPierceSound,
        playStabSound,
        loadStabSound,
        loadAllWeaponSounds,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadCommMessageSound,
        playCommMessageSound,
        stopCommMessageSound,
        playBuySellSound,
        loadBuySellSound,
        playBashSound,
        loadBashSound,
        loadSpellSounds



    } = useSoundSystem(isSoundEnabled);

    useZoneMusic({ 
        roomZone: effectiveRoomZone || null, 
        isSoundEnabled, 
        audioCtxRef, 
        zoneMusic, 
        isInCombat: effectiveInCombat, 
        lighting: effectiveLighting, 
        isSleeping, 
        gameState 
    });
    
    useTerrainSounds({ 
        currentTerrain: effectiveTerrain || '', 
        isSoundEnabled, 
        audioCtxRef, 
        lighting: effectiveLighting, 
        isSleeping 
    });
    
    useWeatherSounds({ 
        weather: effectiveWeather || 'none', 
        isSoundEnabled, 
        audioCtxRef, 
        isSleeping 
    });

    // Throttles to prevent audio spam from duplicated GMCP/Snoop packets
    const lastMoveTimeRef = useRef(0);
    const lastDoorTimeRef = useRef(0);

    const playMovementSound = useCallback((isRidingOverride?: boolean) => {
        const now = Date.now();
        if (now - lastMoveTimeRef.current < 150) return; // Reduced throttle for rapid movement
        lastMoveTimeRef.current = now;
        
        // Use override if provided (manual trigger), otherwise infer from current state
        const isCurrentlyRiding = isRidingOverride !== undefined 
            ? isRidingOverride 
            : (effectivePosition === 'riding' || effectivePosition?.includes('riding'));
            
        playMovementSoundRef.current(isCurrentlyRiding);
    }, [effectivePosition]);

    const playDoorSound = useCallback((isOpen: boolean) => {
        const now = Date.now();
        if (now - lastDoorTimeRef.current < 800) return;
        lastDoorTimeRef.current = now;
        soundSystemPlayDoorSound(isOpen);
    }, [soundSystemPlayDoorSound]);

    // Stop incantation if we are no longer waiting (interrupt or end of cast)
    const lastWaitingRef = useRef(waiting);
    useEffect(() => {
        // Skip spell sounds triggered by waiting state clearing if in spectate mode
        if (isSpectateMode) {
            lastWaitingRef.current = waiting;
            return;
        }

        if (lastWaitingRef.current && !waiting) {
            if (manualCancelRef?.current) {
                console.log('[Audio] Manual cancel detected, silent stop');
                stopIncantationSound(false);
                manualCancelRef.current = false;
            } else {
                console.log('[Audio] Waiting state cleared, triggering explosion if cast was successful');
                stopIncantationSound(true); 
            }
        }
        lastWaitingRef.current = waiting;
    }, [waiting, stopIncantationSound, manualCancelRef, isSpectateMode]);

    const initAudio = useCallback(() => {
        soundSystemInit();
        loadAllWeaponSounds();
    }, [soundSystemInit, loadAllWeaponSounds]);

    // Wire the real functions into refs immediately
    triggerHapticRef.current = soundSystemHaptic;
    playSoundRef.current = soundSystemPlay;
    playMovementSoundRef.current = soundSystemMove;

    return {
        audioCtxRef,
        initAudio,
        playSound,
        setPlaySound,
        playRandomSound,
        playMovementSound,
        loadMovementSound,
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound,
        loadHitImpactSound,
        playOofSound,
        loadOofSound,
        playSlashSound,
        loadSlashSound,
        playCleaveSound,
        loadCleaveSound,
        playSmiteSound,
        loadSmiteSound,
        playPierceSound,
        loadPierceSound,
        playStabSound,
        loadStabSound,
        playBuySellSound,
        loadBuySellSound,
        playBashSound,
        loadBashSound,
        loadAllWeaponSounds,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        playCommMessageSound,
        stopCommMessageSound,
        loadCommMessageSound,


        triggerHaptic,

        setTriggerHaptic
    };
};
