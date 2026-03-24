import { useRef, useCallback } from 'react';
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
}

export const useGameAudio = ({
    isSoundEnabled,
    roomZone,
    zoneMusic,
    inCombat,
    lighting,
    currentTerrain,
    weather
}: GameAudioDeps) => {
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
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound
    } = useSoundSystem(isSoundEnabled);

    useZoneMusic({ roomZone, isSoundEnabled, audioCtxRef, zoneMusic, isInCombat: inCombat, lighting });
    useTerrainSounds({ currentTerrain, isSoundEnabled, audioCtxRef, lighting });
    useWeatherSounds({ weather, isSoundEnabled, audioCtxRef });

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
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        triggerHaptic,
        setTriggerHaptic
    };
};
