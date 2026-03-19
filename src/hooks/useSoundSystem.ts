import { useRef, useCallback } from 'react';

export const useSoundSystem = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const playSound = useCallback((buffer: AudioBuffer) => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const doPlay = () => {
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        };
        if (ctx.state === 'suspended') {
            ctx.resume().then(doPlay).catch(() => {});
        } else {
            doPlay();
        }
    }, []);

    const triggerHaptic = useCallback((duration: number = 20) => {
        if (navigator && typeof navigator.vibrate === 'function') {
            // Dampen haptics to be more subtle as per user feedback
            const dampenedDuration = Math.max(1, Math.floor(duration * 0.5));
            navigator.vibrate(dampenedDuration);
        }
    }, []);

    return {
        audioCtxRef,
        initAudio,
        playSound,
        triggerHaptic
    };
};
