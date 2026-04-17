import { useRef, useCallback, useEffect } from 'react';

export const useSoundSystem = (isSoundEnabled: boolean = true) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const clickSoundRef = useRef<AudioBuffer | null>(null);
    const hitImpactSoundRef = useRef<AudioBuffer | null>(null);
    const commMessageSoundRef = useRef<AudioBuffer | null>(null);
    const incantationsSoundRef = useRef<AudioBuffer | null>(null);
    const magicExplosionSoundRef = useRef<AudioBuffer | null>(null);
    const activeIncantationRef = useRef<{ source: AudioBufferSourceNode, gain: GainNode } | null>(null);
    const activeCommMessageRef = useRef<{ source: AudioBufferSourceNode, gain: GainNode } | null>(null);
    const oofSoundRef = useRef<AudioBuffer | null>(null);
    const slashSoundRef = useRef<AudioBuffer | null>(null);
    const cleaveSoundRef = useRef<AudioBuffer | null>(null);
    const smiteSoundRef = useRef<AudioBuffer | null>(null);
    const pierceSoundRef = useRef<AudioBuffer | null>(null);
    const stabSoundRef = useRef<AudioBuffer | null>(null);
    const buySellSoundRef = useRef<AudioBuffer | null>(null);
    const bashSoundRef = useRef<AudioBuffer | null>(null);



    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const loadingRefs = useRef<Record<string, boolean>>({});

    const loadClickSound = useCallback(async () => {
        if (!audioCtxRef.current || clickSoundRef.current || loadingRefs.current['click']) return;
        loadingRefs.current['click'] = true;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/click.wav');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            clickSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load click sound:', err);
        }
    }, []);

    const playSound = useCallback((buffer: AudioBuffer, options?: { pitch?: number, reverse?: boolean, volume?: number, label?: string, filterFrequency?: number }) => {
        if (!audioCtxRef.current || !isSoundEnabled) {
            return;
        }
        if (options?.label) console.log(`[Sound] Playing: ${options.label}`, { pitch: options.pitch, volume: options.volume });
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
            ctx.resume().then(doPlay).catch((err) => { console.error('[Sound] Resume failed:', err); });
        } else {
            doPlay();
        }
    }, [isSoundEnabled]);

    const movementSoundRef = useRef<AudioBuffer | null>(null);
    const loadMovementSound = useCallback(async () => {
        if (!audioCtxRef.current || movementSoundRef.current) return;
        const url = '/assets/Sounds/Sound effects/move.mp3';
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
            if (!audioCtxRef.current) initAudio();
            if (!audioCtxRef.current) return;
            try {
                const url = '/assets/Sounds/Sound effects/move.mp3';
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                movementSoundRef.current = audioBuffer;
            } catch (err) {
                console.error('[Sound] Failed to load movement sound:', err);
                return;
            }
        }

        const buffer = movementSoundRef.current;
        if (!buffer) return;


        if (isRiding) {
            // Mimic horse gallop: two beats (4 legs) in the same time as one human step
            // Doubled speed as requested
            const playbackRate = 2.0;
            playSound(buffer, { pitch: playbackRate, label: 'move-riding-1' });
            
            // Play second beat after the first one finishes (at 2x speed, it takes half the duration)
            setTimeout(() => {
                playSound(buffer, { pitch: playbackRate, label: 'move-riding-2' });
            }, (buffer.duration / 2.0) * 1000);
        } else {
            // Single snappy footfall for walking
            playSound(buffer, { pitch: 1.05, label: 'move-step' });
        }
    }, [playSound, isSoundEnabled, initAudio]);

    const playClickSound = useCallback(() => {
        if (clickSoundRef.current) {
            playSound(clickSoundRef.current, { volume: 0.7 });
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
        if (doorSoundRef.current) {
            playSound(doorSoundRef.current, { pitch: isOpen ? 1.0 : 0.8, volume: 3.0 });
        } else {
            // Load and then play if successful
            if (!audioCtxRef.current) {
                initAudio();
            }
            if (!audioCtxRef.current) {
                return;
            }
            try {
                const response = await fetch('/assets/Sounds/Sound effects/door1.wav');
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
                doorSoundRef.current = audioBuffer;
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

    const playHitImpactSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (hitImpactSoundRef.current) {
            playSound(hitImpactSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume 
            });
        } else {
            loadHitImpactSound();
        }
    }, [loadHitImpactSound, playSound]);

    const loadOofSound = useCallback(async () => {
        if (!audioCtxRef.current || oofSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/oof.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            oofSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load oof sound:', err);
        }
    }, []);

    const playOofSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (oofSoundRef.current) {
            playSound(oofSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume || 1.2 
            });
        } else {
            loadOofSound();
        }
    }, [loadOofSound, playSound]);

    const loadSlashSound = useCallback(async () => {
        if (!audioCtxRef.current || slashSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/slash.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            slashSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load slash sound:', err);
        }
    }, []);

    const playSlashSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (slashSoundRef.current) {
            playSound(slashSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume || 1.0 
            });
        } else {
            loadSlashSound();
        }
    }, [loadSlashSound, playSound]);

    const loadCleaveSound = useCallback(async () => {
        if (!audioCtxRef.current || cleaveSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/cleave.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            cleaveSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load cleave sound:', err);
        }
    }, []);

    const playCleaveSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (cleaveSoundRef.current) {
            playSound(cleaveSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume || 1.0 
            });
        } else {
            loadCleaveSound();
        }
    }, [loadCleaveSound, playSound]);

    const loadSmiteSound = useCallback(async () => {
        if (!audioCtxRef.current || smiteSoundRef.current || loadingRefs.current['smite']) return;
        loadingRefs.current['smite'] = true;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/smite.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            smiteSoundRef.current = audioBuffer;
            console.log('[Sound] Smite sound loaded successfully');
        } catch (err) {
            console.error('Failed to load smite sound:', err);
        } finally {
            loadingRefs.current['smite'] = false;
        }
    }, []);

    const playSmiteSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (smiteSoundRef.current) {
            playSound(smiteSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume || 1.0,
                filterFrequency: 1800, // Reduced muffle intensity (was 800Hz)
                label: 'smite'
            });
        } else {
            console.warn('[Sound] Smite sound not ready, triggering load');
            loadSmiteSound();
        }
    }, [loadSmiteSound, playSound]);

    const loadPierceSound = useCallback(async () => {
        if (!audioCtxRef.current || pierceSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/pierce.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            pierceSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load pierce sound:', err);
        }
    }, []);

    const playPierceSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (pierceSoundRef.current) {
            // Apply a substantial 1.6x base pitch shift to all pierce variations
            const shiftedPitch = (options?.pitch ?? 1.0) * 1.6;
            playSound(pierceSoundRef.current, { 
                pitch: shiftedPitch,
                volume: options?.volume || 1.0 
            });
        } else {
            loadPierceSound();
        }
    }, [loadPierceSound, playSound]);

    const loadStabSound = useCallback(async () => {
        if (!audioCtxRef.current || stabSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/stab.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            stabSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load stab sound:', err);
        }
    }, []);

    const playStabSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        if (stabSoundRef.current) {
            playSound(stabSoundRef.current, { 
                pitch: options?.pitch,
                volume: options?.volume || 1.0 
            });
        } else {
            loadStabSound();
        }
    }, [loadStabSound, playSound]);

    const loadCommMessageSound = useCallback(async () => {
        if (!audioCtxRef.current || commMessageSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/commbubble.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            commMessageSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load comm message sound:', err);
        }
    }, []);

    const stopCommMessageSound = useCallback(() => {

        if (!activeCommMessageRef.current || !audioCtxRef.current) return;
        const { source, gain } = activeCommMessageRef.current;
        const ctx = audioCtxRef.current;
        
        try {
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
            setTimeout(() => {
                try {
                    source.stop();
                    source.disconnect();
                    gain.disconnect();
                } catch (e) { }
            }, 50);
        } catch (e) { }
        activeCommMessageRef.current = null;
    }, []);

    const playCommMessageSound = useCallback((options?: { volume?: number }) => {
        if (!audioCtxRef.current || !isSoundEnabled || !commMessageSoundRef.current) {
            if (!commMessageSoundRef.current) loadCommMessageSound();
            return;
        }

        // Stop previous if exists
        stopCommMessageSound();

        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = commMessageSoundRef.current;
        
        const gain = ctx.createGain();
        gain.gain.value = options?.volume || 1.2;

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        activeCommMessageRef.current = { source, gain };
    }, [loadCommMessageSound, stopCommMessageSound, isSoundEnabled]);


    const loadBuySellSound = useCallback(async () => {
        if (!audioCtxRef.current || buySellSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/sellandbuy.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            buySellSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load buy/sell sound:', err);
        }
    }, []);

    const playBuySellSound = useCallback((options?: { volume?: number }) => {
        if (buySellSoundRef.current) {
            playSound(buySellSoundRef.current, { volume: options?.volume || 1.0, label: 'Buy/Sell' });
        } else {
            loadBuySellSound();
        }
    }, [loadBuySellSound, playSound]);

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
        if (!audioCtxRef.current || !isSoundEnabled) return;
        if (!incantationsSoundRef.current) {
            loadSpellSounds().then(() => {
                if (incantationsSoundRef.current) playIncantationSound();
            });
            return;
        }
        if (activeIncantationRef.current) return;

        const ctx = audioCtxRef.current;
        const source = ctx.createBufferSource();
        source.buffer = incantationsSoundRef.current;
        source.loop = true;
        // High-pitched: 1.5x base speed + small jitter
        source.playbackRate.value = 1.5 + (Math.random() * 0.1 - 0.05);

        const muffler = ctx.createBiquadFilter();
        muffler.type = 'lowpass';
        muffler.frequency.value = 2200; // Muffled effect (cutting highs)

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.3);

        source.connect(muffler);
        muffler.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        activeIncantationRef.current = { source, gain };
    }, [loadSpellSounds, isSoundEnabled]);

    const stopIncantationSound = useCallback((playExplosion: boolean = false) => {
        if (!activeIncantationRef.current || !audioCtxRef.current) return;
        const { source, gain } = activeIncantationRef.current;
        const ctx = audioCtxRef.current;

        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

        if (playExplosion) playMagicExplosionSound();

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                gain.disconnect();
            } catch (e) { }
        }, 150);

        activeIncantationRef.current = null;
    }, [playMagicExplosionSound]);

    const loadAllWeaponSounds = useCallback(() => {
        console.log('[Sound] Pre-loading all game sounds...');
        loadSlashSound();
        loadCleaveSound();
        loadSmiteSound();
        loadPierceSound();
        loadStabSound();
        loadHitImpactSound();
        loadOofSound();
        loadCommMessageSound();
        loadBuySellSound();
        loadSpellSounds();
    }, [loadSlashSound, loadCleaveSound, loadSmiteSound, loadPierceSound, loadStabSound, loadHitImpactSound, loadOofSound, loadCommMessageSound, loadBuySellSound, loadSpellSounds]);

    const loadBashSound = useCallback(async () => {
        if (!audioCtxRef.current || bashSoundRef.current) return;
        try {
            const response = await fetch('/assets/Sounds/Sound effects/bash.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            bashSoundRef.current = audioBuffer;
        } catch (err) {
            console.error('Failed to load bash sound:', err);
        }
    }, []);

    const playBashSound = useCallback((options?: { pitch?: number, volume?: number }) => {
        const pitch = options?.pitch ?? (0.9 + Math.random() * 0.2);
        const volume = options?.volume ?? 1.0;
        if (bashSoundRef.current) {
            playSound(bashSoundRef.current, { pitch, volume, label: 'bash' });
        } else {
            loadBashSound().then(() => {
                if (bashSoundRef.current) playSound(bashSoundRef.current, { pitch, volume, label: 'bash' });
            });
        }
    }, [playSound, loadBashSound]);

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
        playOofSound,
        loadOofSound,
        playSlashSound,
        loadSlashSound,
        playCleaveSound,
        loadCleaveSound,
        playSmiteSound,
        loadSmiteSound,
        playPierceSound,
        loadPierceSound,
        playStabSound,
        loadStabSound,
        playBuySellSound,
        loadBuySellSound,
        playBashSound,
        loadBashSound,
        loadAllWeaponSounds,
        playCommMessageSound,
        stopCommMessageSound,
        loadCommMessageSound,
        playIncantationSound,
        stopIncantationSound,
        playMagicExplosionSound,
        loadSpellSounds,
        triggerHaptic
    };
};
