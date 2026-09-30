import { AUDIO_MANIFEST, AmbientConfig } from '../../constants/audioManifest';
import { useSettingsStore } from '../../stores/useSettingsStore';

const SHARED_AUDIO_BASE_VOLUME = 0.8;
const SHARED_AUDIO_OUTPUT_GAIN = 3.0;
const LOW_HEALTH_DRUM_ENABLED = true;
const LOW_HEALTH_DRUM_MAX_VOLUME = 0.65;
const HEALTH_MIX_RAMP_SECONDS = 0.28;
const HEALTH_MUSIC_AT_WOUNDED = 0.28;
const HEALTH_MUSIC_AT_BAD = 0.2;
const HEALTH_MUSIC_AT_AWFUL = 0.1;
const MOVEMENT_EFFECT_KEYS = new Set(['move', 'watermove', 'event-move', 'ride', 'stopriding']);

export interface PlayOptions {
    pitch?: number;
    /** Retained for callers; effect loudness is normalized to the shared base. */
    volume?: number;
    reverse?: boolean;
    filterFrequency?: number;
    volumeMultiplier?: number;
    label?: string;
    skipJitter?: boolean;
}

export interface AmbientOptions {
    key: string | null;
    dynamicUrl?: string;
    inCombat?: boolean;
    isDay?: boolean;
    loop?: boolean;
}

type AmbientType = 'terrain' | 'weather' | 'zone' | 'drum' | 'incantation' | 'heartbeat' | 'breath';

interface ActiveAmbient {
    type: AmbientType;
    source: AudioBufferSourceNode;
    gain: GainNode;
    filter?: BiquadFilterNode;
    url: string;
    key: string;
    pauseOffset: number;
    startTime: number;
    baseVolume: number;
    isMusic: boolean;
    isDrum?: boolean;
}

export class AudioManager {
    private static instance: AudioManager;

    private audioCtx: AudioContext | null = null;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private loadingState: Map<string, Promise<AudioBuffer | null>> = new Map();

    private activeAmbients: Map<AmbientType, ActiveAmbient> = new Map();
    private ambientRequestTokens: Map<AmbientType, number> = new Map();
    private drumStartRequestId = 0;
    private healthDrumProgress = 0;
    private healthPercent = 100;
    private isHealthMixActive = false;
    private _isSoundEnabled: boolean = true;
    private silenceTimeout: NodeJS.Timeout | null = null;
    private zoneEndedListeners: Set<(key: string) => void> = new Set();
    private pageAudioPaused: boolean = false;
    private lastScheduledTimes: Map<string, number> = new Map();
    private activeMovementEffectSources = new Set<AudioBufferSourceNode>();

    // Atmosphere state
    private atmosphereState = {
        hpRatio: 1,
        moveRatio: 1,
        masterVolume: 1,
        musicVolume: 1
    };

    // Drum logic references
    private drumFadingSource: AudioBufferSourceNode | null = null;
    private incantationFadingSource: AudioBufferSourceNode | null = null;

