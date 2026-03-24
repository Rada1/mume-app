import { useEffect, useRef } from 'react';
import { ZoneMusicMapping } from '../types';

interface ZoneMusicDeps {
    roomZone: string | null;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    zoneMusic: ZoneMusicMapping[];
    isInCombat?: boolean;
    lighting?: string;
}

const STATIC_MUSIC_MAP: Record<string, string> = {
    'Bree': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'the Old East Road': '/assets/Sounds/Zone Sounds/oldeastroad.mp3',
    'the Shire': '/assets/Music/shire.mp3',
    'the Blue Mountains': '/assets/Music/blue_mountains.mp3',
    'the Old Forest': '/assets/Music/old_forest.mp3',
    'the Barrow-downs': '/assets/Music/downs.mp3',
};

const FIGHT_MUSIC_URL = '/assets/Sounds/Sound effects/fight.mp3';

interface TrackState {
    source: AudioBufferSourceNode | null;
    gain: GainNode | null;
    url: string | null;
}

export const useZoneMusic = ({ roomZone, isSoundEnabled, audioCtxRef, zoneMusic, isInCombat, lighting }: ZoneMusicDeps) => {
    const zoneTrack = useRef<TrackState>({ source: null, gain: null, url: null });
    const combatTrack = useRef<TrackState>({ source: null, gain: null, url: null });
    const lastZoneRef = useRef<string | null>(null);
    const lastLightingRef = useRef<string | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isStoppingManualRef = useRef(false);

    // --- Main Logic ---
    useEffect(() => {
        if (!isSoundEnabled || !audioCtxRef.current) {
            stopAll();
            return;
        }

        // 1. Handle Combat Track Toggle (Combat music ALWAYS loops and plays regardless of day/night)
        updateCombatMusic();

        // 2. Handle Zone Track Updates
        const isDay = lighting === 'sun';
        const lightingChanged = isDay !== (lastLightingRef.current === 'sun');
        lastLightingRef.current = lighting || null;
        
        if (!isDay) {
            // Silence area music at night
            if (zoneTrack.current.source) {
                console.log('[ZoneMusic] Night detected, silencing area music.');
                isStoppingManualRef.current = true;
                fadeOutAndStop({ ...zoneTrack.current });
                zoneTrack.current = { source: null, gain: null, url: null };
                isStoppingManualRef.current = false;
            }
            return;
        }

        if (roomZone && (roomZone !== lastZoneRef.current || lightingChanged)) {
            console.log('[ZoneMusic] Zone changed to:', roomZone);
            lastZoneRef.current = roomZone;
            // Clear any pending silence timer when moving to a new area
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            updateZoneMusic();
        }

        // 3. Handle Volume Ducking based on Combat state
        updateVolumes();

    }, [roomZone, isSoundEnabled, isInCombat, zoneMusic, lighting]);

    const stopAll = () => {
        isStoppingManualRef.current = true;
        fadeOutAndStop(zoneTrack.current);
        fadeOutAndStop(combatTrack.current);
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        lastZoneRef.current = null;
        isStoppingManualRef.current = false;
    };

    const updateVolumes = () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const targetZoneVol = isInCombat ? 0.02 : 0.1;
        
        if (zoneTrack.current.gain) {
            const g = zoneTrack.current.gain.gain;
            g.cancelScheduledValues(ctx.currentTime);
            g.setValueAtTime(g.value, ctx.currentTime);
            g.linearRampToValueAtTime(targetZoneVol, ctx.currentTime + 3);
        }
    };

    const updateCombatMusic = async () => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;

        if (isInCombat) {
            if (!combatTrack.current.source) {
                console.log('[ZoneMusic] Starting Combat Music');
                const buffer = await loadAudio(FIGHT_MUSIC_URL);
                if (!buffer) return;

                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = true; // Combat music always loops normally

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);

                source.connect(gain);
                gain.connect(ctx.destination);
                
                // Random start offset but never start too close to the end
                const offset = Math.random() * Math.max(0, buffer.duration - 30);
                source.start(0, offset);

                combatTrack.current = { source, gain, url: FIGHT_MUSIC_URL };
            }
        } else {
            if (combatTrack.current.source) {
                console.log('[ZoneMusic] Fading out Combat Music');
                fadeOutAndStop(combatTrack.current);
                combatTrack.current = { source: null, gain: null, url: null };
            }
        }
    };

    const updateZoneMusic = async () => {
        if (!roomZone || !audioCtxRef.current) return;
        
        // Find matching URL
        const dynamicMatch = zoneMusic.find(m => m.zone.toLowerCase() === roomZone.toLowerCase());
        const rawUrl = dynamicMatch?.url || STATIC_MUSIC_MAP[roomZone] || STATIC_MUSIC_MAP[roomZone.replace(/^the\s+/i, '')];
        if (!rawUrl) {
            fadeOutAndStop(zoneTrack.current);
            zoneTrack.current = { source: null, gain: null, url: null };
            return;
        }

        const musicUrl = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
        if (musicUrl === zoneTrack.current.url && zoneTrack.current.source) return;

        console.log('[ZoneMusic] Loading Zone Music:', musicUrl);
        const buffer = await loadAudio(musicUrl);
        if (!buffer) return;

        const ctx = audioCtxRef.current;

        // Fade out previous zone track (passing a copy so we can clear the ref immediately)
        if (zoneTrack.current.source) {
            isStoppingManualRef.current = true;
            fadeOutAndStop({ ...zoneTrack.current });
            isStoppingManualRef.current = false;
        }

        // Start new zone track
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false; // We want silence between loops!

        source.onended = () => {
            // Only trigger silence timeout if the track finished naturally (not stopped by cross-fade/hook)
            if (!isStoppingManualRef.current && lastZoneRef.current === roomZone) {
                const silenceMinutes = 1 + Math.random() * 3; // 1-4 minutes of silence
                console.log(`[ZoneMusic] Track finished. Waiting ${silenceMinutes.toFixed(1)} minutes before looping.`);
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isSoundEnabled && lastZoneRef.current === roomZone) {
                        updateZoneMusic();
                    }
                }, silenceMinutes * 60 * 1000);
            }
        };

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        const targetVol = isInCombat ? 0.02 : 0.1;
        gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 3);

        source.connect(gain);
        gain.connect(ctx.destination);
        
        // Random start offset but never start too close to the end
        const offset = Math.random() * Math.max(0, buffer.duration - 30);
        source.start(0, offset);

        zoneTrack.current = { source, gain, url: musicUrl };
    };

    const loadAudio = async (url: string): Promise<AudioBuffer | null> => {
        if (!audioCtxRef.current) return null;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioCtxRef.current.decodeAudioData(arrayBuffer);
        } catch (err) {
            console.error('[ZoneMusic] Failed to load:', url, err);
            return null;
        }
    };

    const fadeOutAndStop = (track: TrackState) => {
        if (!track.gain || !audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const { source, gain } = track;

        console.log('[ZoneMusic] Fading out track:', track.url);
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
    };
};
