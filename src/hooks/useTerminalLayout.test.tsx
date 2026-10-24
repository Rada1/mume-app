/** @file useTerminalLayout.test.tsx — Guards resize coalescing, font caching, and cleanup. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useTerminalLayout } from './useTerminalLayout';

// --- Layout Harness ---
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); document.body.innerHTML = ''; });

async function mountLayout() {
    vi.useFakeTimers();
    let width = 400;
    let height = 300;
    let resolveFonts!: () => void;
    const ready = new Promise<void>(resolve => { resolveFonts = resolve; });
    const oldFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    const fontListeners = new Set<EventListener>();
    Object.defineProperty(document, 'fonts', {configurable: true, value: {ready,
        addEventListener: (_name: string, callback: EventListener) => fontListeners.add(callback),
        removeEventListener: (_name: string, callback: EventListener) => fontListeners.delete(callback)}});
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
    let notifyResize!: () => void;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
        constructor(callback: () => void) { notifyResize = callback; }
        observe = vi.fn(); disconnect = disconnect;
    });
    const surface = document.createElement('div');
    surface.className = 'message-log-container';
    const log = document.createElement('div');
    log.className = 'message-log';
    log.style.padding = '0';
    Object.defineProperty(log, 'clientWidth', {get: () => width});
    Object.defineProperty(surface, 'clientHeight', {get: () => height});
    surface.appendChild(log);
    document.body.appendChild(surface);
    const probe = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 6000, 100));
    const cssWrites = vi.spyOn(document.documentElement.style, 'setProperty');
    const host = document.createElement('div');
    const root = createRoot(host);
    let metrics!: ReturnType<typeof useTerminalLayout>;
    function Harness() {
        metrics = useTerminalLayout({isMobile: true, isLandscape: false, logFontSize: 1, windowWidth: 400,
            fontFamily: 'monospace', isTimestampEnabled: false, isNewbieMode: false});
        return null;
    }
    await act(async () => root.render(<Harness/>));
    const flush = async () => {
        const pending = [...frames.values()]; frames.clear();
        await act(async () => pending.forEach(callback => callback(0)));
    };
    return {frames, probe, cssWrites, notifyResize, resolveFonts, disconnect, fontListeners, flush, log,
        metrics: () => metrics, resize: (nextWidth: number, nextHeight: number) => { width = nextWidth; height = nextHeight; notifyResize(); },
        cleanup: async () => {
            await act(async () => root.unmount());
            if (oldFonts) Object.defineProperty(document, 'fonts', oldFonts);
            else Reflect.deleteProperty(document, 'fonts');
        }};
}

// --- Resize Checks ---
it('coalesces repeated notifications, caches font probes, and avoids unchanged CSS writes', async () => {
    const layout = await mountLayout();
    try {
        await layout.flush();
        expect(layout.probe).toHaveBeenCalledOnce();
        expect(layout.metrics().columns).toBeGreaterThan(0);
        const firstSize = layout.metrics().logFontSizePx;
        layout.cssWrites.mockClear();
        for (let index = 0; index < 50; index++) layout.notifyResize();
        expect(layout.frames.size).toBe(1);
        await layout.flush();
        expect(layout.probe).toHaveBeenCalledOnce();
        expect(layout.cssWrites).not.toHaveBeenCalled();
        layout.resize(500, 300);
        await layout.flush();
        expect(layout.metrics().logFontSizePx).toBeGreaterThan(firstSize);
        expect(layout.probe).toHaveBeenCalledOnce();
        const previousRows = layout.metrics().rows;
        layout.cssWrites.mockClear();
        layout.resize(500, 500);
        await layout.flush();
        expect(layout.metrics().rows).toBeGreaterThan(previousRows);
        expect(layout.cssWrites).not.toHaveBeenCalled();
        const paddedSize = layout.metrics().logFontSizePx;
        layout.log.style.padding = '0 20px';
        layout.notifyResize();
        await layout.flush();
        expect(layout.metrics().logFontSizePx).toBeLessThan(paddedSize);
        expect(layout.probe).toHaveBeenCalledOnce();
    } finally { await layout.cleanup(); }
});

it('remeasures after font loading and cancels pending work and listeners on unmount', async () => {
    const layout = await mountLayout();
    await layout.flush();
    await act(async () => layout.resolveFonts());
    await layout.flush();
    expect(layout.probe).toHaveBeenCalledTimes(2);
    layout.notifyResize();
    await layout.cleanup();
    expect(layout.frames.size).toBe(0);
    expect(layout.disconnect).toHaveBeenCalledOnce();
    expect(layout.fontListeners.size).toBe(0);
    layout.notifyResize();
    expect(layout.frames.size).toBe(0);
});
