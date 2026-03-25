import { useEffect, useRef } from 'react';

interface TerrainSoundsDeps {
    currentTerrain: string;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    lighting?: string;
    isSleeping?: boolean;
}

const TERRAIN_SOUND_MAP: Record<string, string> = {
    'CITY': '/assets/Sounds/Terrain Sounds/city.mp3',
    'INSIDE': '/assets/Sounds/Terrain Sounds/inside.mp3',
    'FOREST': '/assets/Sounds/Terrain Sounds/forest.mp3',
    'FIELD': '/assets/Sounds/Terrain Sounds/field.mp3',
    'HILLS': '/assets/Sounds/Terrain Sounds/hills.mp3',
    'MOUNTAIN': '/assets/Sounds/Terrain Sounds/mountain.mp3',
    'WATER': '/assets/Sounds/Terrain Sounds/water.mp3',
    'TUNNEL': '/assets/Sounds/Terrain Sounds/tunnel.mp3',
};

export const useTerrainSounds = ({ currentTerrain, isSoundEnabled, audioCtxRef, lighting, isSleeping }: TerrainSoundsDeps) => {
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const currentGainRef = useRef<GainNode | null>(null);
    const lastTerrainRef = useRef<string | null>(null);
    const lastLightingRef = useRef<string | null>(null);

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

        let soundUrl = TERRAIN_SOUND_MAP[terrainKey];
        
        // Dynamic overrides for time of day: Open-air terrains during the day
        const isOpenAirTerrain = ['FIELD', 'ROAD', 'BRUSH', 'HILLS', 'HILL'].includes(terrainKey);
        const isDay = lighting === 'sun';
        
        if (isOpenAirTerrain) {
            if (isDay) {
                soundUrl = '/assets/Sounds/Terrain Sounds/dayfield.wav';
            } else {
                // Return null to silence these areas at night for now
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
        if (currentGainRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            const gain = currentGainRef.current;
            const source = currentSourceRef.current;
            
            console.log('[TerrainSounds] Fading out terrain audio');
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
            
            setTimeout(() => {
                try {
                    source?.stop();
                    source?.disconnect();
                    gain.disconnect();
                } catch (e) { }
            }, 3100);
            
            currentGainRef.current = null;
            currentSourceRef.current = null;
        }
    };

    const playTerrainAmbient = async (url: string) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        try {
            const response = await fetch(url);
            if (!response.ok) return;
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Fade out previous
            const oldGain = currentGainRef.current;
            const oldSource = currentSourceRef.current;
            if (oldGain) {
                try {
                    oldGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
                    setTimeout(() => {
                        oldSource?.stop();
                        oldSource?.disconnect();
                        oldGain.disconnect();
                    }, 1600);
                } catch (e) {
                    oldSource?.stop();
                }
            }

            // Play new
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            // Balanced volume level (0.5)
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 3);

            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);

            currentSourceRef.current = source;
            currentGainRef.current = gain;

        } catch (err) {
            console.error('[TerrainSounds] Failed to play ambient:', url, err);
        }
    };
};
