import { useRef, useCallback, useEffect } from 'react';

export const useSoundSystem = (isSoundEnabled: boolean = true) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const clickSoundRef = useRef<AudioBuffer | null>(null);
    const hitImpactSoundRef = useRef<AudioBuffer | null>(null);
    const incantationsSoundRef = useRef<AudioBuffer | null>(null);
    const magicExplosionSoundRef = useRef<AudioBuffer | null>(null);
    const activeIncantationRef = useRef<{ source: AudioBufferSourceNode, gain: GainNode } | null>(null);

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const loadClickSound = useCallback(async () => {
        if (!audioCtxRef.current || clickSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/click.wav');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            clickSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load click sound:', err);
        }
    }, []);

    const playSound = useCallback((buffer: AudioBuffer, options?: { pitch?: number, reverse?: boolean, volume?: number }) => {
        if (!audioCtxRef.current || !isSoundEnabled) {
            console.log('[Sound] Play bypassed:', { ctx: !!audioCtxRef.current, enabled: isSoundEnabled });
            return;
        }
        const ctx = audioCtxRef.current;
        const doPlay = () => {
            let actualBuffer = buffer;
            if (options?.reverse) {
                // Create a reversed copy of the buffer
                const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
                for (let i = 0; i < buffer.numberOfChannels; i++) {
                    const channelData = buffer.getChannelData(i);
                    const reversedData = reversed.getChannelData(i);
                    for (let j = 0; j < buffer.length; j++) {
                        reversedData[j] = channelData[buffer.length - 1 - j];
                    }
                }
                actualBuffer = reversed;
            }

            const source = ctx.createBufferSource();
            source.buffer = actualBuffer;

            // Apply base pitch and add random jitter (+/- 5%) for natural variation
            const basePitch = options?.pitch ?? 1.0;
            const jitter = (Math.random() * 0.1 - 0.05);
            source.playbackRate.value = basePitch + jitter;

            // Volume control via GainNode
            const gainNode = ctx.createGain();
            gainNode.gain.value = options?.volume ?? 1.0;

            console.log('[Sound] Playing:', { pitch: basePitch + jitter, reverse: !!options?.reverse, volume: gainNode.gain.value });
            
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
        };
        if (ctx.state === 'suspended') {
            console.log('[Sound] Resuming context...');
            ctx.resume().then(doPlay).catch((err) => { console.error('[Sound] Resume failed:', err); });
        } else {
            doPlay();
        }
    }, [isSoundEnabled]);

    const movementSoundRef = useRef<AudioBuffer | null>(null);
    const loadMovementSound = useCallback(async () => {
        if (!audioCtxRef.current || movementSoundRef.current) return;
        const url = '/assets/Sounds/Sound effects/grassy-thud.wav';
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            movementSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load movement sound via WebAudio:', err);
            // We could add a secondary fallback here if needed, 
            // but usually the path fix is enough.
        }
    }, []);

    const playMovementSound = useCallback(async (isRiding: boolean = false) => {
        if (!audioCtxRef.current || !isSoundEnabled) return;

        if (!movementSoundRef.current) {
            console.log('[Sound] Movement sound not loaded, loading...');
            if (!audioCtxRef.current) initAudio();
            if (!audioCtxRef.current) return;
            try {
                const url = '/assets/Sounds/Sound effects/grassy-thud.wav';
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                movementSoundRef.current = audioBuffer;
                console.log('[Sound] Movement sound loaded');
            } catch (err) {
                console.error('[Sound] Failed to load movement sound:', err);
                return;
            }
        }

        const buffer = movementSoundRef.current;
        if (!buffer) return;

        console.log('[Sound] playMovementSound:', { isRiding });

        if (isRiding) {
            // "Clip"
            console.log('[Sound] Riding: Clip (down-pitch)');
            playSound(buffer, { pitch: 0.85 });
            // "Clop"
            setTimeout(() => {
                console.log('[Sound] Riding: Clop (up-pitch)');
                playSound(buffer, { pitch: 1.15 });
            }, 110);
        } else {
            // Normal footfall with slight jitter (already handled by playSound jitter)
            playSound(buffer);
        }
    }, [playSound, isSoundEnabled, initAudio]);

    const playClickSound = useCallback(() => {
        if (clickSoundRef.current) {
            playSound(clickSoundRef.current);
        } else {
            // If not loaded yet, try to load it (it will be ready for next time)
            loadClickSound();
        }
    }, [loadClickSound, playSound]);

    const doorSoundRef = useRef<AudioBuffer | null>(null);
    const loadDoorSound = useCallback(async () => {
        if (!audioCtxRef.current || doorSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/door1.wav');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            doorSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load door sound:', err);
        }
    }, []);

    const playDoorSound = useCallback(async (isOpen: boolean) => {
        console.log('[Sound] playDoorSound called:', isOpen);
        if (doorSoundRef.current) {
            playSound(doorSoundRef.current, { pitch: isOpen ? 1.0 : 0.8, volume: 3.0 });
        } else {
            console.log('[Sound] Loading door1.wav...');
            // Load and then play if successful
            if (!audioCtxRef.current) {
                console.log('[Sound] No AudioContext yet, initializing...');
                initAudio();
            }
            if (!audioCtxRef.current) {
                console.log('[Sound] Still no AudioContext after init, aborting load');
                return;
            }
            try {
                const response = await fetch('/assets/Sounds/Sound effects/door1.wav');
                console.log('[Sound] Fetch door1.wav status:', response.status);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                doorSoundRef.current = audioBuffer;
                console.log('[Sound] door1.wav loaded and ready');
                playSound(audioBuffer, { pitch: isOpen ? 1.0 : 0.8, volume: 3.0 });
            } catch (err) {
                console.error('[Sound] Failed to load door sound:', err);
            }
        }
    }, [playSound, initAudio]);

    const triggerHaptic = useCallback((duration: number = 20) => {
        if (navigator && typeof navigator.vibrate === 'function') {
            const dampenedDuration = Math.max(1, Math.floor(duration * 0.5));
            navigator.vibrate(dampenedDuration);
        }
    }, []);

    const playRandomSound = useCallback((buffers: AudioBuffer[]) => {
        if (!buffers || buffers.length === 0) return;
        const randomIndex = Math.floor(Math.random() * buffers.length);
        playSound(buffers[randomIndex]);
    }, [playSound]);

    const loadHitImpactSound = useCallback(async () => {
        if (!audioCtxRef.current || hitImpactSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/hit-impact.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            hitImpactSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load hit impact sound:', err);
        }
    }, []);

    const playHitImpactSound = useCallback((options?: { volume?: number }) => {
        if (hitImpactSoundRef.current) {
            playSound(hitImpactSoundRef.current, { volume: options?.volume });
        } else {
            loadHitImpactSound();
        }
    }, [loadHitImpactSound, playSound]);

    const loadSpellSounds = useCallback(async () => {
        if (!audioCtxRef.current) return;
        try {
            if (!incantationsSoundRef.current) {
                const res = await fetch('/assets/Sounds/Sound effects/incantations.mp3');
                const buf = await audioCtxRef.current.decodeAudioData(await res.arrayBuffer());
                incantationsSoundRef.current = buf;
            }
            if (!magicExplosionSoundRef.current) {
                const res = await fetch('/assets/Sounds/Sound effects/magicexplosion.mp3');
                const buf = await audioCtxRef.current.decodeAudioData(await res.arrayBuffer());
                magicExplosionSoundRef.current = buf;
            }
        } catch (err) {
            console.error('Failed to load spell sounds:', err);
        }
    }, []);

    const playMagicExplosionSound = useCallback((options?: { volume?: number }) => {
        if (magicExplosionSoundRef.current) {
            playSound(magicExplosionSoundRef.current, { volume: options?.volume || 2.0 });
        } else {
            loadSpellSounds();
        }
    }, [loadSpellSounds, playSound]);

    const playIncantationSound = useCallback(() => {
        if (!audioCtxRef.current || !incantationsSoundRef.current) {
            loadSpellSounds();
            return;
        }
        if (activeIncantationRef.current) return;

        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = incantationsSoundRef.current;
        source.loop = true;
        // Add random pitch jitter (+/- 5%) for natural variation
        source.playbackRate.value = 1.0 + (Math.random() * 0.1 - 0.05);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.3);

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        activeIncantationRef.current = { source, gain };
    }, [loadSpellSounds]);

    const stopIncantationSound = useCallback((playExplosion: boolean = false) => {
        if (!activeIncantationRef.current || !audioCtxRef.current) return;
        const { source, gain } = activeIncantationRef.current;
        const ctx = audioCtxRef.current;

        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        if (playExplosion) playMagicExplosionSound();

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                gain.disconnect();
            } catch (e) { }
        }, 300);

        activeIncantationRef.current = null;
    }, [playMagicExplosionSound]);

    return {
        audioCtxRef,
        initAudio,
        playSound,
        playRandomSound,
        playMovementSound,
        loadMovementSound,
        playDoorSound,
        loadDoorSound,
        playClickSound,
        loadClickSound,
        playHitImpactSound,
        loadHitImpactSound,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        triggerHaptic
    };
};