    private constructor() {
        // Subscribe to settings store for sound enabled and volumes
        useSettingsStore.subscribe((state) => {
            this.isSoundEnabled = state.isSoundEnabled && !state.isClassicMode;
            this.atmosphereState.masterVolume = state.masterVolume;
            this.atmosphereState.musicVolume = state.musicVolume;
            this.updateActiveVolumes();
        });

        // Initialize volumes
        const initialSettings = useSettingsStore.getState();
        this._isSoundEnabled = initialSettings.isSoundEnabled && !initialSettings.isClassicMode;
        this.atmosphereState.masterVolume = initialSettings.masterVolume;
        this.atmosphereState.musicVolume = initialSettings.musicVolume;
        this.bindPageAudioLifecycle();
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public get context(): AudioContext | null {
        return this.audioCtx;
    }

    public set isSoundEnabled(enabled: boolean) {
        if (this._isSoundEnabled === enabled) return;
        this._isSoundEnabled = enabled;
        if (!enabled) {
            this.stopAllAmbients();
            this.stopAtmosphere();
        } else if (this.isPageAudioActive() && this.audioCtx?.state === 'suspended') {
            this.audioCtx.resume().catch(console.error);
        }
    }

    public get isSoundEnabled(): boolean {
        return this._isSoundEnabled;
    }

    public addZoneEndedListener(listener: (key: string) => void) {
        this.zoneEndedListeners.add(listener);
    }

    public removeZoneEndedListener(listener: (key: string) => void) {
        this.zoneEndedListeners.delete(listener);
    }

    public init() {
        if (!this.audioCtx) {
            const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
            this.audioCtx = new (window.AudioContext || audioWindow.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended' && this._isSoundEnabled && this.isPageAudioActive()) {
            this.audioCtx.resume().catch(console.error);
        }
    }

    private bindPageAudioLifecycle() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;

        document.addEventListener('visibilitychange', this.handlePageAudioLifecycle);
        window.addEventListener('focus', this.handlePageAudioLifecycle);
        window.addEventListener('blur', this.handlePageAudioLifecycle);
        window.addEventListener('pageshow', this.handlePageAudioLifecycle);
        window.addEventListener('pagehide', this.handlePageAudioLifecycle);
        this.handlePageAudioLifecycle();
    }

    private isPageAudioActive(): boolean {
        if (typeof document === 'undefined') return true;
        if (document.visibilityState !== 'visible') return false;
        return typeof document.hasFocus !== 'function' || document.hasFocus();
    }

    private handlePageAudioLifecycle = (event?: Event) => {
        const shouldPause = event?.type === 'pagehide' || !this.isPageAudioActive();
        this.pageAudioPaused = shouldPause;
        if (!this.audioCtx) return;

        if (shouldPause) {
            if (this.audioCtx.state === 'running') {
                this.audioCtx.suspend().catch(console.error);
            }
            return;
        }

        if (this._isSoundEnabled && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(console.error);
        }
    };

    public async loadBuffer(url: string): Promise<AudioBuffer | null> {
        if (!this.audioCtx) return null;
        if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;
        if (this.loadingState.has(url)) return this.loadingState.get(url)!;

        const loadPromise = (async () => {
            try {
                const response = await fetch(url);
                if (!response.ok) return null;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) return null;
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioCtx!.decodeAudioData(arrayBuffer);
                this.bufferCache.set(url, audioBuffer);
                return audioBuffer;
            } catch (err) {
                console.error(`[AudioManager] Failed to load ${url}:`, err);
                return null;
            } finally {
                this.loadingState.delete(url);
            }
        })();

        this.loadingState.set(url, loadPromise);
        return loadPromise;
    }

    private getEffectiveVolume(
        baseVolume: number,
        isMusic: boolean = false,
        isDrum: boolean = false,
        volumeOverride?: number
    ): number {
        const settings = useSettingsStore.getState();
        // Map linear slider values [0, 1] to exponential curve for natural volume perception
        const master = Math.pow(settings.masterVolume, 2);
        const channelVolume = volumeOverride ?? (isDrum ? settings.drumVolume : isMusic ? settings.musicVolume : settings.sfxVolume);
        const subVolume = Math.pow(channelVolume, 2);
        return baseVolume * master * subVolume * SHARED_AUDIO_OUTPUT_GAIN;
    }

    private getHealthDrumVolume(): number {
        const drumVolumeLimit = Math.max(0, Math.min(LOW_HEALTH_DRUM_MAX_VOLUME, useSettingsStore.getState().drumVolume));
        return drumVolumeLimit * this.healthDrumProgress;
    }

    private getHealthMusicVolumeMultiplier(): number {
        if (!this.isHealthMixActive) return 1;
        if (this.healthPercent >= 40) {
            const fadeProgress = Math.max(0, Math.min(1, (100 - this.healthPercent) / 60));
            return 1 - fadeProgress * (1 - HEALTH_MUSIC_AT_WOUNDED);
        }
        if (this.healthPercent >= 30) {
            const fadeProgress = Math.max(0, Math.min(1, (40 - this.healthPercent) / 10));
            return HEALTH_MUSIC_AT_WOUNDED - fadeProgress * (HEALTH_MUSIC_AT_WOUNDED - HEALTH_MUSIC_AT_BAD);
        }
        if (this.healthPercent >= 15) {
            const fadeProgress = Math.max(0, Math.min(1, (30 - this.healthPercent) / 15));
            return HEALTH_MUSIC_AT_BAD - fadeProgress * (HEALTH_MUSIC_AT_BAD - HEALTH_MUSIC_AT_AWFUL);
        }
        return HEALTH_MUSIC_AT_AWFUL * Math.max(0, Math.min(1, this.healthPercent / 15));
    }

