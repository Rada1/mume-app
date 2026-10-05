/**
 * @file useAudioSystem.ts
 * @description Coordinates ambient and health-based audio from active game state.
 */

import { useEffect, useCallback, useRef } from 'react';
import { audioManager } from '../services/audio/AudioManager';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useActiveRoom, useActiveVitals } from '../stores/useActiveGameState';
import { useHaptics } from './interactions/useHaptics';
import { useModeStore } from '../stores/useModeStore';
import { useUIStore } from '../stores/useUIStore';
import type { SessionMode } from '../types/session';

// --- Health Audio Mix ---
const HEALTH_STATUS_RANGES: Record<string, { min: number; max: number; fallback: number }> = {
    healthy: { min: 100, max: 100, fallback: 100 },
    fine: { min: 71, max: 99, fallback: 85 },
    hurt: { min: 51, max: 70, fallback: 60 },
    wounded: { min: 31, max: 50, fallback: 40 },
    bad: { min: 16, max: 30, fallback: 30 },
    awful: { min: 6, max: 15, fallback: 15 },
    dying: { min: 1, max: 5, fallback: 5 },
    stunned: { min: 0, max: 0, fallback: 0 }
};

const getAudioHealthPercent = (
    hp: number,
    maxHp: number,
    gmcpHp: number,
    gmcpMaxHp: number,
    hpStatus: string | null
): number => {
    const currentHp = gmcpMaxHp > 0 ? gmcpHp : hp;
    const currentMaxHp = gmcpMaxHp > 0 ? gmcpMaxHp : maxHp;
    const numericPercent = currentMaxHp > 0
        ? Math.max(0, Math.min(100, currentHp / currentMaxHp * 100))
        : undefined;
    const statusRange = hpStatus
        ? HEALTH_STATUS_RANGES[hpStatus.trim().toLowerCase()]
        : undefined;

    if (statusRange) {
        return numericPercent === undefined
            ? statusRange.fallback
            : Math.max(statusRange.min, Math.min(statusRange.max, numericPercent));
    }
    return numericPercent ?? 100;
};

