import { AUDIO_MANIFEST, AmbientConfig } from '../../constants/audioManifest';
import { useSettingsStore } from '../../stores/useSettingsStore';

export interface PlayOptions {
    pitch?: number;
    volume?: number;
    reverse?: boolean;
    filterFrequency?: number;
    label?: string;
}

export interface AmbientOptions {
    key: string | null;
    dynamicUrls?: string[];
    inCombat?: boolean;
    isDay?: boolean;
}

type AmbientType = 'terrain' | 'weather' | 'zone' | 'drum' | 'incantation' | 'heartbeat' | 'breath';

interface ActiveAmbient {
    source: AudioBufferSourceNode;
    gain: GainNode;
    filter?: BiquadFilterNode;
    url: string;
    key: string;
    pauseOffset: number;
    startTime: number;
    baseVolume: number;
    isMusic: boolean;
}

export class AudioManager {
    private static instance: AudioManager;

    private audioCtx: AudioContext | null = null;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private loadingState: Map<string, Promise<AudioBuffer | null>> = new Map();

    private activeAmbients: Map<AmbientType, ActiveAmbient> = new Map();
    private _isSoundEnabled: boolean = true;
    private silenceTimeout: NodeJS.Timeout | null = null;
    private zoneEndedListeners: Set<(key: string) => void> = new Set();

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
            this.isSoundEnabled = state.isSoundEnabled;
            this.atmosphereState.masterVolume = state.masterVolume;
            this.atmosphereState.musicVolume = state.musicVolume;
            this.updateActiveVolumes();
        });

        // Initialize volumes
        const initialSettings = useSettingsStore.getState();
        this._isSoundEnabled = initialSettings.isSoundEnabled;
        this.atmosphereState.masterVolume = initialSettings.masterVolume;
        this.atmosphereState.musicVolume = initialSettings.musicVolume;
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
        } else if (this.audioCtx?.state === 'suspended') {
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
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(console.error);
        }
    }

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

    private getEffectiveVolume(baseVolume: number, isMusic: boolean = false): number {
        const settings = useSettingsStore.getState();
        const master = settings.masterVolume;
        const subVolume = isMusic ? settings.musicVolume : settings.sfxVolume;
        return baseVolume * master * subVolume;
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

    private updateActiveVolumes() {
        if (!this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        this.activeAmbients.forEach(active => {
            const gain = active.gain.gain;
            const target = this.getEffectiveVolume(active.baseVolume, active.isMusic);
            try {
                gain.cancelScheduledValues(now);
                gain.setValueAtTime(gain.value, now);
                gain.linearRampToValueAtTime(target, now + 0.08);
            } catch (err) {
                gain.value = target;
            }
        });
    }

    public async playEffect(key: string, options?: PlayOptions) {
        if (!this._isSoundEnabled) return;
        this.init();
        if (!this.audioCtx) return;

        const config = AUDIO_MANIFEST.effects[key];
        if (!config) {
            console.warn(`[AudioManager] Effect not found in manifest: ${key}`);
            return;
        }

        let buffer = await this.loadBuffer(config.path);
        if (!buffer) return;

        const ctx = this.audioCtx;

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

        const source = ctx.createBufferSource();
        source.buffer = actualBuffer;

        const basePitch = options?.pitch ?? config.defaultPitch ?? 1.0;
        const jitterRange = 0.24;
        const jitter = (Math.random() * jitterRange - (jitterRange / 2));
        source.playbackRate.value = basePitch + jitter;

        const gainNode = ctx.createGain();
        const baseVol = options?.volume ?? config.defaultVolume ?? 1.0;
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
        source.start(0);
    }

    public async setAmbient(type: 'terrain' | 'weather' | 'zone', options: AmbientOptions) {
        const { key, dynamicUrls, inCombat = false, isDay = true } = options;
        if (!this._isSoundEnabled && key !== null) return;
        this.init();
        if (!this.audioCtx) return;

        if (key === null) {
            this.stopAmbient(type);
            if (type === 'zone') this.stopAmbient('drum');
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
            isLoop = false;
            let configUrls: string | string[] | undefined = undefined;
            if (dynamicUrls && dynamicUrls.length > 0) {
                 configUrls = dynamicUrls;
            } else {
                 const config = (AUDIO_MANIFEST.ambient as any).zones[key];
                 if (config) configUrls = config.url as string;
            }

            if (configUrls) {
                if (Array.isArray(configUrls)) {
                    urlToPlay = configUrls[Math.floor(Math.random() * configUrls.length)];
                } else {
                    urlToPlay = configUrls as string;
                }
            }

            if (inCombat) {
                targetVolume = 0.035;
            } else {
                targetVolume = 0.045;
            }
        }

        if (!urlToPlay) {
            this.stopAmbient(type);
            if (type === 'zone') this.stopAmbient('drum');
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
                 g.linearRampToValueAtTime(this.getEffectiveVolume(targetVolume, true), this.audioCtx.currentTime + 1.5);
            }
            return;
        }

        const buffer = await this.loadBuffer(urlToPlay);
        if (!buffer) return;

        // Crossfade logic
        this.crossFadeAmbient(type, urlToPlay, key, buffer, targetVolume, isLoop, inCombat ? 500 : 20000);
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
        gain.gain.linearRampToValueAtTime(this.getEffectiveVolume(targetVolume, isMusic), ctx.currentTime + fadeTime);

        lastNode.connect(gain);
        gain.connect(ctx.destination);

        let startOffset = 0;

        if (type === 'zone') {
            source.onended = () => {
                if (this.activeAmbients.get('zone')?.source === source) {
                    this.activeAmbients.delete('zone');
                    this.stopAmbient('drum');

                    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
                    const silenceMinutes = 1 + Math.random() * 3;
                    this.silenceTimeout = setTimeout(() => {
                        this.zoneEndedListeners.forEach(l => l(key));
                    }, silenceMinutes * 60 * 1000);
                }
            };
        }

        source.start(0, startOffset % buffer.duration);

        this.activeAmbients.set(type, {
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

    private stopAmbient(type: 'terrain' | 'weather' | 'zone' | 'drum' | 'incantation') {
        const active = this.activeAmbients.get(type);
        if (active) {
            this.fadeOutAndStop(active.source, active.gain, active.filter, 2.0);
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
    public async updateDrumLayer(inCombat: boolean, activeZoneUrl: string | null) {
        if (!this._isSoundEnabled || !this.audioCtx) return;

        const zoneActive = this.activeAmbients.get('zone');
        const effectiveUrl = (activeZoneUrl && activeZoneUrl.includes('/')) ? activeZoneUrl : zoneActive?.url;

        if (inCombat && effectiveUrl) {
            const activeDrum = this.activeAmbients.get('drum');
            if (activeDrum) return; // Already playing

            const drumUrl = AUDIO_MANIFEST.ambient.special.drumLoop.url as string;
            const buffer = await this.loadBuffer(drumUrl);
            if (!buffer) return;

            const musicFilename = effectiveUrl.split('/').pop() || '';
            const musicBpm = AUDIO_MANIFEST.bpmMap[musicFilename] || 100;
            const drumBpm = AUDIO_MANIFEST.bpmMap['drumbeat.mp3'] || 100;

            const ctx = this.audioCtx;
            const dSource = ctx.createBufferSource();
            dSource.buffer = buffer;
            dSource.loop = true;
            dSource.playbackRate.value = musicBpm / drumBpm;

            const dGain = ctx.createGain();
            dGain.gain.setValueAtTime(0, ctx.currentTime);
            dGain.gain.linearRampToValueAtTime(this.getEffectiveVolume(0.03, true), ctx.currentTime + 1.5);

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
                source: dSource,
                gain: dGain,
                filter: dFilter,
                url: drumUrl,
                key: 'drumLoop',
                pauseOffset: 0,
                startTime: ctx.currentTime,
                baseVolume: 0.03,
                isMusic: true
            });
        } else {
            this.stopAmbient('drum');
        }
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
        if (playExplosion) this.playEffect('magicexplosion', { volume: 1.5 });
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
            if (!this._isSoundEnabled || !this.audioCtx || this.atmosphereState.hpRatio > FX_THRESHOLD) {
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
                if (!this.audioCtx || !this._isSoundEnabled) return;
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
            if (!this._isSoundEnabled || !this.audioCtx || this.atmosphereState.moveRatio > FX_THRESHOLD) {
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
        if (!this._isSoundEnabled || !this.audioCtx) return;
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