    private getActiveAmbientVolume(active: ActiveAmbient): number {
        const drumVolume = active.isDrum ? this.getHealthDrumVolume() : undefined;
        const volume = this.getEffectiveVolume(active.baseVolume, active.isMusic, active.isDrum, drumVolume);
        return active.type === 'zone' ? volume * this.getHealthMusicVolumeMultiplier() : volume;
    }

    private normalizeTerrainKey(key: string): string {
        const normalized = key.trim().toUpperCase().replace(/[-\s]+/g, '_');
        if (normalized === 'INDOORS' || normalized === 'INSIDE' || normalized === 'BUILDING') return 'CITY';
        if (normalized === 'CITY' || normalized === 'TOWN') return 'CITY';
        if (normalized === 'CAVERN') return 'CAVE';
        if (normalized === 'SHALLOW') return 'SHALLOWS';
        if (normalized === 'WATER' || normalized === 'RIVER') return 'WATER';
        if (normalized === 'ROAD' || normalized === 'BRUSH') return 'FIELD';
        return normalized;
    }

    private updateActiveVolumes(rampSeconds: number = 0.08) {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        this.activeAmbients.forEach(active => {
            const gain = active.gain.gain;
            const target = this.getActiveAmbientVolume(active);
            try {
                gain.cancelScheduledValues(now);
                gain.setValueAtTime(gain.value, now);
                gain.linearRampToValueAtTime(target, now + rampSeconds);
            } catch (err) {
                gain.value = target;
            }
        });
    }

