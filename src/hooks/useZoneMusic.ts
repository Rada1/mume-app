import { useEffect, useRef } from 'react';
import { ZoneMusicMapping } from '../types';

interface ZoneMusicDeps {
    roomZone: string | null;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    zoneMusic: ZoneMusicMapping[];
    isInCombat?: boolean;
    lighting?: string;
    isSleeping?: boolean;
    gameState?: string;
}

const STATIC_MUSIC_MAP: Record<string, string | string[]> = {
    'bree': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'bree-land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'the bree-land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'old east road': [
        '/assets/Sounds/Zone Sounds/oldeastroad.mp3', 
        '/assets/Sounds/Zone Sounds/oldeastroad2.mp3'
    ],
    'the old east road': [
        '/assets/Sounds/Zone Sounds/oldeastroad.mp3', 
        '/assets/Sounds/Zone Sounds/oldeastroad2.mp3'
    ],
    'shire': [
        '/assets/Sounds/Zone Sounds/Shire1.mp3', 
        '/assets/Sounds/Zone Sounds/Shire2.mp3'
    ],
    'the shire': [
        '/assets/Sounds/Zone Sounds/Shire1.mp3', 
        '/assets/Sounds/Zone Sounds/Shire2.mp3'
    ],
    'blue mountains': '/assets/Sounds/Zone Sounds/Blue Mountains.mp3',
    'the blue mountains': '/assets/Sounds/Zone Sounds/Blue Mountains.mp3',
    'old forest': '/assets/Sounds/Zone Sounds/Old Forest.mp3',
    'the old forest': '/assets/Sounds/Zone Sounds/Old Forest.mp3',
    'rivendell': [
        '/assets/Sounds/Zone Sounds/Rivendell1.mp3', 
        '/assets/Sounds/Zone Sounds/Rivendell2.mp3', 
        '/assets/Sounds/Zone Sounds/Rivendell3.mp3'
    ],
    'grey havens': '/assets/Sounds/Zone Sounds/Gray Havens1.mp3',
    'the grey havens': '/assets/Sounds/Zone Sounds/Gray Havens1.mp3',
    'north anduin': [
        '/assets/Sounds/Zone Sounds/northanduin.mp3',
        '/assets/Sounds/Zone Sounds/North Anduin.mp3'
    ],
    'the northern anduin vale': [
        '/assets/Sounds/Zone Sounds/northanduin.mp3',
        '/assets/Sounds/Zone Sounds/North Anduin.mp3'
    ],
    'road to tharbad': [
        '/assets/Sounds/Zone Sounds/roadtotharbad.mp3',
        '/assets/Sounds/Zone Sounds/Road to Tharbad.mp3'
    ],
    'the road to tharbad': [
        '/assets/Sounds/Zone Sounds/roadtotharbad.mp3',
        '/assets/Sounds/Zone Sounds/Road to Tharbad.mp3'
    ],
    'road to fornost': '/assets/Sounds/Zone Sounds/roadtofornost1.mp3',
    'the road to fornost': '/assets/Sounds/Zone Sounds/roadtofornost1.mp3',
    'fornost': '/assets/Sounds/Zone Sounds/Fornost.mp3',
    "deadmen's dike": '/assets/Sounds/Zone Sounds/Fornost.mp3',
    "the deadmen's dike": '/assets/Sounds/Zone Sounds/Fornost.mp3',
    'lhun valley': '/assets/Sounds/Zone Sounds/Lhun Valley.mp3',
    'the lhun valley': '/assets/Sounds/Zone Sounds/Lhun Valley.mp3',
    'ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'the ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'barrow-downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'the barrow-downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'dunland': '/assets/Sounds/Zone Sounds/Dunland.mp3',
    'emyn-nu-fuin': '/assets/Sounds/Zone Sounds/Emyn.mp3',
    'eregion': '/assets/Sounds/Zone Sounds/Eregion.mp3',
    'ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'the ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'the gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'goblin-town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
    'the goblin-town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
    'lorien': '/assets/Sounds/Zone Sounds/Lorien1.mp3',
    'the lorien surroundings': '/assets/Sounds/Zone Sounds/Lorien1.mp3',
    'midgewaters': '/assets/Sounds/Zone Sounds/MidgeWater.mp3',
    'the midgewaters': '/assets/Sounds/Zone Sounds/MidgeWater.mp3',
    'misty mountains': [
        '/assets/Sounds/Zone Sounds/Misty Mountains.mp3',
        '/assets/Sounds/Zone Sounds/Misty Mountains 2.mp3'
    ],
    'the misty mountains': [
        '/assets/Sounds/Zone Sounds/Misty Mountains.mp3',
        '/assets/Sounds/Zone Sounds/Misty Mountains 2.mp3'
    ],
    'ost-in-edhil': '/assets/Sounds/Zone Sounds/Ost-in-edhil.mp3',
    'road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'the road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'rohan': '/assets/Sounds/Zone Sounds/Rohan.mp3',
    'tharbad': '/assets/Sounds/Zone Sounds/Tharbad.mp3',
    'trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'the trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'the troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'the weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
    'the valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
};

