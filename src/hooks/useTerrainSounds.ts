import { useEffect, useRef } from 'react';

interface TerrainSoundsDeps {
    currentTerrain: string;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    lighting?: string;
    isSleeping?: boolean;
}

const TERRAIN_SOUND_MAP: Record<string, string> = {
    'FOREST': '/assets/Sounds/Terrain Sounds/forest.mp3',
    'FIELD': '/assets/Sounds/Terrain Sounds/dayfield.wav',
    'HILLS': '/assets/Sounds/Terrain Sounds/mountains.wav',
    'MOUNTAINS': '/assets/Sounds/Terrain Sounds/mountains.wav',
    'MOUNTAIN': '/assets/Sounds/Terrain Sounds/mountains.wav',
    'TUNNEL': '/assets/Sounds/Terrain Sounds/cave_tunnel.mp3',
    'CAVE': '/assets/Sounds/Terrain Sounds/cave_tunnel.mp3',
};

export const useTerrainSounds = ({ currentTerrain, isSoundEnabled, audioCtxRef, lighting, isSleeping }: TerrainSoundsDeps) => {
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const currentGainRef = useRef<GainNode | null>(null);
    const lastTerrainRef = useRef<string | null>(null);
    const lastLightingRef = useRef<string | null>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const FADE_TIME = 2.0; // Seconds

    // --- State for Pause/Resume ---
    const bufferCacheRef = useRef<Record<string, AudioBuffer>>({});
    const pausePositionsRef = useRef<Record<string, number>>({});
    const startTimeRef = useRef<number>(0);
    const activeUrlRef = useRef<string | null>(null);

    // --- Logic Section ---

    const saveCurrentPosition = () => {
        if (activeUrlRef.current && currentSourceRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            const elapsed = ctx.currentTime - startTimeRef.current;
            const buffer = currentSourceRef.current.buffer;
            if (buffer) {
                const previousOffset = pausePositionsRef.current[activeUrlRef.current] || 0;
                const newOffset = (previousOffset + elapsed) % buffer.duration;
                pausePositionsRef.current[activeUrlRef.current] = newOffset;
                console.log(`[TerrainSounds] Saved position for ${activeUrlRef.current}: ${newOffset.toFixed(2)}s`);
            }
        }
    };

    useEffect(() => {
        if (!isSoundEnabled || !currentTerrain || !audioCtxRef.current || isSleeping) {
            fadeOutAndStop();
            lastTerrainRef.current = null;
            lastLightingRef.current = null;
            return;
        }

        const terrainKey = currentTerrain.toUpperCase();
        if (terrainKey === lastTerrainRef.current && lighting === lastLightingRef.current) return;
        
        lastTerrainRef.current = terrainKey;
        lastLightingRef.current = lighting || null;

        // Try exact match first, then partial match
        let soundUrl = TERRAIN_SOUND_MAP[terrainKey];
        if (!soundUrl) {
            const foundKey = Object.keys(TERRAIN_SOUND_MAP).find(k => terrainKey.includes(k));
            if (foundKey) soundUrl = TERRAIN_SOUND_MAP[foundKey];
        }
        
        // Dynamic overrides for time of day
        const isDay = lighting === 'sun';
        
        // Open-air terrains that change significantly with light
        if (terrainKey.includes('FIELD') || terrainKey.includes('ROAD') || terrainKey.includes('BRUSH')) {
            if (isDay) {
                soundUrl = '/assets/Sounds/Terrain Sounds/dayfield.wav';
            } else {
                // Return null to silence these open areas at night (simulates quiet wilderness)
                soundUrl = '';
            }
        }

        if (!soundUrl) {
            fadeOutAndStop();
            return;
        }

        playTerrainAmbient(soundUrl);

    }, [currentTerrain, isSoundEnabled, lighting, isSleeping]);

    const fadeOutAndStop = () => {
        saveCurrentPosition();

        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        if (currentGainRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            const gain = currentGainRef.current;
            const source = currentSourceRef.current;
            
            console.log('[TerrainSounds] Fading out terrain audio');
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_TIME);
            
            fadeTimeoutRef.current = setTimeout(() => {
                if (currentSourceRef.current === source) {
                    try {
                        source?.stop();
                        source?.disconnect();
                        gain.disconnect();
                    } catch (e) { }
                    currentGainRef.current = null;
                    currentSourceRef.current = null;
                    activeUrlRef.current = null;
                }
            }, FADE_TIME * 1000 + 100);
        }
    };

    const playTerrainAmbient = async (url: string) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        // Save position of what's currently playing before we switch
        saveCurrentPosition();

        try {
            let audioBuffer = bufferCacheRef.current[url];

            if (!audioBuffer) {
                const response = await fetch(url);
                if (!response.ok) return;
                
                // Safety check: Don't try to decode if we got HTML (often a 404 fallback)
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    return;
                }

                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                bufferCacheRef.current[url] = audioBuffer;
            }

            // Fade out previous immediately
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
                fadeTimeoutRef.current = null;
            }

            const oldGain = currentGainRef.current;
            const oldSource = currentSourceRef.current;
            if (oldGain) {
                try {
                    oldGain.gain.cancelScheduledValues(ctx.currentTime);
                    oldGain.gain.setValueAtTime(oldGain.gain.value, ctx.currentTime);
                    oldGain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_TIME);
                    setTimeout(() => {
                        try {
                            oldSource?.stop();
                            oldSource?.disconnect();
                            oldGain.disconnect();
                        } catch (e) { }
                    }, FADE_TIME * 1000 + 100);
                } catch (e) {
                    oldSource?.stop();
                }
            }

            // Play new (or resume current)
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            // Balanced volume level (0.25)
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + FADE_TIME);

            source.connect(gain);
            gain.connect(ctx.destination);
            
            const startOffset = pausePositionsRef.current[url] || 0;
            source.start(0, startOffset % audioBuffer.duration);

            currentSourceRef.current = source;
            currentGainRef.current = gain;
            activeUrlRef.current = url;
            startTimeRef.current = ctx.currentTime;

        } catch (err) {
            console.error('[TerrainSounds] Failed to play ambient:', url, err);
        }
    };
};
