/** @file uiPerformance.test.ts — Guards bounded, resettable UI timing diagnostics. */
import { afterEach, expect, it, vi } from 'vitest';
import { uiPerformance } from './uiPerformance';

// --- Collection Checks ---
afterEach(() => { uiPerformance.enabled = false; uiPerformance.reset(); vi.unstubAllGlobals(); });

it('records only while enabled, bounds samples, and resets measurements', () => {
    uiPerformance.recordRender('Log', 999);
    expect(uiPerformance.getSnapshot().renders).toEqual([]);
    uiPerformance.enabled = true;
    for (let index = 0; index < 150; index++) uiPerformance.recordRender('Log', index);
    expect(uiPerformance.getSnapshot().renders).toEqual([{name: 'Log', count: 120, p95Ms: 144, maxMs: 149}]);
    uiPerformance.reset();
    expect(uiPerformance.getSnapshot().renders).toEqual([]);
});

it('measures hook work separately from React renders and discards scopes across reset or toggles', () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    try {
        const disabled = uiPerformance.startWork('Controller');
        uiPerformance.enabled = true;
        disabled();
        const finish = uiPerformance.startWork('Target tree');
        now = 12;
        finish(); finish();
        expect(uiPerformance.getSnapshot().work).toEqual([{name: 'Target tree', count: 1, p95Ms: 12, maxMs: 12}]);
        expect(uiPerformance.getSnapshot().renders).toEqual([]);
        const old = uiPerformance.startWork('Controller');
        uiPerformance.reset();
        now = 25;
        old();
        expect(uiPerformance.getSnapshot().work).toEqual([]);
        const toggled = uiPerformance.startWork('Controller');
        uiPerformance.enabled = false;
        uiPerformance.enabled = true;
        toggled();
        expect(uiPerformance.getSnapshot().work).toEqual([]);
    } finally { clock.mockRestore(); }
});

it('separates browser frame duration, render tail, and forced layout attribution', () => {
    uiPerformance.enabled = true;
    uiPerformance.recordFrame({startTime: 100, duration: 350, styleAndLayoutStart: 300, scripts: [
        {duration: 120, forcedStyleAndLayoutDuration: 25, sourceFunctionName: 'flushLog'},
        {duration: 20, forcedStyleAndLayoutDuration: 5, invoker: 'requestAnimationFrame'}
    ]});
    expect(uiPerformance.getSnapshot()).toMatchObject({frameCount: 1, longestFrameMs: 350,
        renderingTailMaxMs: 150, scriptWorkMaxMs: 140, forcedLayoutMaxMs: 30,
        slowestScript: 'flushLog', slowestScriptMs: 120});
    uiPerformance.reset();
    expect(uiPerformance.getSnapshot()).toMatchObject({frameCount: 0, longestFrameMs: 0, slowestScript: ''});
});

it('connects and disconnects a supported browser observer and discards pending entries on reset', () => {
    const disconnect = vi.fn();
    const takeRecords = vi.fn();
    const observe = vi.fn();
    let deliver!: PerformanceObserverCallback;
    vi.stubGlobal('PerformanceObserver', class {
        static supportedEntryTypes = ['long-animation-frame'];
        constructor(callback: PerformanceObserverCallback) { deliver = callback; }
        observe = observe;
        disconnect = disconnect;
        takeRecords = takeRecords;
    });
    uiPerformance.enabled = true;
    expect(observe).toHaveBeenCalledWith({type: 'long-animation-frame'});
    deliver({getEntries: () => [{startTime: 0, duration: 65}]} as PerformanceObserverEntryList, {} as PerformanceObserver);
    expect(uiPerformance.getSnapshot()).toMatchObject({frameTimingAvailable: true, frameCount: 1});
    uiPerformance.reset();
    expect(takeRecords).toHaveBeenCalledOnce();
    uiPerformance.enabled = false;
    expect(disconnect).toHaveBeenCalledOnce();
});

it('reports unsupported frame attribution explicitly and bounds retained browser frames', () => {
    vi.stubGlobal('PerformanceObserver', undefined);
    uiPerformance.enabled = true;
    expect(uiPerformance.getSnapshot().frameTimingAvailable).toBe(false);
    for (let index = 0; index < 80; index++) uiPerformance.recordFrame({startTime: index, duration: 50});
    expect(uiPerformance.getSnapshot().frameCount).toBe(60);
});