const FIGHT_MUSIC_URLS = [
    '/assets/Sounds/Sound effects/fight.mp3',
    '/assets/Sounds/Sound effects/fight2.mp3'
];

const DRUM_LOOP_URL = '/assets/Sounds/Sound effects/drumbeat.mp3';

// BPM Metadata for synchronization
// Map: filename -> BPM
const BPM_MAP: Record<string, number> = {
    'Ancient Broken Road.mp3': 80,
    'barrow downs2.mp3': 60,
    'Blue Mountains.mp3': 64,
    'Dunland.mp3': 104,
    'Emyn.mp3': 100,
    'Eregion.mp3': 100,
    'Ettenmoors.mp3': 100,
    'Fangorn Forest.mp3': 104,
    'Fornost.mp3': 96,
    'Gladden Fields.mp3': 100,
    'Goblin Town.mp3': 64,
    'Gray Havens1.mp3': 96,
    'Lhun Valley.mp3': 64,
    'Lorien1.mp3': 100,
    'MidgeWater.mp3': 100,
    'Misty Mountains.mp3': 100,
    'Misty Mountains 2.mp3': 64,
    'Moria.mp3': 100,
    'North Anduin.mp3': 80,
    'northanduin.mp3': 100,
    'Old Forest.mp3': 100,
    'oldeastroad.mp3': 100,
    'oldeastroad2.mp3': 100,
    'Ost-in-edhil.mp3': 88,
    'Rivendell1.mp3': 100,
    'Rivendell2.mp3': 60,
    'Rivendell3.mp3': 100,
    'Road to Grey Havens.mp3': 71,
    'Road to Tharbad.mp3': 100,
    'roadtofornost1.mp3': 80,
    'roadtotharbad.mp3': 88,
    'Rohan.mp3': 100,
    'Shire1.mp3': 100,
    'Shire2.mp3': 72,
    'Tharbad.mp3': 72,
    'Troll Shaws.mp3': 64,
    'Valinor.mp3': 100,
    'warrens.mp3': 88,
    'Weathertop.mp3': 100,
    'drumbeat.mp3': 104,
};


interface TrackState {
    source: AudioBufferSourceNode | null;
    gain: GainNode | null;
    filter?: BiquadFilterNode | null;
    drumSource?: AudioBufferSourceNode | null;
    drumGain?: GainNode | null;
    drumFilter?: BiquadFilterNode | null;
    drumBuffer?: AudioBuffer | null;
    url: string | null;
    buffer?: AudioBuffer | null;
    startTime?: number;
    pauseOffset?: number;
}