    public async playEffect(key: string, options?: PlayOptions) {
        if (!this._isSoundEnabled || this.pageAudioPaused) return;
        this.init();
        if (!this.audioCtx) return;

        const settings = useSettingsStore.getState();
        const config = AUDIO_MANIFEST.effects[key];
        if (!config) {
            console.warn(`[AudioManager] Effect not found in manifest: ${key}`);
            return;
        }

        const customPath = settings.customSoundEffects?.[key];
        const effectPath = customPath || config.path;

        let buffer = await this.loadBuffer(effectPath);
        if (!buffer) return;

        const isMovementEffect = MOVEMENT_EFFECT_KEYS.has(key);
        if (isMovementEffect && this.activeMovementEffectSources.size > 0) return;

        const ctx = this.audioCtx;
        const now = ctx.currentTime;
        let playTime = now;

        if (key === 'flee') {
            const minDelay = 1.5;
            const lastTime = this.lastScheduledTimes.get(key) ?? 0;
            if (now < lastTime + minDelay) {
                return;
            }
            this.lastScheduledTimes.set(key, now);
        } else if (key === 'get' || key === 'drop') {
            const minDelay = 0.25;
            const lastTime = this.lastScheduledTimes.get(key) ?? 0;
            if (now < lastTime + minDelay) {
                return;
            }
            this.lastScheduledTimes.set(key, now);
        } else if (key === 'weather') {
            const minDelay = 2.0;
            const lastTime = this.lastScheduledTimes.get(key) ?? 0;
            if (now < lastTime + minDelay) {
                return;
            }
            this.lastScheduledTimes.set(key, now);
        } else if (key === 'magiccomplete') {
            const minDelay = 1.0;
            const lastTime = this.lastScheduledTimes.get(key) ?? 0;
            if (now < lastTime + minDelay) {
                return;
            }
            this.lastScheduledTimes.set(key, now);
        } else if (key === 'hint') {
            // A hint can be repeated across adjacent server lines; preserve the
            // notification without layering several copies of the same effect.
            const minDelay = 1.0;
            const lastTime = this.lastScheduledTimes.get(key) ?? 0;
            if (now < lastTime + minDelay) {
                return;
            }
            this.lastScheduledTimes.set(key, now);
        }

        let actualBuffer = buffer;
        if (options?.reverse) {
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

        const basePitch = options?.pitch ?? config.defaultPitch ?? 1.0;
        const jitterRange = options?.skipJitter ? 0 : 0.24;
        // Keep effect loudness normalized while allowing targeted mix reductions.
        const volumeMultiplier = Math.max(0, Math.min(1, options?.volumeMultiplier ?? 1));
        const baseVol = SHARED_AUDIO_BASE_VOLUME * volumeMultiplier;
        for (let hit = 0; hit < (config.repeatCount ?? 1); hit++) {
            const source = ctx.createBufferSource();
            source.buffer = actualBuffer;
            const jitter = Math.random() * jitterRange - jitterRange / 2;
            source.playbackRate.value = basePitch + jitter;

            const gainNode = ctx.createGain();
            gainNode.gain.value = this.getEffectiveVolume(baseVol, false);
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
            if (isMovementEffect) {
                this.activeMovementEffectSources.add(source);
                source.onended = () => this.activeMovementEffectSources.delete(source);
            }
            try {
                source.start(playTime + hit * (config.repeatInterval ?? 0));
            } catch (error) {
                if (isMovementEffect) this.activeMovementEffectSources.delete(source);
                console.error(`[AudioManager] Failed to play effect ${key}:`, error);
            }
        }
    }

    public async setAmbient(type: 'terrain' | 'weather' | 'zone', options: AmbientOptions) {
        const { key, dynamicUrl, inCombat = false, isDay = true, loop } = options;
        if (!this._isSoundEnabled && key !== null) return;
        this.init();
        if (!this.audioCtx) return;

        const myToken = (this.ambientRequestTokens.get(type) ?? 0) + 1;
        this.ambientRequestTokens.set(type, myToken);

        if (key === null) {
            this.stopAmbient(type);
            return;
        }

        let urlToPlay: string | null = null;
        let targetVolume = 1.0;
        let isLoop = true;

        if (type === 'terrain') {
            const terrainKey = this.normalizeTerrainKey(key);
            let config = (AUDIO_MANIFEST.ambient as any).terrains[terrainKey];
            if (!config) {
                const foundKey = Object.keys((AUDIO_MANIFEST.ambient as any).terrains).find(k => terrainKey.includes(k));
                if (foundKey) config = (AUDIO_MANIFEST.ambient as any).terrains[foundKey];
            }

            if (config) {
                urlToPlay = config.url;
                targetVolume = config.volume;

                if (terrainKey === 'FIELD') {
                    if (isDay) {
                        urlToPlay = '/assets/Sounds/TerrainSounds/dayfield.wav';
                    } else {
                        urlToPlay = null; // Silence open areas at night
                    }
                }
            }
        } else if (type === 'weather') {
            const config = (AUDIO_MANIFEST.ambient as any).weather[key];
            if (config) {
                urlToPlay = config.url;
                targetVolume = config.volume;
            }
        } else if (type === 'zone') {
            isLoop = loop ?? false;
            const manifestConfig = (AUDIO_MANIFEST.ambient as any).zones[key]
                || (key ? (AUDIO_MANIFEST.ambient as any).zones[`the ${key}`] : undefined)
                || (key && key.startsWith('the ') ? (AUDIO_MANIFEST.ambient as any).zones[key.replace(/^the\s+/, '')] : undefined);
            const zoneBaseVolume = (manifestConfig && typeof manifestConfig.volume === 'number')
                ? manifestConfig.volume
                : SHARED_AUDIO_BASE_VOLUME;

            urlToPlay = dynamicUrl || manifestConfig?.url || null;

            targetVolume = zoneBaseVolume;
        }

        if (!urlToPlay) {
            this.stopAmbient(type);
            return;
        }

        const active = this.activeAmbients.get(type);
        if (active && active.url === urlToPlay) {
            // Already playing this, just update volume/filter if zone
            if (type === 'zone') {
                 active.baseVolume = targetVolume;
                 if (active.filter) {
                     const f = active.filter.frequency;
                     f.cancelScheduledValues(this.audioCtx.currentTime);
                     f.setValueAtTime(f.value, this.audioCtx.currentTime);
                     f.exponentialRampToValueAtTime(inCombat ? 500 : 20000, this.audioCtx.currentTime + 1.5);
                 }
                 const g = active.gain.gain;
                 g.cancelScheduledValues(this.audioCtx.currentTime);
                 g.setValueAtTime(g.value, this.audioCtx.currentTime);
                 const updatedActive = { ...active, baseVolume: targetVolume };
                 g.linearRampToValueAtTime(this.getActiveAmbientVolume(updatedActive), this.audioCtx.currentTime + HEALTH_MIX_RAMP_SECONDS);
            }
            return;
        }

        const buffer = await this.loadBuffer(urlToPlay);
        if (!buffer) return;
        if (this.ambientRequestTokens.get(type) !== myToken) return;

        // Crossfade logic
        this.crossFadeAmbient(type, urlToPlay, key, buffer, targetVolume, isLoop, inCombat ? 500 : 20000);
    }

    public stopAccountMusic(): void {
        // Invalidate an account-track request that is still loading, then promptly
        // retire the active account track without disturbing an already-playing zone.
        this.ambientRequestTokens.set('zone', (this.ambientRequestTokens.get('zone') ?? 0) + 1);
        const active = this.activeAmbients.get('zone');
        if (!active || active.key !== 'account') return;

        this.fadeOutAndStop(active.source, active.gain, active.filter, 0.15);
        this.activeAmbients.delete('zone');
    }

    private crossFadeAmbient(type: 'terrain' | 'weather' | 'zone' | 'drum' | 'incantation', urlToPlay: string, key: string, buffer: AudioBuffer, targetVolume: number, isLoop: boolean, filterFreq?: number) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const isMusic = type === 'zone' || type === 'drum' || type === 'incantation';

        const fadeTime = 2.0;

        const oldActive = this.activeAmbients.get(type);
        if (oldActive) {
            this.fadeOutAndStop(oldActive.source, oldActive.gain, oldActive.filter, fadeTime);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = isLoop;

        let lastNode: AudioNode = source;

        let filter: BiquadFilterNode | undefined;
        if (type === 'zone' && filterFreq) {
            filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = filterFreq;
            source.connect(filter);
            lastNode = filter;
        } else if (type === 'incantation') {
            filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2200; // Muffled effect
            source.connect(filter);
            lastNode = filter;
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        const targetGain = this.getEffectiveVolume(targetVolume, isMusic)
            * (type === 'zone' ? this.getHealthMusicVolumeMultiplier() : 1);
        gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + fadeTime);

        lastNode.connect(gain);
        gain.connect(ctx.destination);

        let startOffset = 0;

        if (type === 'zone') {
            source.onended = () => {
                if (this.activeAmbients.get('zone')?.source === source) {
                    this.activeAmbients.delete('zone');

                    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
                    const silenceMinutes = 1 + Math.random();
                    this.silenceTimeout = setTimeout(() => {
                        this.zoneEndedListeners.forEach(l => l(key));
                    }, silenceMinutes * 60 * 1000);
                }
            };
        }

        source.start(0, startOffset % buffer.duration);

        this.activeAmbients.set(type, {
            type,
            source,
            gain,
            filter,
            url: urlToPlay,
            key,
            pauseOffset: startOffset % buffer.duration,
            startTime: ctx.currentTime,
            baseVolume: targetVolume,
            isMusic
        });
    }

    private stopAmbient(type: 'terrain' | 'weather' | 'zone' | 'drum' | 'incantation', fadeDuration?: number) {
        const active = this.activeAmbients.get(type);
        if (active) {
            this.fadeOutAndStop(active.source, active.gain, active.filter, fadeDuration ?? (type === 'drum' ? HEALTH_MIX_RAMP_SECONDS : 2.0));
            this.activeAmbients.delete(type);
        }
    }

    public stopAllAmbients() {
        this.stopAmbient('terrain');
        this.stopAmbient('weather');
        this.stopAmbient('zone');
        this.stopAmbient('drum');
        this.stopAmbient('incantation');
    }

    private fadeOutAndStop(source: AudioBufferSourceNode, gain: GainNode, filter?: BiquadFilterNode, fadeDuration: number = 2.0) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        try {
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeDuration);
        } catch (e) { }

