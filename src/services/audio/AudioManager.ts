import { AUDIO_MANIFEST, AmbientConfig } from '../../constants/audioManifest';

export interface PlayOptions {
    pitch?: number;
    volume?: number;
    reverse?: boolean;
    filterFrequency?: number;
    label?: string;
}

interface ActiveAmbient {
    source: AudioBufferSourceNode;
    gain: GainNode;
    filter?: BiquadFilterNode;
    url: string;
    key: string;
    pauseOffset: number;
    startTime: number;
}

class AudioManager {
    private static instance: AudioManager;

    private audioCtx: AudioContext | null = null;
    private bufferCache: Map<string, AudioBuffer> = new Map();
    private loadingState: Map<string, Promise<AudioBuffer | null>> = new Map();

    private activeAmbients: Map<'terrain' | 'weather' | 'zone' | 'drum' | 'incantation', ActiveAmbient> = new Map();
    private _isSoundEnabled: boolean = true;
    private silenceTimeout: NodeJS.Timeout | null = null;

    // Drum logic references
    private drumFadingSource: AudioBufferSourceNode | null = null;
    private incantationFadingSource: AudioBufferSourceNode | null = null;

    private constructor() {}

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
        this._isSoundEnabled = enabled;
        if (!enabled) {
            this.stopAllAmbients();
        } else if (this.audioCtx?.state === 'suspended') {
            this.audioCtx.resume().catch(console.error);
        }
    }

    public get isSoundEnabled(): boolean {
        return this._isSoundEnabled;
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
        gainNode.gain.value = options?.volume ?? config.defaultVolume ?? 1.0;

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

    public async setAmbient(type: 'terrain' | 'weather' | 'zone', key: string | null, dynamicUrls?: string[], inCombat: boolean = false, isDay: boolean = true) {
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
            let config = (AUDIO_MANIFEST.ambient as any).terrains[key];
            if (!config) {
                const foundKey = Object.keys((AUDIO_MANIFEST.ambient as any).terrains).find(k => key.includes(k));
                if (foundKey) config = (AUDIO_MANIFEST.ambient as any).terrains[foundKey];
            }

            if (config) {
                urlToPlay = config.url;
                targetVolume = config.volume;

                if (key.includes('FIELD') || key.includes('ROAD') || key.includes('BRUSH')) {
                    if (isDay) {
                        urlToPlay = '/assets/Sounds/Terrain Sounds/dayfield.wav';
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
                 if (active.filter) {
                     const f = active.filter.frequency;
                     f.cancelScheduledValues(this.audioCtx.currentTime);
                     f.setValueAtTime(f.value, this.audioCtx.currentTime);
                     f.exponentialRampToValueAtTime(inCombat ? 500 : 20000, this.audioCtx.currentTime + 1.5);
                 }
                 const g = active.gain.gain;
                 g.cancelScheduledValues(this.audioCtx.currentTime);
                 g.setValueAtTime(g.value, this.audioCtx.currentTime);
                 g.linearRampToValueAtTime(targetVolume, this.audioCtx.currentTime + 1.5);
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

        const fadeTime = type === 'zone' ? 2.0 : 2.0;

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
        gain.gain.linearRampToValueAtTime(targetVolume, ctx.currentTime + fadeTime);

        lastNode.connect(gain);
        gain.connect(ctx.destination);

        let startOffset = 0;
        // Resume offset logic could be added here if needed, keeping it simple for now

        if (type === 'zone') {
            source.onended = () => {
                if (this.activeAmbients.get('zone')?.source === source) {
                    this.activeAmbients.delete('zone');
                    this.stopAmbient('drum');

                    if (this.silenceTimeout) clearTimeout(this.silenceTimeout);
                    const silenceMinutes = 1 + Math.random() * 3;
                    this.silenceTimeout = setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('mume-audio-zone-ended', { detail: { key } }));
                    }, silenceMinutes * 60 * 1000);
                }
            };
        }

        source.start(0, startOffset % buffer.duration);

        this.activeAmbients.set(type, {
            source, gain, filter, url: urlToPlay, key, pauseOffset: startOffset % buffer.duration, startTime: ctx.currentTime
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

        if (inCombat && activeZoneUrl) {
            const activeDrum = this.activeAmbients.get('drum');
            if (activeDrum) return; // Already playing

            const drumUrl = AUDIO_MANIFEST.ambient.special.drumLoop.url as string;
            const buffer = await this.loadBuffer(drumUrl);
            if (!buffer) return;

            const musicFilename = activeZoneUrl.split('/').pop() || '';
            const musicBpm = AUDIO_MANIFEST.bpmMap[musicFilename] || 100;
            const drumBpm = AUDIO_MANIFEST.bpmMap['drumbeat.mp3'] || 100;

            const ctx = this.audioCtx;
            const dSource = ctx.createBufferSource();
            dSource.buffer = buffer;
            dSource.loop = true;
            dSource.playbackRate.value = musicBpm / drumBpm;

            const dGain = ctx.createGain();
            dGain.gain.setValueAtTime(0, ctx.currentTime);
            dGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1.5);

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
                source: dSource, gain: dGain, filter: dFilter, url: drumUrl, key: 'drumLoop', pauseOffset: 0, startTime: ctx.currentTime
            });
        } else {
            this.stopAmbient('drum');
        }
    }

    public async playIncantation() {
        if (!this._isSoundEnabled || !this.audioCtx) return;
        if (this.activeAmbients.has('incantation')) return;

        const config = AUDIO_MANIFEST.effects['incantations'];
        const buffer = await this.loadBuffer(config.path);
        if (!buffer) return;

        const ctx = this.audioCtx;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = 1.5 + (Math.random() * 0.1 - 0.05);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.3);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);

        this.activeAmbients.set('incantation', {
            source, gain, filter, url: config.path, key: 'incantations', pauseOffset: 0, startTime: ctx.currentTime
        });
    }

    public stopIncantation(playExplosion: boolean = false) {
        const active = this.activeAmbients.get('incantation');
        if (active) {
            if (playExplosion) this.playEffect('magicexplosion', { volume: 1.5 });
            this.fadeOutAndStop(active.source, active.gain, active.filter, 0.1);
            this.activeAmbients.delete('incantation');
        }
    }
}

export const audioManager = AudioManager.getInstance();