export const useAmbientController = (
    gameState: 'account' | 'playing' | 'disconnected',
    accountStage: string = 'none',
    sessionMode: SessionMode = 'live'
) => {
    const isSoundEnabled = useSettingsStore(state => state.isSoundEnabled);
    const isClassicMode = useSettingsStore(state => state.isClassicMode);
    const areSoundsEnabled = isSoundEnabled && !isClassicMode;
    const isImmersionMode = useSettingsStore(state => state.isImmersionMode);
    const zoneMusic = useSettingsStore(state => state.zoneMusic);
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const isShaperOpen = useUIStore(state => state.isShaperOpen);

    // We use the active stores so spectate mode automatically gets correct audio
    const activeRoom = useActiveRoom();
    const activeVitals = useActiveVitals();

    const roomZone = activeRoom.roomZone;
    const terrain = activeRoom.terrain;

    const weather = activeVitals.weather;
    const lighting = activeVitals.lighting;

    const inCombat = activeVitals.position === 'fighting' || activeVitals.inCombat;
    const healthPercent = getAudioHealthPercent(
        activeVitals.hp,
        activeVitals.maxHp,
        activeVitals.gmcpVitals.hp,
        activeVitals.gmcpVitals.maxHp,
        activeVitals.hpStatus
    );

    // Refs to avoid stale closures in the zone-ended listener
    const normalizedZoneRef = useRef<string | null>(null);
    const inCombatRef = useRef<boolean>(false);
    const dynamicUrlRef = useRef<string | undefined>(undefined);

    const isAmbientActive = areSoundsEnabled && isImmersionMode && !isShaperOpen;

    useEffect(() => {
        const replayingFromAccount = gameState === 'account' && sessionMode !== 'live';
        if (gameState === 'playing' || replayingFromAccount) {
            audioManager.stopAccountMusic();
        }
    }, [gameState, sessionMode]);

    useEffect(() => {
        const healthAudioActive = gameState === 'playing' && areSoundsEnabled && !isShaperOpen;
        audioManager.updateHealthAudioMix(healthAudioActive, healthPercent);
    }, [gameState, healthPercent, areSoundsEnabled, mode, isSpectating, activeView, isShaperOpen]);

    useEffect(() => {
        if (!areSoundsEnabled || isShaperOpen) {
            audioManager.setAmbient('terrain', { key: null });
            return;
        }
        const isDay = lighting === 'sun';
        audioManager.setAmbient('terrain', { key: terrain, isDay });
    }, [terrain, lighting, areSoundsEnabled, mode, isSpectating, activeView, isShaperOpen]);

    useEffect(() => {
        if (!isAmbientActive) {
            audioManager.setAmbient('weather', { key: null });
            return;
        }
        if (weather === 'none' || weather === 'clear') {
            audioManager.setAmbient('weather', { key: null });
        } else {
            audioManager.setAmbient('weather', { key: weather });
        }
    }, [weather, isAmbientActive, mode, isSpectating, activeView]);

    useEffect(() => {
        if (!areSoundsEnabled || isShaperOpen) {
            audioManager.setAmbient('zone', { key: null });
            return;
        }

        // Replays can be opened from the account menu while the live game state
        // remains "account". Clear its ambient track for the full replay session.
        if (gameState === 'account' && sessionMode !== 'live') {
            normalizedZoneRef.current = null;
            inCombatRef.current = false;
            dynamicUrlRef.current = undefined;
            audioManager.setAmbient('zone', { key: null });
            return;
        }

        // Account stage can lag the gameplay parser by a render. Game state is
        // authoritative: never let a stale account stage keep its music alive
        // once a character has entered the world.
        if (gameState === 'account' && accountStage !== 'none') {
            normalizedZoneRef.current = 'account';
            inCombatRef.current = false;
            dynamicUrlRef.current = '/assets/Sounds/Account/accountmusic.mp3';

            audioManager.setAmbient('zone', { 
                key: 'account', 
                dynamicUrl: '/assets/Sounds/Account/accountmusic.mp3',
                loop: true
            });
            return;
        }

        let normalizedZone = roomZone ? roomZone.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/^the\s+/i, '')
            .trim()
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ') : null;

        const mapping = (normalizedZone && Array.isArray(zoneMusic)) ? zoneMusic.find(m => 
            m.zone.toLowerCase().trim().replace(/^the\s+/i, '') === normalizedZone
        ) : null;
        const dynamicUrl = mapping?.url;

        // Update refs for replay loop
        normalizedZoneRef.current = normalizedZone;
        inCombatRef.current = inCombat;
        dynamicUrlRef.current = dynamicUrl;

        audioManager.setAmbient('zone', { key: normalizedZone, inCombat, dynamicUrl });
    }, [roomZone, inCombat, areSoundsEnabled, zoneMusic, mode, isSpectating, activeView, gameState, accountStage, sessionMode, isShaperOpen]);

    // Simple listener for zone ended to trigger re-evaluation if needed
    useEffect(() => {
        const handleZoneEnded = (key: string) => {
            console.log(`[useAmbientController] Zone audio ended: ${key}`);
            if (areSoundsEnabled && normalizedZoneRef.current === key && !useUIStore.getState().isShaperOpen) {
                console.log(`[useAmbientController] Re-triggering zone music for key: ${key}`);
                audioManager.setAmbient('zone', {
                    key: normalizedZoneRef.current,
                    inCombat: inCombatRef.current,
                    dynamicUrl: dynamicUrlRef.current
                });
            }
        };
        audioManager.addZoneEndedListener(handleZoneEnded);
        return () => audioManager.removeZoneEndedListener(handleZoneEnded);
    }, [areSoundsEnabled]);
};