export const useZoneMusic = ({ roomZone, isSoundEnabled, audioCtxRef, zoneMusic, isInCombat, lighting, isSleeping, gameState }: ZoneMusicDeps) => {
    const zoneTrack = useRef<TrackState>({ source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 });
    const combatTrack = useRef<TrackState>({ source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 });
    const lastZoneRef = useRef<string | null>(null);
    const lastLightingRef = useRef<string | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isStoppingManualRef = useRef(false);
    const zoneLoadingUrlRef = useRef<string | null>(null);
    const combatLoadingUrlRef = useRef<string | null>(null);
    const zoneLoadGenerationRef = useRef(0);
    const combatLoadGenerationRef = useRef(0);
    const realTimeInCombatRef = useRef(isInCombat);
    realTimeInCombatRef.current = isInCombat;
    // Tracks any drum source that is currently fading out so we can hard-stop it
    // immediately before starting a new one, guaranteeing only 1 instance at a time.
    const drumFadingSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // --- Main Logic ---
    useEffect(() => {
        console.log(`[ZoneMusic] Effect Triggered: State=${gameState}, Zone=${roomZone}, Sound=${isSoundEnabled}, Sleeping=${isSleeping}, Ctx=${!!audioCtxRef.current}`);
        
        if (!isSoundEnabled || !audioCtxRef.current || isSleeping) {
            console.log('[ZoneMusic] Effect exited early: Missing context/sound or sleeping.');
            stopAll();
            return;
        }

        const isActuallyInLorien = roomZone?.toLowerCase().includes('lorien');
        const isActuallyInValinor = roomZone?.toLowerCase().includes('valinor');

        // 1. Force-stop account music if we've transitioned out of it (NEVER skip this)
        if (gameState !== 'account' && zoneTrack.current.url === '/assets/Sounds/Zone Sounds/Lorien1.mp3') {
            if (!isActuallyInLorien && !isActuallyInValinor && zoneTrack.current.source) {
                console.log('[ZoneMusic] HARD STOP: Leaving account mode, killing Lorien1.mp3');
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
                zoneTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
            }
        }

        // 2. Handle Combat Track Toggle (DISABLED: using filter on area music instead)
        // updateCombatMusic();

        // 3. Handle Zone Track Updates
        const isDay = lighting === 'sun';
        const lightingChanged = isDay !== (lastLightingRef.current === 'sun');
        const stateChanged = gameState !== lastZoneRef.current;
        const zoneChanged = roomZone !== lastZoneRef.current;
        
        lastLightingRef.current = lighting || null;
        if (!isDay && gameState !== 'account') {
            // Silence area music at night
            if (zoneTrack.current.source) {
                console.log('[ZoneMusic] Night detected, silencing area music.');
                isStoppingManualRef.current = true;
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
                if (zoneTrack.current.drumSource) {
                    drumFadingSourceRef.current = zoneTrack.current.drumSource;
                    fadeOutAndStop(zoneTrack.current.drumSource, zoneTrack.current.drumGain, zoneTrack.current.drumFilter, 0.3);
                }
                zoneTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, drumBuffer: zoneTrack.current.drumBuffer, startTime: 0, pauseOffset: zoneTrack.current.pauseOffset || 0 };
                isStoppingManualRef.current = false;
            }
        } else if ((roomZone || gameState === 'account') && (zoneChanged || stateChanged || lightingChanged)) {
            // 3. Handle Zone Track Updates
            console.log(`[ZoneMusic] Transition Detected: LastZone=${lastZoneRef.current}, NewState=${gameState}, NewZone=${roomZone}`);
            console.log(`[ZoneMusic] - zoneChanged: ${zoneChanged}, stateChanged: ${stateChanged}, lightingChanged: ${lightingChanged}`);
            
            if (gameState === 'account') lastZoneRef.current = 'account';
            else lastZoneRef.current = roomZone;

            // Clear any pending silence timer when moving to a new area
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            updateZoneMusic();
        }

        // 4. Handle Volume Ducking and Drum layer updates based on Combat state
        updateVolumes();

    }, [roomZone, isSoundEnabled, isInCombat, zoneMusic, lighting, isSleeping, gameState]);

    const stopAll = () => {
        isStoppingManualRef.current = true;
        fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
        if (zoneTrack.current.drumSource) {
            fadeOutAndStop(zoneTrack.current.drumSource, zoneTrack.current.drumGain, zoneTrack.current.drumFilter);
        }
        fadeOutAndStop(combatTrack.current.source, combatTrack.current.gain);
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        lastZoneRef.current = null;
        isStoppingManualRef.current = false;
    };

    const updateVolumes = async () => {
        if (!audioCtxRef.current || isStoppingManualRef.current) return;
        const ctx = audioCtxRef.current;

        // Manage Combat Drum Layer (Universal for any area)
        // NOTE: The generation counter is only incremented when we actually start a load.
        // Incrementing it on every updateVolumes call (regardless of whether we load)
        // caused zone-change effect re-runs to mark valid in-flight loads as stale,
        // so the drum would never successfully start.
        const activeMusicUrl = zoneTrack.current.url;

        if (isInCombat && gameState !== 'account') {
            if (!zoneTrack.current.drumSource && !combatLoadingUrlRef.current) {
                console.log(`[ZoneMusic] Starting universal combat drum layer. Area: ${roomZone || 'Unknown'}`);

                // Only increment the generation when we're actually beginning a load,
                // so that unrelated effect re-runs don't invalidate this load as stale.
                const myCombatGen = ++combatLoadGenerationRef.current;
                const isCombatStale = () => combatLoadGenerationRef.current !== myCombatGen;

                let dBuffer = zoneTrack.current.drumBuffer;
                if (!dBuffer) {
                    combatLoadingUrlRef.current = DRUM_LOOP_URL;
                    try {
                        dBuffer = await loadAudio(DRUM_LOOP_URL);
                        zoneTrack.current.drumBuffer = dBuffer;
                    } finally {
                        combatLoadingUrlRef.current = null;
                    }
                }

                // POST-ASYNC RE-VERIFICATION
                // If combat ended while we were loading, or a newer load started, discard.
                if (isCombatStale() || !realTimeInCombatRef.current || gameState === 'account') {
                    console.log('[ZoneMusic] Combat load discarded (stale, ended, or state mismatch)');
                    return;
                }

                if (dBuffer && !zoneTrack.current.drumSource) {
                    // Hard-stop any drum that is currently fading out before starting the new one.
                    // This guarantees there is never more than 1 drum instance playing at a time.
                    if (drumFadingSourceRef.current) {
                        try {
                            drumFadingSourceRef.current.stop();
                            drumFadingSourceRef.current.disconnect();
                        } catch (_) {}
                        drumFadingSourceRef.current = null;
                    }

                    const dSource = ctx.createBufferSource();
                    dSource.buffer = dBuffer;
                    dSource.loop = true;

                    // Sync logic: Adjust playbackRate to match music BPM
                    const musicFilename = activeMusicUrl ? decodeURIComponent(activeMusicUrl.split('/').pop() || '') : '';
                    const musicBpm = BPM_MAP[musicFilename] || 100;
                    const drumBpm = BPM_MAP['drumbeat.mp3'] || 100;
                    dSource.playbackRate.value = musicBpm / drumBpm;

                    const dGain = ctx.createGain();
                    dGain.gain.setValueAtTime(0, ctx.currentTime);
                    dGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 1.5);

                    const dFilter = ctx.createBiquadFilter();
                    dFilter.type = 'lowpass';
                    // Muffle the drums by default (2000Hz removes harsh highs)
                    dFilter.frequency.setValueAtTime(2000, ctx.currentTime);

                    dSource.connect(dFilter);
                    dFilter.connect(dGain);
                    dGain.connect(ctx.destination);

                    // Sync offset: If music is actually playing, align with its beat.
                    // If silent (night), just start at 0.
                    let startOffset = 0;
                    if (zoneTrack.current.source) {
                        const musicStart = zoneTrack.current.startTime || 0;
                        const elapsed = ctx.currentTime - musicStart;
                        const totalOffset = (zoneTrack.current.pauseOffset || 0) + elapsed;
                        startOffset = totalOffset % dBuffer.duration;
                    }

                    dSource.start(0, startOffset);
                    zoneTrack.current.drumSource = dSource;
                    zoneTrack.current.drumGain = dGain;
                    zoneTrack.current.drumFilter = dFilter;
                }
            }
        } else if (zoneTrack.current.drumSource) {
            // Stop drums — only drumSource needs to exist (drumGain may be null in edge cases)
            const { drumSource, drumGain, drumFilter } = zoneTrack.current;
            zoneTrack.current.drumSource = null;
            zoneTrack.current.drumGain = null;
            zoneTrack.current.drumFilter = null;

            console.log('[ZoneMusic] Stopping combat drum layer');
            // Track the fading node so the next drum start can hard-stop it immediately.
            drumFadingSourceRef.current = drumSource;
            fadeOutAndStop(drumSource, drumGain, drumFilter, 0.3);
        }

        // We no longer pause music for combat, but we muffle it with a lowpass filter and a slight duck
        if (zoneTrack.current.gain) {
            const g = zoneTrack.current.gain.gain;
            g.cancelScheduledValues(ctx.currentTime);
            g.setValueAtTime(g.value, ctx.currentTime);
            
            // Subtle 25% volume dip during combat muffle for extra "focus"
            const targetVol = isInCombat ? 0.045 : 0.06;
            g.linearRampToValueAtTime(targetVol, ctx.currentTime + 1.5);
        }

        if (zoneTrack.current.filter) {
            const f = zoneTrack.current.filter.frequency;
            f.cancelScheduledValues(ctx.currentTime);
            f.setValueAtTime(f.value, ctx.currentTime);
            
            // Muffle the area music down to 500Hz during combat
            const targetFreq = isInCombat ? 500 : 20000;
            f.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 1.5);
        }
    };

    const updateCombatMusic = async () => {
        // DISABLED: Combat music is now replaced by area music filtering.
        if (combatTrack.current.source) {
            fadeOutAndStop(combatTrack.current.source, combatTrack.current.gain, combatTrack.current.filter);
            combatTrack.current = { source: null, gain: null, filter: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
        }
        return;
    };

    const updateZoneMusic = async (resumeOffset?: number) => {
        const myGeneration = ++zoneLoadGenerationRef.current;
        const isStale = () => zoneLoadGenerationRef.current !== myGeneration;

        if (!audioCtxRef.current || isSleeping) {
            if (isSleeping) {
                if (zoneTrack.current.source) fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
                if (combatTrack.current.source) fadeOutAndStop(combatTrack.current.source, combatTrack.current.gain);
                zoneTrack.current = { source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
                combatTrack.current = { source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
            }
            return;
        }

        const ctx = audioCtxRef.current!;

        // --- Account Music Logic ---
        if (gameState === 'account') {
            const accountMusicUrl = '/assets/Sounds/Zone Sounds/Lorien1.mp3';
            if (zoneTrack.current.url === accountMusicUrl && zoneTrack.current.source) return;

            console.log('[ZoneMusic] Starting Account music:', accountMusicUrl);
            zoneLoadingUrlRef.current = accountMusicUrl;
            let buffer: AudioBuffer | null = null;
            try {
                buffer = await loadAudio(accountMusicUrl);
            } finally {
                zoneLoadingUrlRef.current = null;
            }
            if (!buffer || isStale()) return;

            const ctx = audioCtxRef.current!;
            if (zoneTrack.current.source) {
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true; // Looping music for the account screen

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = isInCombat ? 500 : 20000;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 3);

            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            if (ctx.state === 'suspended') await ctx.resume();
            source.start(0);

            zoneTrack.current = { source, gain, filter, url: accountMusicUrl, buffer, startTime: ctx.currentTime, pauseOffset: 0 };
            lastZoneRef.current = 'account';
            return;
        }
        
        if (!roomZone) {
            if (zoneTrack.current.source) {
                console.log('[ZoneMusic] No roomZone and not in account mode, stopping current music.');
                isStoppingManualRef.current = true;
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
                zoneTrack.current = { source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
                isStoppingManualRef.current = false;
            }
            return;
        }
        
        // Find matching URL
        const normalizedZone = roomZone.toLowerCase().replace(/^the\s+/i, '');
        const dynamicMatch = zoneMusic.find(m => m.zone.toLowerCase().replace(/^the\s+/i, '') === normalizedZone);
        const rawUrl = dynamicMatch?.url || STATIC_MUSIC_MAP[normalizedZone];
        if (!rawUrl) {
            if (zoneTrack.current.source) {
                fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain);
            }
            zoneTrack.current = { source: null, gain: null, url: null, buffer: null, startTime: 0, pauseOffset: 0 };
            return;
        }

        const musicUrl = Array.isArray(rawUrl) 
            ? rawUrl[Math.floor(Math.random() * rawUrl.length)] 
            : rawUrl;
            
        // If we are not resuming, and the URL is the same, we might already be playing or loading.
        if (resumeOffset === undefined && musicUrl === zoneTrack.current.url && (zoneTrack.current.source || zoneLoadingUrlRef.current === musicUrl)) return;

        // Use cached buffer if we have it and it's the same URL
        let buffer = (musicUrl === zoneTrack.current.url) ? zoneTrack.current.buffer : null;

        if (!buffer) {
            console.log('[ZoneMusic] Loading Zone Music:', musicUrl);
            zoneLoadingUrlRef.current = musicUrl;
            try {
                buffer = await loadAudio(musicUrl);
            } finally {
                zoneLoadingUrlRef.current = null;
            }
            if (!buffer) return;
        } else if (resumeOffset !== undefined) {
            console.log('[ZoneMusic] Resuming from cached buffer:', musicUrl);
        }

        // A newer updateZoneMusic call has since started — discard this result to prevent
        // a slow-loading or cached track from overwriting what's already been scheduled.
        if (isStale()) {
            console.log('[ZoneMusic] Stale load discarded (newer call superseded):', musicUrl);
            return;
        }

        // Zone changed while we were loading/resuming — bail so the stale track doesn't override the current one
        if (lastZoneRef.current !== roomZone && gameState !== 'account') {
            console.log('[ZoneMusic] Zone changed while loading/resuming, discarding track:', roomZone);
            return;
        }

        // Fade out previous zone track if it exists
        if (zoneTrack.current.source) {
            isStoppingManualRef.current = true;
            fadeOutAndStop(zoneTrack.current.source, zoneTrack.current.gain, zoneTrack.current.filter);
        }
        // Stop any active drum layer before replacing the track state — otherwise the
        // audio node is orphaned (still playing) and the next updateVolumes call spawns
        // a second one on top, producing stacked/looping drum instances.
        if (zoneTrack.current.drumSource) {
            drumFadingSourceRef.current = zoneTrack.current.drumSource;
            fadeOutAndStop(zoneTrack.current.drumSource, zoneTrack.current.drumGain, zoneTrack.current.drumFilter, 0.3);
        }
        const preservedDrumBuffer = zoneTrack.current.drumBuffer;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false; // We want silence between loops!

        source.onended = () => {
            // Only trigger silence timeout if the track finished naturally (not stopped by cross-fade/hook/combat)
            if (!isStoppingManualRef.current && lastZoneRef.current === roomZone) {
                console.log('[ZoneMusic] Track finished naturally.');
                // Guard: only null the ref if it still points to this source.
                // A concurrent zone change may have already replaced it.
                if (zoneTrack.current.source === source) {
                    zoneTrack.current.source = null;
                    zoneTrack.current.pauseOffset = 0; // Clear offset so we don't 'resume' a finished track
                }
                const silenceMinutes = 1 + Math.random() * 3; // 1-4 minutes of silence
                console.log(`[ZoneMusic] Waiting ${silenceMinutes.toFixed(1)} minutes before looping.`);
                silenceTimeoutRef.current = setTimeout(() => {
                    if (isSoundEnabled && (lastZoneRef.current === roomZone || gameState === 'account')) {
                        updateZoneMusic();
                    }
                }, silenceMinutes * 60 * 1000);
            }
        };

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = isInCombat ? 500 : 20000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        // During combat we shouldn't really be starting a new track, but safety check:
        const targetVol = isInCombat ? 0.045 : 0.06;
        gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 2);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        // Calculate start offset: either resume point or random starting point
        const startOffset = resumeOffset !== undefined ? resumeOffset : (Math.random() * Math.max(0, buffer.duration - 30));
        
        if (ctx.state === 'suspended') await ctx.resume();
        source.start(0, startOffset % buffer.duration);

        zoneTrack.current = {
            source, gain, filter, url: musicUrl, buffer,
            drumBuffer: preservedDrumBuffer ?? undefined,
            startTime: ctx.currentTime,
            pauseOffset: startOffset % buffer.duration
        };
        isStoppingManualRef.current = false;
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

    const fadeOutAndStop = (source: AudioBufferSourceNode | null, gain: GainNode | null, filter?: BiquadFilterNode | null, fadeDuration: number = 1.5) => {
        if (!gain || !audioCtxRef.current || !source) return;
        const ctx = audioCtxRef.current;

        console.log('[ZoneMusic] Fading out audio node:', source.buffer?.duration, 'seconds long, fade:', fadeDuration + 's');
        try {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDuration);
        } catch (e) { console.warn('[ZoneMusic] Fade ramp failed:', e); }

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                if (filter) filter.disconnect();
                gain.disconnect();
                // Clear the fading ref if it still points to this node
                if (drumFadingSourceRef.current === source) drumFadingSourceRef.current = null;
            } catch (e) { }
        }, fadeDuration * 1000 + 100);
    };
};
