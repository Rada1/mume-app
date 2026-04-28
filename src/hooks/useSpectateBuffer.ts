import { useState, useEffect, useCallback, useRef } from 'react';

export const useSpectateBuffer = () => {
    // displayCutoff: messages with timestamp <= this are shown.
    // Infinity = live (show everything)
    const [displayCutoff, setDisplayCutoff] = useState<number>(Infinity);
    const [isPlaying, setIsPlaying] = useState(false);

    // When playing from an earlier point, advance displayCutoff in real-time
    // until it catches up to live (Infinity).
    const playOriginRef = useRef<{ wallTime: number; mediaCutoff: number } | null>(null);

    useEffect(() => {
        if (!isPlaying) return;
        const timer = setInterval(() => {
            if (!playOriginRef.current) return;
            const elapsed = Date.now() - playOriginRef.current.wallTime;
            const next = playOriginRef.current.mediaCutoff + elapsed;
            if (next >= Date.now() - 500) {
                // Caught up — snap to live
                setDisplayCutoff(Infinity);
                setIsPlaying(false);
                playOriginRef.current = null;
            } else {
                setDisplayCutoff(next);
            }
        }, 200);
        return () => clearInterval(timer);
    }, [isPlaying]);

    const isLive = displayCutoff === Infinity;

    // Seek to a specific timestamp and pause there
    const seekTo = useCallback((ts: number) => {
        setIsPlaying(false);
        playOriginRef.current = null;
        setDisplayCutoff(ts);
    }, []);

    // Start playing forward from current displayCutoff
    const play = useCallback(() => {
        setIsPlaying(true);
        playOriginRef.current = {
            wallTime: Date.now(),
            mediaCutoff: displayCutoff === Infinity ? Date.now() : displayCutoff,
        };
    }, [displayCutoff]);

    const pause = useCallback(() => {
        setIsPlaying(false);
        playOriginRef.current = null;
    }, []);

    // Jump to a point N ms in the past and start playing
    const goBack = useCallback((ms: number) => {
        const cutoff = Date.now() - ms;
        setDisplayCutoff(cutoff);
        setIsPlaying(true);
        playOriginRef.current = { wallTime: Date.now(), mediaCutoff: cutoff };
    }, []);

    // Return to live immediately
    const jumpToLive = useCallback(() => {
        setDisplayCutoff(Infinity);
        setIsPlaying(false);
        playOriginRef.current = null;
    }, []);

    const clear = useCallback(() => {
        setDisplayCutoff(Infinity);
        setIsPlaying(false);
        playOriginRef.current = null;
    }, []);

    return {
        isLive,
        isPlaying,
        displayCutoff,
        seekTo,
        play,
        pause,
        goBack,
        jumpToLive,
        clear,
    };
};
