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
    isSpectateMode
}: GameAudioDeps) => {
    const isSleeping = playerPosition === 'sleeping';
    const playSoundRef = useRef<(buffer: AudioBuffer) => void>(() => { });
    const setPlaySound = useCallback((fn: (buffer: AudioBuffer) => void) => { playSoundRef.current = fn; }, []);
    const playSound = useCallback((buffer: AudioBuffer) => playSoundRef.current(buffer), []);

    const playMovementSoundRef = useRef<(isRiding?: boolean) => void>(() => { });
    const playMovementSound = useCallback((isRiding?: boolean) => playMovementSoundRef.current(isRiding), []);

    const triggerHapticRef = useRef<(ms: number) => void>(() => { });
    const setTriggerHaptic = useCallback((fn: (ms: number) => void) => { triggerHapticRef.current = fn; }, []);
    const triggerHaptic = useCallback((ms: number) => triggerHapticRef.current(ms), []);

    const {
        audioCtxRef,
        initAudio,
        triggerHaptic: soundSystemHaptic,
        playSound: soundSystemPlay,
        playRandomSound,
        playMovementSound: soundSystemMove,
        loadMovementSound,
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound,
        loadHitImpactSound,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadCommMessageSound,
        playCommMessageSound,
        stopCommMessageSound,
        playTutorialExitSound,
        loadTutorialExitSound,
        loadSpellSounds



    } = useSoundSystem(isSoundEnabled);

    useZoneMusic({ roomZone, isSoundEnabled, audioCtxRef, zoneMusic, isInCombat: inCombat, lighting, isSleeping, gameState });
    useTerrainSounds({ currentTerrain, isSoundEnabled, audioCtxRef, lighting, isSleeping });
    useWeatherSounds({ weather, isSoundEnabled, audioCtxRef, isSleeping });

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
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        playCommMessageSound,
        stopCommMessageSound,
        playTutorialExitSound,
        loadTutorialExitSound,
        loadCommMessageSound,


        triggerHaptic,

        setTriggerHaptic
    };
};
