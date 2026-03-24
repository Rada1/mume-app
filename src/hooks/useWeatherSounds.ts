import { useEffect, useRef } from 'react';
import { WeatherType } from '../types';

interface WeatherSoundsDeps {
    weather: WeatherType;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
}

export const useWeatherSounds = ({ weather, isSoundEnabled, audioCtxRef }: WeatherSoundsDeps) => {
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const currentGainRef = useRef<GainNode | null>(null);
    const lastWeatherRef = useRef<WeatherType | null>(null);

    useEffect(() => {
        if (!isSoundEnabled || !weather || weather === 'clear' || weather === 'none' || !audioCtxRef.current) {
            fadeOutAndStop();
            lastWeatherRef.current = weather;
            return;
        }

        if (weather === lastWeatherRef.current) return;
        lastWeatherRef.current = weather;

        if (weather === 'rain' || weather === 'heavy-rain') {
            playWeatherAmbient('/assets/Sounds/Sound effects/rain.mp3');
        } else {
            fadeOutAndStop();
        }

    }, [weather, isSoundEnabled]);

    const fadeOutAndStop = () => {
        if (currentGainRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            const gain = currentGainRef.current;
            const source = currentSourceRef.current;
            
            try {
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
                setTimeout(() => {
                    source?.stop();
                    source?.disconnect();
                    gain.disconnect();
                }, 2100);
            } catch (e) {
                source?.stop();
            }
            
            currentGainRef.current = null;
            currentSourceRef.current = null;
        }
    };

    const playWeatherAmbient = async (url: string) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        try {
            const response = await fetch(url);
            if (!response.ok) return;
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Fade out previous if any
            const oldGain = currentGainRef.current;
            const oldSource = currentSourceRef.current;
            if (oldGain) {
                try {
                    oldGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
                    setTimeout(() => {
                        oldSource?.stop();
                        oldSource?.disconnect();
                        oldGain.disconnect();
                    }, 2100);
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
            // Balanced volume across weather effects
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);

            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);

            currentSourceRef.current = source;
            currentGainRef.current = gain;

        } catch (err) {
            console.error('[WeatherSounds] Failed to play ambient:', url, err);
        }
    };
};