        setTimeout(() => {
            try {
                source.stop();
                source.disconnect();
                if (filter) filter.disconnect();
                gain.disconnect();
            } catch (e) { }
        }, fadeDuration * 1000 + 100);
    }

    // Drum Layer
    public async updateHealthAudioMix(isActive: boolean, healthPercent: number = 100) {
        this.healthPercent = Math.max(0, Math.min(100, healthPercent));
        this.isHealthMixActive = isActive;
        this.healthDrumProgress = isActive
            ? Math.max(0, Math.min(1, (70 - this.healthPercent) / 40))
            : 0;
        if (!isActive) this.drumStartRequestId += 1;

        if (isActive && this._isSoundEnabled && !this.audioCtx) this.init();
        if (this.audioCtx) this.updateActiveVolumes(HEALTH_MIX_RAMP_SECONDS);

        if (!LOW_HEALTH_DRUM_ENABLED) {
            this.stopAmbient('drum');
            return;
        }
        if (!isActive || !this._isSoundEnabled || !this.audioCtx || this.getHealthDrumVolume() <= 0) {
            this.stopAmbient('drum');
            return;
        }

        const activeDrum = this.activeAmbients.get('drum');
        if (activeDrum) return; // Already playing

        const requestId = ++this.drumStartRequestId;
        const drumUrl = AUDIO_MANIFEST.ambient.special.drumLoop.url as string;
        const buffer = await this.loadBuffer(drumUrl);
        if (!buffer || requestId !== this.drumStartRequestId || !this.isHealthMixActive || !this._isSoundEnabled) return;

        const ctx = this.audioCtx;
        if (!ctx) return;
        const dSource = ctx.createBufferSource();
        dSource.buffer = buffer;
        dSource.loop = true;
        dSource.playbackRate.value = 1;

        const drumBaseVolume = SHARED_AUDIO_BASE_VOLUME;
        const dGain = ctx.createGain();
        dGain.gain.setValueAtTime(0, ctx.currentTime);
        dGain.gain.linearRampToValueAtTime(
            this.getEffectiveVolume(drumBaseVolume, true, true, this.getHealthDrumVolume()),
            ctx.currentTime + HEALTH_MIX_RAMP_SECONDS
        );

        const dFilter = ctx.createBiquadFilter();
        dFilter.type = 'lowpass';
        dFilter.frequency.setValueAtTime(2000, ctx.currentTime);

        dSource.connect(dFilter);
        dFilter.connect(dGain);
        dGain.connect(ctx.destination);

        let startOffset = 0;
        const zoneActive = this.activeAmbients.get('zone');
        if (zoneActive && zoneActive.source) {
            const elapsed = ctx.currentTime - zoneActive.startTime;
            const totalOffset = zoneActive.pauseOffset + elapsed;
            startOffset = totalOffset % buffer.duration;
        }

        dSource.start(0, startOffset);
        this.activeAmbients.set('drum', {
            type: 'drum',
            source: dSource,
            gain: dGain,
            filter: dFilter,
            url: drumUrl,
            key: 'drumLoop',
            pauseOffset: 0,
            startTime: ctx.currentTime,
            baseVolume: drumBaseVolume,
            isMusic: true,
            isDrum: true
        });
    }

    public async playIncantation() {
        if (!this._isSoundEnabled || !this.audioCtx) return;
        
        // No longer preventing multiple incantations; let them overlap if they happen fast
        const config = AUDIO_MANIFEST.effects['incantations'];
        const buffer = await this.loadBuffer(config.path);
        if (!buffer) return;

        const ctx = this.audioCtx;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = false; // No looping
        source.playbackRate.value = 1.5 + (Math.random() * 0.1 - 0.05);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(this.getEffectiveVolume(0.7, true), ctx.currentTime + 0.1);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        // We don't need to track it as an active ambient anymore if it's one-shot
        // but keeping the stopIncantation compatibility for now if needed.
        // Actually, better to just let it finish.
    }

    public stopIncantation(playExplosion: boolean = false) {
        // if (playExplosion) this.playEffect('magicexplosion', { volume: 1.5 });
        const active = this.activeAmbients.get('incantation');
        if (active) {
            this.fadeOutAndStop(active.source, active.gain, active.filter, 0.1);
            this.activeAmbients.delete('incantation');
        }
    }

    // Atmosphere (Heartbeat and Breath) logic
    private atmosphereTimeouts: { heartbeat?: NodeJS.Timeout, breath?: NodeJS.Timeout } = {};

    public updateAtmosphere(hpRatio: number, moveRatio: number) {
        this.atmosphereState.hpRatio = hpRatio;
        this.atmosphereState.moveRatio = moveRatio;

        if (this._isSoundEnabled) {
            this.scheduleHeartbeat();
            this.scheduleBreath();
        }
    }

    private stopAtmosphere() {
        if (this.atmosphereTimeouts.heartbeat) clearTimeout(this.atmosphereTimeouts.heartbeat);
        if (this.atmosphereTimeouts.breath) clearTimeout(this.atmosphereTimeouts.breath);
        this.atmosphereTimeouts = {};
    }

    private scheduleHeartbeat() {
        if (this.atmosphereTimeouts.heartbeat) return;
        const FX_THRESHOLD = 0.35;

        const playHeartbeat = () => {
            if (!this._isSoundEnabled || this.pageAudioPaused || !this.audioCtx || this.atmosphereState.hpRatio > FX_THRESHOLD) {
                this.atmosphereTimeouts.heartbeat = setTimeout(playHeartbeat, 1000);
                return;
            }

            const ctx = this.audioCtx;
            const hpRatio = this.atmosphereState.hpRatio;
            const duration = 0.5 + (2.5 * hpRatio);
            const intensity = 0.3 + (0.7 * (1 - hpRatio));
            const volume = this.getEffectiveVolume(0.4 * intensity, true);

            // Lub
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(42, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);

            // Dub
            const dubDelay = duration * 0.3 * 1000;
            setTimeout(() => {
                if (!this.audioCtx || !this._isSoundEnabled || this.pageAudioPaused) return;
                const ctx2 = this.audioCtx;
                const osc2 = ctx2.createOscillator();
                const gain2 = ctx2.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(35, ctx2.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(22, ctx2.currentTime + 0.1);
                gain2.gain.setValueAtTime(volume * 0.75, ctx2.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.2);
                osc2.connect(gain2);
                gain2.connect(ctx2.destination);
                osc2.start();
                osc2.stop(ctx2.currentTime + 0.25);
            }, dubDelay);

            this.atmosphereTimeouts.heartbeat = setTimeout(playHeartbeat, duration * 1000);
        };

        playHeartbeat();
    }

    private scheduleBreath() {
        if (this.atmosphereTimeouts.breath) return;
        const FX_THRESHOLD = 0.35;

        const playBreath = () => {
            if (!this._isSoundEnabled || this.pageAudioPaused || !this.audioCtx || this.atmosphereState.moveRatio > FX_THRESHOLD) {
                this.atmosphereTimeouts.breath = setTimeout(playBreath, 2000);
                return;
            }

            const ctx = this.audioCtx;
            const moveRatio = this.atmosphereState.moveRatio;
            const duration = 0.5 + (3.5 * moveRatio);
            const intensity = 1 - moveRatio;

            // Pink Noise Buffer Generation
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
                const vol = this.getEffectiveVolume(0.15 * intensity, true);
                gain.gain.linearRampToValueAtTime(vol, startTime + len * (isExhale ? 0.3 : 0.6));
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
            playHalfBreath(now, breathCycle * 0.4, false);
            playHalfBreath(now + breathCycle * 0.45, breathCycle * 0.5, true);

            this.atmosphereTimeouts.breath = setTimeout(playBreath, breathCycle * 1000);
        };

        playBreath();
    }
    public playSound(buffer: AudioBuffer, options?: PlayOptions) {
        if (!this._isSoundEnabled || this.pageAudioPaused || !this.audioCtx) return;
        const ctx = this.audioCtx;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gainNode = ctx.createGain();
        gainNode.gain.value = this.getEffectiveVolume(options?.volume ?? 1.0, false);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
    }
}

export const audioManager = AudioManager.getInstance();

