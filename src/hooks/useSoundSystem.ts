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
        if (audioCtxRef.current) {
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioCtxRef.current.destination);
            source.start(0);
        }
    }, []);

    const triggerHaptic = useCallback((duration: number = 20) => {
        if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(duration);
        }
    }, []);

    return {
        audioCtxRef,
        initAudio,
        playSound,
        triggerHaptic
    };
};
