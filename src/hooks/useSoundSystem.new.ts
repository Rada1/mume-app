/**
 * @file useSoundSystem.ts (Data-Driven Refactor)
 * @description Orchestrates the loading and playback of game sounds using a central manifest.
 */

import { useRef, useCallback } from 'react';
import { AUDIO_MANIFEST, SoundConfig } from '../constants/audioManifest';
import { useSettingsStore } from '../stores/useSettingsStore';

export interface PlayOptions {
    pitch?: number;
    volume?: number;
    reverse?: boolean;
    filterFrequency?: number;
    label?: string;
}

export const useSoundSystem = (isSoundEnabled: boolean = true) => {
    const { masterVolume, sfxVolume } = useSettingsStore();
    const audioCtxRef = useRef<AudioContext | null>(null);
    const bufferCache = useRef<Map<string, AudioBuffer>>(new Map());
    const loadingState = useRef<Map<string, boolean>>(new Map());
    const activeLoops = useRef<Map<string, { source: AudioBufferSourceNode; gain: GainNode }>>(new Map());

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const loadSound = useCallback(async (key: string): Promise<AudioBuffer | null> => {
        const config = AUDIO_MANIFEST[key];
        if (!config || !audioCtxRef.current) return null;
        if (bufferCache.current.has(key)) return bufferCache.current.get(key)!;
        if (loadingState.current.get(key)) return null;

        loadingState.current.set(key, true);
        try {
            const response = await fetch(config.path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            bufferCache.current.set(key, audioBuffer);
            return audioBuffer;
        } catch (err) {
            console.error(`[Sound] Failed to load ${key}:`, err);
            return null;
        } finally {
            loadingState.current.set(key, false);
        }
    }, []);

    const playSound = useCallback(async (key: string, options?: PlayOptions) => {
        if (!isSoundEnabled) return;
        if (!audioCtxRef.current) initAudio();
        
        let buffer = bufferCache.current.get(key);
        if (!buffer) {
            buffer = await loadSound(key);
            if (!buffer) return;
        }

        const config = AUDIO_MANIFEST[key];
        const ctx = audioCtxRef.current!;

        const doPlay = () => {
            const source = ctx.createBufferSource();
            source.buffer = buffer!;

            // Pitch + Jitter
            const basePitch = options?.pitch ?? config.defaultPitch ?? 1.0;
            const jitter = (Math.random() * 0.24 - 0.12);
            source.playbackRate.value = basePitch + jitter;

            // Gain
            const gainNode = ctx.createGain();
            const baseVolume = options?.volume ?? config.defaultVolume ?? 1.0;
            gainNode.gain.value = baseVolume * masterVolume * sfxVolume;

            // Filter
            if (options?.filterFrequency) {
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = options.filterFrequency;
                source.connect(filter);
                filter.connect(gainNode);
            } else {
                source.connect(gainNode);
            }

            gainNode.connect(ctx.destination);
            source.start(0);
        };

        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        doPlay();
    }, [isSoundEnabled, initAudio, loadSound, masterVolume, sfxVolume]);

    const playLoop = useCallback(async (key: string, options?: PlayOptions) => {
        if (!isSoundEnabled || activeLoops.current.has(key)) return;
        if (!audioCtxRef.current) initAudio();

        let buffer = bufferCache.current.get(key);
        if (!buffer) {
            buffer = await loadSound(key);
            if (!buffer) return;
        }

        const config = AUDIO_MANIFEST[key];
        const ctx = audioCtxRef.current!;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = options?.pitch ?? config.defaultPitch ?? 1.0;

        const gain = ctx.createGain();
        const baseVolume = options?.volume ?? config.defaultVolume ?? 1.0;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(baseVolume * masterVolume * sfxVolume, ctx.currentTime + 0.3);

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        activeLoops.current.set(key, { source, gain });
    }, [isSoundEnabled, initAudio, loadSound, masterVolume, sfxVolume]);

    const stopLoop = useCallback((key: string, fadeOut: number = 0.1) => {
        const active = activeLoops.current.get(key);
        if (!active || !audioCtxRef.current) return;

        const { source, gain } = active;
        const ctx = audioCtxRef.current;
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOut);

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                gain.disconnect();
            } catch (e) {}
        }, fadeOut * 1000 + 50);

        activeLoops.current.delete(key);
    }, []);

    return {
        playSound,
        playLoop,
        stopLoop,
        initAudio,
        audioCtxRef,
        loadAll: () => Object.keys(AUDIO_MANIFEST).forEach(loadSound)
    };
};
