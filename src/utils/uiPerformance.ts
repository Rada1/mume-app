/** @file uiPerformance.ts — Bounded React and browser-frame diagnostics for /perf. */
import type { UiFrameTiming, UiRenderTiming } from '../types';
const noop = () => undefined;

// --- Collection Section ---
class UiPerformance {
    private active = false;
    private generation = 0;
    private observer: PerformanceObserver | null = null;
    private renders = new Map<string, number[]>();
    private work = new Map<string, number[]>();
    private frames: UiFrameTiming[] = [];
    private frameTimingAvailable = false;

    set enabled(value: boolean) {
        if (value === this.active) return;
        this.active = value;
        this.generation++;
        if (!value) { this.observer?.disconnect(); this.observer = null; return; }
        this.frameTimingAvailable = typeof PerformanceObserver !== 'undefined'
            && PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') === true;
        if (!this.frameTimingAvailable) return;
        try {
            this.observer = new PerformanceObserver(list => {
                if (!this.active) return;
                for (const entry of list.getEntries()) this.recordFrame(entry as PerformanceEntry & UiFrameTiming);
            });
            this.observer.observe({type: 'long-animation-frame'});
        } catch {
            this.observer?.disconnect();
            this.observer = null;
            this.frameTimingAvailable = false;
        }
    }

    recordRender(name: string, duration: number): void {
        if (!this.active) return;
        const samples = this.renders.get(name) ?? [];
        samples.push(duration);
        if (samples.length > 120) samples.shift();
        this.renders.set(name, samples);
    }

    startWork(name: string): () => void {
        if (!this.active) return noop;
        const startedAt = performance.now();
        const generation = this.generation;
        let finished = false;
        return () => {
            if (!this.active || finished || generation !== this.generation) return;
            finished = true;
            const samples = this.work.get(name) ?? [];
            samples.push(performance.now() - startedAt);
            if (samples.length > 120) samples.shift();
            this.work.set(name, samples);
        };
    }

    recordFrame(frame: UiFrameTiming): void {
        if (!this.active) return;
        // Copy only timings and function names; never retain source URLs or DOM nodes.
        this.frames.push({startTime: frame.startTime, duration: frame.duration,
            styleAndLayoutStart: frame.styleAndLayoutStart,
            scripts: Array.from(frame.scripts ?? [], script => ({duration: script.duration,
                forcedStyleAndLayoutDuration: script.forcedStyleAndLayoutDuration,
                sourceFunctionName: script.sourceFunctionName, invoker: script.invoker}))});
        if (this.frames.length > 60) this.frames.shift();
    }

    reset(): void {
        this.generation++;
        this.observer?.takeRecords();
        this.renders.clear();
        this.work.clear();
        this.frames = [];
    }

    getSnapshot() {
        const summarize = (source: Map<string, number[]>): UiRenderTiming[] => Array.from(source, ([name, samples]) => {
            const sorted = [...samples].sort((a, b) => a - b);
            return {name, count: samples.length, p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? 0,
                maxMs: sorted[sorted.length - 1] ?? 0};
        }).sort((a, b) => b.maxMs - a.maxMs);
        const renders = summarize(this.renders);
        const work = summarize(this.work);
        let longestFrameMs = 0;
        let renderingTailMaxMs = 0;
        let scriptWorkMaxMs = 0;
        let forcedLayoutMaxMs = 0;
        let slowestScriptMs = 0;
        let slowestScript = '';
        for (const frame of this.frames) {
            longestFrameMs = Math.max(longestFrameMs, frame.duration);
            if (frame.styleAndLayoutStart && frame.styleAndLayoutStart >= frame.startTime) {
                renderingTailMaxMs = Math.max(renderingTailMaxMs, Math.max(0, frame.startTime + frame.duration - frame.styleAndLayoutStart));
            }
            const scripts = frame.scripts ?? [];
            scriptWorkMaxMs = Math.max(scriptWorkMaxMs, scripts.reduce((sum, script) => sum + script.duration, 0));
            forcedLayoutMaxMs = Math.max(forcedLayoutMaxMs, scripts.reduce((sum, script) => sum + (script.forcedStyleAndLayoutDuration ?? 0), 0));
            for (const script of scripts) {
                if (script.duration <= slowestScriptMs) continue;
                slowestScriptMs = script.duration;
                slowestScript = (script.sourceFunctionName || script.invoker || 'anonymous').slice(0, 80);
            }
        }
        return {renders, work, frameTimingAvailable: this.frameTimingAvailable, frameCount: this.frames.length,
            longestFrameMs, renderingTailMaxMs, scriptWorkMaxMs, forcedLayoutMaxMs, slowestScriptMs, slowestScript};
    }
}

export const uiPerformance = new UiPerformance();
