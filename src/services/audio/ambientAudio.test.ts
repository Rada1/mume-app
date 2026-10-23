// @vitest-environment jsdom
/**
 * @file ambientAudio.test.ts
 * @description Verifies that terrain and weather (rain) sounds play without muffling filters.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { audioManager } from './AudioManager';

class MockAudioParam {
    value: number = 0;
    setValueAtTime = vi.fn((val: number) => { this.value = val; });
    linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
    exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
    cancelScheduledValues = vi.fn();
}

class MockAudioNode {
    connect = vi.fn();
    disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
    gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
    type: string = 'lowpass';
    frequency = new MockAudioParam();
    Q = new MockAudioParam();
}

class MockAudioBufferSourceNode extends MockAudioNode {
    buffer: any = null;
    loop: boolean = false;
    playbackRate = new MockAudioParam();
    start = vi.fn();
    stop = vi.fn();
    onended: (() => void) | null = null;
}

class MockAudioContext {
    currentTime: number = 0;
    state: string = 'running';
    destination = new MockAudioNode();
    createGain = vi.fn(() => new MockGainNode());
    createBiquadFilter = vi.fn(() => new MockBiquadFilterNode());
    createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
    createDelay = vi.fn(() => ({
        delayTime: new MockAudioParam(),
        ...new MockAudioNode()
    }));
    decodeAudioData = vi.fn(async () => ({
        duration: 10,
        numberOfChannels: 2,
        sampleRate: 44100,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
    }));
    resume = vi.fn(async () => {});
    suspend = vi.fn(async () => {});
}

describe('Ambient audio unmuffled verification', () => {
    let mockContext: MockAudioContext;

    beforeEach(() => {
        mockContext = new MockAudioContext();
        class MockConstructor {
            constructor() {
                return mockContext;
            }
        }
        (window as any).AudioContext = MockConstructor;
        (window as any).webkitAudioContext = MockConstructor;

        global.fetch = vi.fn(async () => ({
            ok: true,
            headers: { get: () => 'audio/mpeg' },
            arrayBuffer: async () => new ArrayBuffer(1024)
        })) as any;

        // Ensure audioManager uses this mock context
        (audioManager as any).audioCtx = null;
        audioManager.init();
    });

    afterEach(() => {
        audioManager.stopAllAmbients();
        vi.restoreAllMocks();
    });

    it('plays terrain ambient without any lowpass filter', async () => {
        await audioManager.setAmbient('terrain', { key: 'FOREST' });

        const activeTerrain = audioManager.getActiveAmbient('terrain');
        expect(activeTerrain).toBeDefined();
        expect(activeTerrain?.filter).toBeUndefined();
        expect(mockContext.createBiquadFilter).not.toHaveBeenCalled();
    });

    it('plays weather rain ambient without any lowpass filter', async () => {
        await audioManager.setAmbient('weather', { key: 'rain' });

        const activeWeather = audioManager.getActiveAmbient('weather');
        expect(activeWeather).toBeDefined();
        expect(activeWeather?.filter).toBeUndefined();
        expect(mockContext.createBiquadFilter).not.toHaveBeenCalled();
    });

    it('re-evaluating already playing terrain or weather does not add or ramp filter', async () => {
        await audioManager.setAmbient('weather', { key: 'rain' });
        expect(audioManager.getActiveAmbient('weather')?.filter).toBeUndefined();

        // Call again while already playing (e.g. state refresh or combat)
        await audioManager.setAmbient('weather', { key: 'rain', inCombat: true });
        const activeWeather = audioManager.getActiveAmbient('weather');
        expect(activeWeather?.filter).toBeUndefined();
        expect(mockContext.createBiquadFilter).not.toHaveBeenCalled();
    });

    it('retains lowpass combat filter for zone music', async () => {
        await audioManager.setAmbient('zone', { key: 'bree', inCombat: true });

        const activeZone = audioManager.getActiveAmbient('zone');
        expect(activeZone).toBeDefined();
        expect(activeZone?.filter).toBeDefined();
        expect(mockContext.createBiquadFilter).toHaveBeenCalled();
        expect(activeZone?.filter?.frequency.value).toBe(500);
    });
});
