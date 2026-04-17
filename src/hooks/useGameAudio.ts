import { useRef, useCallback, useEffect } from 'react';
import { useSoundSystem } from './useSoundSystem';
import { useZoneMusic } from './useZoneMusic';
import { useTerrainSounds } from './useTerrainSounds';
import { useWeatherSounds } from './useWeatherSounds';
import { ZoneMusicMapping, WeatherType, MumeTime } from '../types';

export interface GameAudioDeps {
    isSoundEnabled: boolean;
    roomZone: string | null;
    zoneMusic: ZoneMusicMapping[];
    inCombat: boolean;
    lighting: string;
    /** MUME game clock used to determine day/night for zone music. */
    gameTime: MumeTime | null;
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
    gameTime,
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
    // Log every render to track state flow
    console.log(`[Audio/Render] waiting=${waiting}, isSpectateMode=${isSpectateMode}`);

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
        activeIncantationRef,
        loadCommMessageSound,
        playCommMessageSound,
        stopCommMessageSound,
        playBuySellSound,
        loadBuySellSound,
        playBashSound,
        loadBashSound,
        playArrowHitSound,
        loadArrowHitSound,
        loadSpellSounds,
        playKillSound,
        loadKillSound,
        playLevelSound,
        loadLevelSound
    } = useSoundSystem(isSoundEnabled);

    useZoneMusic({
        roomZone: effectiveRoomZone || null,
        isSoundEnabled,
        audioCtxRef,
        zoneMusic,
        isInCombat: effectiveInCombat,
        gameTime,
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

    // --- Spectate Spell Success Tracking ---
    const spellSuccessRef = useRef(false);
    const primeSpellSuccess = useCallback((success: boolean) => {
        spellSuccessRef.current = success;
    }, []);

    // Synchronize incantation sounds with the waiting (casting) state
    const lastWaitingRef = useRef(waiting);
    useEffect(() => {
        const prevWaiting = lastWaitingRef.current;
        if (prevWaiting !== waiting) {
            console.log(`[Audio] Waiting state changed: ${prevWaiting} -> ${waiting} (isSpectateMode=${isSpectateMode})`);
        }

        if (waiting) {
            // GMCP says we are waiting (casting/skill). 
            // We don't auto-start here to avoid non-spell skill triggers,
            // but we log it for diagnostics.
            console.log('[Audio] Waiting state activated via GMCP');
        } else {
            // Authoritative stop: if GMCP says we are NOT waiting, the sound must stop.
            // We add a tiny delay to allow for race conditions where the log text arrivals
            // and GMCP updates are slightly out of sync.
            setTimeout(() => {
                if (lastWaitingRef.current !== true) {
                    if (activeIncantationRef?.current) {
                        console.log(`[Audio] Authority stop: waiting=false, success=${spellSuccessRef.current}`);
                    }
                    
                    if (manualCancelRef?.current && !isSpectateMode) {
                        stopIncantationSound(false);
                        manualCancelRef.current = false;
                    } else {
                        stopIncantationSound(spellSuccessRef.current);
                    }
                    spellSuccessRef.current = false;
                }
            }, 500); // 500ms grace period for state sync
        }
        lastWaitingRef.current = waiting;
    }, [waiting, playIncantationSound, stopIncantationSound, manualCancelRef, isSpectateMode, activeIncantationRef]);

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
        playArrowHitSound,
        loadArrowHitSound,
        playKillSound,
        loadKillSound,
        playLevelSound,
        loadLevelSound,
        loadAllWeaponSounds,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        playCommMessageSound,
        stopCommMessageSound,
        loadCommMessageSound,
        primeSpellSuccess,

        triggerHaptic,

        setTriggerHaptic
    };
};
