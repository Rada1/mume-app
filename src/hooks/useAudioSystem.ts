import { useEffect, useCallback, useRef } from 'react';
import { audioManager } from '../services/audio/AudioManager';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useActiveRoom, useActiveCombat, useActiveVitals } from '../stores/useActiveGameState';
import { useHaptics } from './interactions/useHaptics';
import { useModeStore } from '../stores/useModeStore';

export const useAmbientController = () => {
    const isSoundEnabled = useSettingsStore(state => state.isSoundEnabled);
    const zoneMusic = useSettingsStore(state => state.zoneMusic);
    const mode = useModeStore(state => state.mode);
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);

    // We use the active stores so spectate mode automatically gets correct audio
    const activeRoom = useActiveRoom();
    const activeCombat = useActiveCombat();
    const activeVitals = useActiveVitals();

    const roomZone = activeRoom.roomZone;
    const terrain = activeRoom.terrain;

    const weather = activeVitals.weather;
    const lighting = activeVitals.lighting;

    const inCombat = activeVitals.inCombat || activeCombat.opponentId !== null || activeCombat.opponentName !== null;

    useEffect(() => {
        if (!isSoundEnabled) return;
        const isDay = lighting === 'sun';
        audioManager.setAmbient('terrain', { key: terrain, isDay });
    }, [terrain, lighting, isSoundEnabled, mode, isSpectating, activeView]);

    useEffect(() => {
        if (!isSoundEnabled) return;
        if (weather === 'none' || weather === 'clear') {
            audioManager.setAmbient('weather', { key: null });
        } else {
            audioManager.setAmbient('weather', { key: weather });
        }
    }, [weather, isSoundEnabled, mode, isSpectating, activeView]);

    useEffect(() => {
        if (!isSoundEnabled) return;

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
        const dynamicUrls = mapping ? (Array.isArray(mapping.url) ? mapping.url : [mapping.url]) : undefined;

        audioManager.setAmbient('zone', { key: normalizedZone, inCombat, dynamicUrls });
    }, [roomZone, inCombat, isSoundEnabled, zoneMusic, mode, isSpectating, activeView]);

    // Handle drum loop
    useEffect(() => {
        if (!isSoundEnabled) return;
        audioManager.updateDrumLayer(inCombat, roomZone);
    }, [inCombat, roomZone, isSoundEnabled, mode, isSpectating, activeView]);

    // Simple listener for zone ended to trigger re-evaluation if needed
    useEffect(() => {
        const handleZoneEnded = (key: string) => {
            console.log(`[useAmbientController] Zone audio ended: ${key}`);
            // Logic to potentially pick a new random track could go here
        };
        audioManager.addZoneEndedListener(handleZoneEnded);
        return () => audioManager.removeZoneEndedListener(handleZoneEnded);
    }, []);
};

export const useAudioEffects = () => {
    const isSoundEnabled = useSettingsStore(state => state.isSoundEnabled);
    const { triggerHaptic } = useHaptics();

    const playEffect = useCallback((name: string, options?: { pitch?: number, volume?: number, filterFrequency?: number }) => {
        if (isSoundEnabled) {
            audioManager.playEffect(name, options);
        }
    }, [isSoundEnabled]);

    const playHitImpactSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('hit-impact', options), [playEffect]);
    const playOofSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('oof', options), [playEffect]);
    const playSlashSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('slash', options), [playEffect]);
    const playCleaveSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('cleave', options), [playEffect]);
    const playSmiteSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('smite', options), [playEffect]);
    const playPierceSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('pierce', { ...options, pitch: (options?.pitch ?? 1.0) * 1.6 }), [playEffect]);
    const playStabSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('stab', options), [playEffect]);
    const playArrowHitSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('arrowhit', options), [playEffect]);
    const playKillSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('kill', { ...options, volume: options?.volume || 1.1 }), [playEffect]);
    const playLevelSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('level', { ...options, volume: options?.volume || 1.3 }), [playEffect]);
    const playCommMessageSound = useCallback((options?: { volume?: number }) => playEffect('commbubble', { ...options, volume: options?.volume || 0.9 }), [playEffect]);
    const playBuySellSound = useCallback((options?: { volume?: number }) => playEffect('sellandbuy', { ...options, volume: options?.volume || 1.5 }), [playEffect]);
    const playBashSound = useCallback((options?: { pitch?: number, volume?: number }) => playEffect('bash', { ...options, volume: options?.volume || 0.75, pitch: options?.pitch ?? (0.9 + Math.random() * 0.2) }), [playEffect]);
    const playClickSound = useCallback(() => playEffect('click', { volume: 2.0 }), [playEffect]);

    const playDoorSound = useCallback((isOpen: boolean) => playEffect('door1', { pitch: isOpen ? 1.0 : 0.8, volume: 1.5 }), [playEffect]);
    const playMovementSound = useCallback((isRiding: boolean = false, terrain?: string) => {
        const isWaterTerrain = terrain && (
            terrain.toLowerCase().includes('water') ||
            terrain.toLowerCase().includes('shall') ||
            terrain.toLowerCase().includes('rapid')
        );

        const effectName = isWaterTerrain ? 'watermove' : 'move';

        if (isRiding) {
            playEffect(effectName, { pitch: 2.0, volume: 0.6 });
            setTimeout(() => {
                playEffect(effectName, { pitch: 2.0, volume: 0.45 });
            }, 300);
        } else {
            playEffect(effectName, { pitch: 1.05, volume: 0.6 });
        }
    }, [playEffect]);

    const playMagicExplosionSound = useCallback((options?: { volume?: number }) => playEffect('magicexplosion', { ...options, volume: options?.volume || 1.5 }), [playEffect]);
    const playIncantationSound = useCallback(() => audioManager.playIncantation(), []);
    const stopIncantationSound = useCallback((playExplosion: boolean = false) => audioManager.stopIncantation(playExplosion), []);

    const playSound = useCallback((buffer: AudioBuffer, options?: { volume?: number }) => {
        audioManager.playSound(buffer, options);
    }, []);

    const playRandomSound = useCallback((buffers: AudioBuffer[], options?: { volume?: number }) => {
        if (buffers && buffers.length > 0) {
            const randomIndex = Math.floor(Math.random() * buffers.length);
            audioManager.playSound(buffers[randomIndex], options);
        }
    }, []);

    return {
        playEffect,
        playHitImpactSound,
        playOofSound,
        playSlashSound,
        playCleaveSound,
        playSmiteSound,
        playPierceSound,
        playStabSound,
        playArrowHitSound,
        playKillSound,
        playLevelSound,
        playCommMessageSound,
        playBuySellSound,
        playBashSound,
        playClickSound,
        playDoorSound,
        playMovementSound,
        playMagicExplosionSound,
        playIncantationSound,
        stopIncantationSound,
        playSound,
        playRandomSound,
        triggerHaptic,

        audioCtxRef: { current: audioManager.context },
        initAudio: () => audioManager.init()
    };
};
