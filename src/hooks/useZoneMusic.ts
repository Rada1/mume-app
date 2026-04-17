/**
 * @file useZoneMusic.ts
 * @description Hook for managing zone-specific background music and combat audio layers.
 */

import { useEffect, useRef, useState } from 'react';
import {
    ZoneMusicDeps,
    TrackState,
    STATIC_MUSIC_MAP,
    BPM_MAP,
    DRUM_LOOP_URL,
    ALWAYS_PLAY_ZONES,
    isGameDay
} from './useZoneMusicConstants';

export const useZoneMusic = ({ roomZone, isSoundEnabled, audioCtxRef, zoneMusic, isInCombat, gameTime, isSleeping, gameState }: ZoneMusicDeps) => {
    const zoneTrack = useRef<TrackState>({ source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 });
    const combatTrack = useRef<TrackState>({ source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 });
    const lastZoneRef = useRef<string | null>(null);
    const lastIsDayRef = useRef<boolean | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Tick every real minute (= 1 MUME hour) so the main effect re-runs and
    // catches day→night / night→day transitions without relying on external events.
    const [_tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(id);
    }, []);
    const isStoppingManualRef = useRef(false);
    const zoneLoadingUrlRef = useRef<string | null>(null);
    const combatLoadingUrlRef = useRef<string | null>(null);
    const zoneLoadGenerationRef = useRef(0);
    const combatLoadGenerationRef = useRef(0);
    const realTimeInCombatRef = useRef(isInCombat);
    realTimeInCombatRef.current = isInCombat;
    
    // Tracks any drum source that is currently fading out so we can hard-stop it
    // immediately before starting a new one, guaranteeing only 1 instance at a time.
    const drumFadingSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // --- Centralized Drum Cleanup ---
    // Every code path that stops or replaces zoneTrack.current MUST call this first
    // to avoid orphaning a looping AudioBufferSourceNode connected to ctx.destination.
    const killDrumLayer = (fadeDuration: number = 0.3) => {
        const { drumSource, drumGain, drumFilter } = zoneTrack.current;
        if (drumSource) {
            drumFadingSourceRef.current = drumSource;
            fadeOutAndStop(drumSource, drumGain, drumFilter, fadeDuration);
        }
        zoneTrack.current.drumSource = null;
        zoneTrack.current.drumGain = null;
        zoneTrack.current.drumFilter = null;
    };

    // --- Main Logic ---
    useEffect(() => {
        console.log(`[ZoneMusic] Effect Triggered: State=${gameState}, Zone=${roomZone}, Sound=${isSoundEnabled}, Sleeping=${isSleeping}, Ctx=${!!audioCtxRef.current}`);
        
        if (!isSoundEnabled || !audioCtxRef.current || isSleeping) {
            console.log('[ZoneMusic] Effect exited early: Missing context/sound or sleeping.');
            stopAll();
            return;
        }

        const isActuallyInLorien = roomZone?.toLowerCase().includes('lorien');
        const isActuallyInValinor = roomZone?.toLowerCase().includes('valinor');

        // 1. Force-stop account music if we've transitioned out of it (NEVER skip this)
        if (gameState !== 'account' && zoneTrack.current.url === '/assets/Sounds/Zone Sounds/Lorien1.mp3') {
            if (!isActuallyInLorien && !isActuallyInValinor && zoneTrack.current.source) {
                console.log('[ZoneMusic] HARD STOP: Leaving account mode, killing Lorien1.mp3');
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
                zoneTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
            }
        }

        // 2. Handle Zone Track Updates
        // Derive day/night from MUME clock rather than the lighting flag.
        const isDay = isGameDay(gameTime);
        const isDayChanged = isDay !== lastIsDayRef.current;
        const stateChanged = gameState !== lastZoneRef.current;
        const zoneChanged = roomZone !== lastZoneRef.current;

        lastIsDayRef.current = isDay;
        const normalizedZone = (roomZone || '').toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/^the\s+/i, '');
        const isAlwaysOnZone = ALWAYS_PLAY_ZONES.includes(normalizedZone);

        if (!isDay && gameState !== 'account' && !isAlwaysOnZone) {
            // Silence area music at night
            if (zoneTrack.current.source || zoneTrack.current.drumSource) {
                console.log('[ZoneMusic] Night detected (MUME clock), silencing area music.');
                isStoppingManualRef.current = true;
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
                killDrumLayer();
                zoneTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: zoneTrack.current.pauseOffset || 0 };
                isStoppingManualRef.current = false;
            }
        } else if ((roomZone || gameState === 'account') && (zoneChanged || stateChanged || isDayChanged)) {
            // 3. Handle Zone Track Updates
            console.log(`[ZoneMusic] Transition Detected: LastZone=${lastZoneRef.current}, NewState=${gameState}, NewZone=${roomZone}, isDay=${isDay}`);

            if (gameState === 'account') lastZoneRef.current = 'account';
            else lastZoneRef.current = roomZone;

            // Clear any pending silence timer when moving to a new area
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            updateZoneMusic();
        }

        // 4. Handle Volume Ducking and Drum layer updates based on Combat state
        updateVolumes();

    }, [roomZone, isSoundEnabled, isInCombat, zoneMusic, gameTime, isSleeping, gameState, _tick]);

    const stopAll = () => {
        isStoppingManualRef.current = true;
        fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
        killDrumLayer();
        fadeOutAndStop(combatTrack.current.source, combatTrack.current.gain);
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        zoneTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: 0 };
        lastZoneRef.current = null;
        isStoppingManualRef.current = false;
    };

    const updateVolumes = async () => {
        if (!audioCtxRef.current || isStoppingManualRef.current) return;
        const ctx = audioCtxRef.current;
        const activeMusicUrl = zoneTrack.current.url;

        if (isInCombat && gameState !== 'account') {
            if (!zoneTrack.current.drumSource && !combatLoadingUrlRef.current) {
                const myCombatGen = ++combatLoadGenerationRef.current;
                const isCombatStale = () => combatLoadGenerationRef.current !== myCombatGen;

                let dBuffer = zoneTrack.current.drumBuffer;
                if (!dBuffer) {
                    combatLoadingUrlRef.current = DRUM_LOOP_URL;
                    try {
                        dBuffer = await loadAudio(DRUM_LOOP_URL);
                        zoneTrack.current.drumBuffer = dBuffer;
                    } finally {
                        combatLoadingUrlRef.current = null;
                    }
                }

                if (isCombatStale() || !realTimeInCombatRef.current || gameState === 'account') return;

                if (dBuffer && !zoneTrack.current.drumSource) {
                    if (drumFadingSourceRef.current) {
                        try {
                            drumFadingSourceRef.current.stop();
                            drumFadingSourceRef.current.disconnect();
                        } catch (_) {}
                        drumFadingSourceRef.current = null;
                    }

                    const dSource = ctx.createBufferSource();
                    dSource.buffer = dBuffer;
                    dSource.loop = true;

                    const musicFilename = activeMusicUrl ? decodeURIComponent(activeMusicUrl.split('/').pop() || '') : '';
                    const musicBpm = BPM_MAP[musicFilename] || 100;
                    const drumBpm = BPM_MAP['drumbeat.mp3'] || 100;
                    dSource.playbackRate.value = musicBpm / drumBpm;

                    const dGain = ctx.createGain();
                    dGain.gain.setValueAtTime(0, ctx.currentTime);
                    dGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.5);

                    const dFilter = ctx.createBiquadFilter();
                    dFilter.type = 'lowpass';
                    dFilter.frequency.setValueAtTime(2000, ctx.currentTime);

                    dSource.connect(dFilter);
                    dFilter.connect(dGain);
                    dGain.connect(ctx.destination);

                    let startOffset = 0;
                    if (zoneTrack.current.source) {
                        const elapsed = ctx.currentTime - (zoneTrack.current.startTime || 0);
                        const totalOffset = (zoneTrack.current.pauseOffset || 0) + elapsed;
                        startOffset = totalOffset % dBuffer.duration;
                    }

                    dSource.start(0, startOffset);
                    zoneTrack.current.drumSource = dSource;
                    zoneTrack.current.drumGain = dGain;
                    zoneTrack.current.drumFilter = dFilter;
                }
            }
        } else if (zoneTrack.current.drumSource) {
            const { drumSource, drumGain, drumFilter } = zoneTrack.current;
            zoneTrack.current.drumSource = null;
            zoneTrack.current.drumGain = null;
            zoneTrack.current.drumFilter = null;
            drumFadingSourceRef.current = drumSource;
            fadeOutAndStop(drumSource, drumGain, drumFilter, 0.3);
        }

        if (zoneTrack.current.gain) {
            const g = zoneTrack.current.gain.gain;
            g.cancelScheduledValues(ctx.currentTime);
            g.setValueAtTime(g.value, ctx.currentTime);
            g.linearRampToValueAtTime(isInCombat ? 0.045 : 0.06, ctx.currentTime + 1.5);
        }

        if (zoneTrack.current.filter) {
            const f = zoneTrack.current.filter.frequency;
            f.cancelScheduledValues(ctx.currentTime);
            f.setValueAtTime(f.value, ctx.currentTime);
            f.exponentialRampToValueAtTime(isInCombat ? 500 : 20000, ctx.currentTime + 1.5);
        }
    };

    const updateZoneMusic = async (resumeOffset?: number) => {
        const myGeneration = ++zoneLoadGenerationRef.current;
        const isStale = () => zoneLoadGenerationRef.current !== myGeneration;

        if (!audioCtxRef.current || isSleeping) {
            if (isSleeping) {
                if (zoneTrack.current.source) fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
                killDrumLayer();
                zoneTrack.current = { source: null, gain: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: 0 };
            }
            return;
        }

        const ctx = audioCtxRef.current!;
        const normalizedZone = roomZone?.toLowerCase().replace(/^the\s+/i, '') || '';

        // --- Account Music Logic ---
        if (gameState === 'account') {
            const accountMusicUrl = '/assets/Sounds/Zone Sounds/Lorien1.mp3';
            if (zoneTrack.current.url === accountMusicUrl && zoneTrack.current.source) return;

            zoneLoadingUrlRef.current = accountMusicUrl;
            let buffer: AudioBuffer | null = null;
            try { buffer = await loadAudio(accountMusicUrl); } finally { zoneLoadingUrlRef.current = null; }
            if (!buffer || isStale()) return;

            if (zoneTrack.current.source) fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
            killDrumLayer();

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = isInCombat ? 500 : 20000;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            if (ctx.state === 'suspended') await ctx.resume();
            source.start(0);

            zoneTrack.current = { source, gain, filter, url: accountMusicUrl, buffer, startTime: ctx.currentTime, pauseOffset: 0 };
            lastZoneRef.current = 'account';
            return;
        }
        
        if (!roomZone) {
            if (zoneTrack.current.source || zoneTrack.current.drumSource) {
                isStoppingManualRef.current = true;
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
                killDrumLayer();
                zoneTrack.current = { source: null, gain: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: 0 };
                isStoppingManualRef.current = false;
            }
            return;
        }
        
        const dynamicMatch = zoneMusic.find(m => m.zone.toLowerCase().replace(/^the\s+/i, '') === normalizedZone);
        const rawUrl = dynamicMatch?.url || STATIC_MUSIC_MAP[normalizedZone];
        if (!rawUrl) {
            if (zoneTrack.current.source) fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
            killDrumLayer();
            zoneTrack.current = { source: null, gain: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: 0 };
            return;
        }

        const musicUrl = Array.isArray(rawUrl) ? rawUrl[Math.floor(Math.random() * rawUrl.length)] : rawUrl;
        if (resumeOffset === undefined && musicUrl === zoneTrack.current.url && (zoneTrack.current.source || zoneLoadingUrlRef.current === musicUrl)) return;

        let buffer = (musicUrl === zoneTrack.current.url) ? zoneTrack.current.buffer : null;
        if (!buffer) {
            zoneLoadingUrlRef.current = musicUrl;
            try { buffer = await loadAudio(musicUrl); } finally { zoneLoadingUrlRef.current = null; }
            if (!buffer) return;
        }

        if (isStale() || (lastZoneRef.current !== roomZone && gameState !== 'account')) return;

        if (zoneTrack.current.source) {
            isStoppingManualRef.current = true;
            fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
        }
        killDrumLayer();
        const preservedDrumBuffer = zoneTrack.current.drumBuffer;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false;

        source.onended = () => {
            if (!isStoppingManualRef.current && lastZoneRef.current === roomZone) {
                if (zoneTrack.current.source === source) {
                    zoneTrack.current.source = null;
                    zoneTrack.current.pauseOffset = 0;
                }
                const silenceMinutes = 1 + Math.random() * 3;
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isSoundEnabled && (lastZoneRef.current === roomZone || gameState === 'account')) {
                        updateZoneMusic();
                    }
                }, silenceMinutes * 60 * 1000);
            }
        };

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = isInCombat ? 500 : 20000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(isInCombat ? 0.045 : 0.06, ctx.currentTime + 2);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        const startOffset = resumeOffset !== undefined ? resumeOffset : (Math.random() * Math.max(0, buffer.duration - 30));
        if (ctx.state === 'suspended') await ctx.resume();
        source.start(0, startOffset % buffer.duration);

        zoneTrack.current = {
            source, gain, filter, url: musicUrl, buffer,
            drumBuffer: preservedDrumBuffer ?? undefined,
            startTime: ctx.currentTime,
            pauseOffset: startOffset % buffer.duration
        };
        isStoppingManualRef.current = false;
    };

    const loadAudio = async (url: string): Promise<AudioBuffer | null> => {
        if (!audioCtxRef.current) return null;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioCtxRef.current.decodeAudioData(arrayBuffer);
        } catch (err) {
            return null;
        }
    };

    const fadeOutAndStop = (source: AudioBufferSourceNode | null, gain: GainNode | null, filter?: BiquadFilterNode | null, fadeDuration: number = 1.5) => {
        if (!gain || !audioCtxRef.current || !source) return;
        const ctx = audioCtxRef.current;
        try {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDuration);
        } catch (e) { }

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                if (filter) filter.disconnect();
                gain.disconnect();
                if (drumFadingSourceRef.current === source) drumFadingSourceRef.current = null;
            } catch (e) { }
        }, fadeDuration * 1000 + 100);
    };
};