export const useAudioEffects = () => {
    const isSoundEnabled = useSettingsStore(state => state.isSoundEnabled);
    const isClassicMode = useSettingsStore(state => state.isClassicMode);
    const areSoundsEnabled = isSoundEnabled && !isClassicMode;
    const { triggerHaptic } = useHaptics();
    type EffectOptions = { pitch?: number, volume?: number, volumeMultiplier?: number, filterFrequency?: number, skipJitter?: boolean };

    const playEffect = useCallback((name: string, options?: EffectOptions) => {
        if (areSoundsEnabled && !useUIStore.getState().isShaperOpen) {
            audioManager.playEffect(name, options);
        }
    }, [areSoundsEnabled]);

    const playHitImpactSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('hit2', options), [playEffect]);
    const playOofSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('oof', options), [playEffect]);
    const playKillSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('kill', { ...options, volume: options?.volume || 1.1 }), [playEffect]);
    const playLevelSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('level', { ...options, volume: options?.volume || 1.3 }), [playEffect]);
    const playCommMessageSound = useCallback((options?: { volume?: number }) => playEffect('commbubble', { ...options, volume: options?.volume || 0.9, skipJitter: true }), [playEffect]);
    const playBuySellSound = useCallback((options?: { volume?: number }) => playEffect('sellandbuy', { ...options, volume: options?.volume || 1.5 }), [playEffect]);
    const playBashSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('bash', { ...options, volume: options?.volume || 0.75, pitch: options?.pitch ?? (0.9 + Math.random() * 0.2) }), [playEffect]);
    const playSlashSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('slash', options), [playEffect]);
    const playCleaveSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('cleave', options), [playEffect]);
    const playSmiteSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('smite', options), [playEffect]);
    const playPierceSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('pierce', options), [playEffect]);
    const playStabSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('stab', options), [playEffect]);
    const playArrowHitSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('arrowhit', options), [playEffect]);
    const playClickSound = useCallback(() => playEffect('click', { volume: 2.0 }), [playEffect]);
    const playLookSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('look', options), [playEffect]);
    const playExamineSound = playLookSound;
    const playWhoSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('who', options), [playEffect]);
    const playEqInventorySound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('eqinventory', options), [playEffect]);
    const playFleeSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('flee', options), [playEffect]);
    const playGetSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('get', options), [playEffect]);
    const playDropSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('drop', options), [playEffect]);
    const playWeatherSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('weather', options), [playEffect]);
    const playMagicCompleteSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('magiccomplete', options), [playEffect]);
    const playAchievementSound = useCallback(() => playEffect('achievement'), [playEffect]);
    const playEventMoveSound = useCallback((isRiding: boolean = false, isSneaking: boolean = false) => {
        if (isRiding) {
            playEffect('ride');
        } else if (isSneaking) {
            playEffect('move', { pitch: 1.05, volume: 0.6, filterFrequency: 500 });
        } else {
            playEffect('event-move');
        }
    }, [playEffect]);
    const playWearSound = useCallback(() => playEffect('wear'), [playEffect]);
    const playRemoveSound = useCallback(() => playEffect('remove'), [playEffect]);
    const playLoadFlagSound = useCallback(() => playEffect('loadflag', { pitch: 1.0, volume: 0.2, skipJitter: true }), [playEffect]);
    const playRideSound = useCallback(() => playEffect('ride'), [playEffect]);
    const playStopRidingSound = useCallback(() => playEffect('stopriding'), [playEffect]);

    const playDoorSound = useCallback((isOpen: boolean) => playEffect('door1', { pitch: isOpen ? 1.0 : 0.8, volume: 1.5 }), [playEffect]);
    const playMovementSound = useCallback((isRiding: boolean = false, terrain?: string, isSneaking: boolean = false) => {
        const isWaterTerrain = terrain && (
            terrain.toLowerCase().includes('water') ||
            terrain.toLowerCase().includes('shall') ||
            terrain.toLowerCase().includes('rapid')
        );

        const effectName = isWaterTerrain ? 'watermove' : 'move';

        if (isRiding) {
            playEffect('ride');
        } else {
            playEffect(effectName, {
                pitch: 1.05,
                volume: 0.6,
                filterFrequency: isSneaking ? 500 : undefined
            });
        }
    }, [playEffect]);

    const playMagicExplosionSound = useCallback((options?: { volume?: number }) => {
        // playEffect('magicexplosion', { ...options, volume: options?.volume || 1.5 })
    }, [playEffect]);
    const playIncantationSound = useCallback(() => {
        if (areSoundsEnabled && !useUIStore.getState().isShaperOpen) audioManager.playIncantation();
    }, [areSoundsEnabled]);
    const stopIncantationSound = useCallback((playExplosion: boolean = false) => audioManager.stopIncantation(playExplosion), []);

    const playSound = useCallback((buffer: AudioBuffer, options?: { volume?: number }) => {
        if (areSoundsEnabled && !useUIStore.getState().isShaperOpen) audioManager.playSound(buffer, options);
    }, [areSoundsEnabled]);

    const playRandomSound = useCallback((buffers: AudioBuffer[], options?: { volume?: number }) => {
        if (areSoundsEnabled && !useUIStore.getState().isShaperOpen && buffers && buffers.length > 0) {
            const randomIndex = Math.floor(Math.random() * buffers.length);
            audioManager.playSound(buffers[randomIndex], options);
        }
    }, [areSoundsEnabled]);

    return {
        playEffect,
        playHitImpactSound,
        playOofSound,
        playKillSound,
        playLevelSound,
        playCommMessageSound,
        playBuySellSound,
        playBashSound,
        playSlashSound,
        playCleaveSound,
        playSmiteSound,
        playPierceSound,
        playStabSound,
        playArrowHitSound,
        playClickSound,
        playLookSound,
        playExamineSound,
        playWhoSound,
        playEqInventorySound,
        playFleeSound,
        playGetSound,
        playDropSound,
        playWeatherSound,
        playMagicCompleteSound,
        playDoorSound,
        playMovementSound,
        playMagicExplosionSound,
        playIncantationSound,
        stopIncantationSound,
        playSound,
        playRandomSound,
        playAchievementSound,
        playEventMoveSound,
        playWearSound,
        playRemoveSound,
        playLoadFlagSound,
        playRideSound,
        playStopRidingSound,
        triggerHaptic,

        audioCtxRef: { current: audioManager.context },
        initAudio: () => audioManager.init()
    };
};
