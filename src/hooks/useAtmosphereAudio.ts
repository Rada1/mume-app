import { useEffect } from 'react';
import { FX_THRESHOLD } from '../constants';

interface AtmosphereAudioDeps {
    hpRatio: number;
    manaRatio: number;
    moveRatio: number;
    hpRowRef: React.RefObject<HTMLDivElement>;
    manaRowRef: React.RefObject<HTMLDivElement>;
    moveRowRef: React.RefObject<HTMLDivElement>;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    isSoundEnabledRef: React.MutableRefObject<boolean>;
}

export const useAtmosphereAudio = ({
    hpRatio,
    manaRatio,
    moveRatio,
    hpRowRef,
    manaRowRef,
    moveRowRef,
    audioCtxRef,
    isSoundEnabledRef
}: AtmosphereAudioDeps) => {

    // --- Heartbeat Logic ---
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (hpRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - hpRatio));
            const duration = 0.5 + (2.5 * hpRatio);
            hpRowRef.current.style.setProperty('--pulse-intensity', intensity.toString());
            hpRowRef.current.style.animation = `heartbeat-pulse ${duration}s ease-in-out`;
        }

        const playHeartbeat = () => {
            if (!audioCtxRef.current || hpRatio > FX_THRESHOLD) {
                if (hpRowRef.current) hpRowRef.current.style.animation = 'none';
                timeoutId = setTimeout(playHeartbeat, 1000);
                return;
            }

            const ctx = audioCtxRef.current;
            const duration = 0.5 + (2.5 * hpRatio);
            const intensity = 0.3 + (0.7 * (1 - hpRatio));

            if (hpRowRef.current) {
                hpRowRef.current.style.setProperty('--pulse-intensity', intensity.toString());
                hpRowRef.current.style.animation = 'none';
                void hpRowRef.current.offsetWidth;
                hpRowRef.current.style.animation = `heartbeat-pulse ${duration}s ease-in-out`;
            }

            if (isSoundEnabledRef.current) {
                // Lub
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(42, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.4 * intensity, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.25);

                // Dub
                const dubDelay = duration * 0.3 * 1000;
                setTimeout(() => {
                    if (!audioCtxRef.current) return;
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(35, ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + 0.1);
                    gain2.gain.setValueAtTime(0.3 * intensity, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start();
                    osc2.stop(ctx.currentTime + 0.25);
                }, dubDelay);
            }

            timeoutId = setTimeout(playHeartbeat, duration * 1000);
        };

        playHeartbeat();
        return () => clearTimeout(timeoutId);
    }, [hpRatio, hpRowRef, audioCtxRef, isSoundEnabledRef]);

    // --- Breath Logic ---
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (moveRowRef.current) {
            const intensity = 0.3 + (0.7 * (1 - moveRatio));
            const duration = 0.5 + (3.5 * moveRatio);
            moveRowRef.current.style.setProperty('--breath-intensity', intensity.toString());
            moveRowRef.current.style.animation = `breath-pulse ${duration}s infinite ease-in-out`;
        }

        const playBreath = () => {
            if (!audioCtxRef.current || moveRatio > FX_THRESHOLD) {
                timeoutId = setTimeout(playBreath, 2000);
                return;
            }

            const ctx = audioCtxRef.current;
            const duration = 0.5 + (3.5 * moveRatio);
            const intensity = 1 - moveRatio;

            // Pink Noise
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                b6 = white * 0.115926;
                data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                data[i] *= 0.11;
            }

            const playHalfBreath = (startTime: number, len: number, isExhale: boolean) => {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true;

                const lowPass = ctx.createBiquadFilter();
                lowPass.type = 'lowpass';
                const highPass = ctx.createBiquadFilter();
                highPass.type = 'highpass';
                highPass.frequency.value = 100;

                if (isExhale) {
                    lowPass.frequency.setValueAtTime(600, startTime);
                    lowPass.frequency.exponentialRampToValueAtTime(400, startTime + len);
                    lowPass.Q.value = 1;
                } else {
                    lowPass.frequency.setValueAtTime(400, startTime);
                    lowPass.frequency.exponentialRampToValueAtTime(800, startTime + len);
                    lowPass.Q.value = 2;
                }

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.15 * intensity, startTime + len * (isExhale ? 0.3 : 0.6));
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + len);

                source.connect(highPass);
                highPass.connect(lowPass);
                lowPass.connect(gain);
                gain.connect(ctx.destination);

                source.start(startTime);
                source.stop(startTime + len + 0.1);
            };

            const breathCycle = duration;
            const now = ctx.currentTime;

            if (isSoundEnabledRef.current) {
                playHalfBreath(now, breathCycle * 0.4, false);
                playHalfBreath(now + breathCycle * 0.45, breathCycle * 0.5, true);
            }

            timeoutId = setTimeout(playBreath, breathCycle * 1000);
        };

        playBreath();
        return () => clearTimeout(timeoutId);
    }, [moveRatio, moveRowRef, audioCtxRef, isSoundEnabledRef]);

    // --- Mana Pulse Logic ---
    useEffect(() => {
        const el = manaRowRef.current;
        if (!el) return;
        let active = true;
        let timeoutId: NodeJS.Timeout;

        const loop = () => {
            if (!active) return;
            const baseDelay = 100 + (1400 * manaRatio);
            const intensity = 0.4 + (0.6 * (1 - manaRatio));
            const isSpark = Math.random() < (0.2 + (0.3 * (1 - manaRatio)));
            let boxShadow = `0 0 ${5 * intensity}px rgba(168, 85, 247, ${0.3 * intensity})`;
            if (isSpark) {
                boxShadow = `0 0 ${15 * intensity}px rgba(216, 180, 254, ${0.8 * intensity}), inset 0 0 ${5 * intensity}px rgba(168, 85, 247, 0.8)`;
            }
            el.style.boxShadow = boxShadow;
            el.style.transition = `box-shadow ${baseDelay * 0.4}ms ease-out`;
            timeoutId = setTimeout(loop, baseDelay * (0.8 + Math.random() * 0.4));
        };

        loop();
        return () => {
            active = false;
            clearTimeout(timeoutId);
        };
    }, [manaRatio, manaRowRef]);

};
