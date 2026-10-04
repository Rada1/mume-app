/**
 * @file logFlushScheduler.ts
 * @description Commits buffered log output once per visible frame, with a hidden-tab fallback.
 */

// --- Logic Section ---

export interface LogFlushClock {
    requestFrame: (callback: FrameRequestCallback) => number;
    cancelFrame: (handle: number) => void;
    setTimer: (callback: () => void, delayMs: number) => number;
    clearTimer: (handle: number) => void;
    isHidden: () => boolean;
}

const browserClock: LogFlushClock = {
    requestFrame: callback => window.requestAnimationFrame(callback),
    cancelFrame: handle => window.cancelAnimationFrame(handle),
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: handle => window.clearTimeout(handle),
    isHidden: () => document.visibilityState === 'hidden',
};

export class LogFlushScheduler {
    private frame: number | null = null;
    private timer: number | null = null;

    constructor(
        private readonly flush: () => void,
        private readonly clock: LogFlushClock = browserClock,
    ) { }

    schedule(): void {
        if (this.frame !== null || this.timer !== null) return;
        if (this.clock.isHidden()) {
            this.timer = this.clock.setTimer(this.run, 250);
        } else {
            this.frame = this.clock.requestFrame(this.run);
        }
    }

    onVisibilityChange(): void {
        if (this.frame === null && this.timer === null) return;
        this.cancel();
        this.schedule();
    }

    cancel(): void {
        if (this.frame !== null) this.clock.cancelFrame(this.frame);
        if (this.timer !== null) this.clock.clearTimer(this.timer);
        this.frame = null;
        this.timer = null;
    }

    private readonly run = (): void => {
        this.frame = null;
        this.timer = null;
        this.flush();
    };
}
