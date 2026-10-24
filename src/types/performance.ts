/** @file performance.ts — UI profiling and browser frame timing contracts. */
// --- Timing Types ---
export interface UiScriptTiming {
    duration: number;
    forcedStyleAndLayoutDuration?: number;
    sourceFunctionName?: string;
    invoker?: string;
}

export interface UiFrameTiming {
    startTime: number;
    duration: number;
    styleAndLayoutStart?: number;
    scripts?: UiScriptTiming[];
}

export interface UiRenderTiming {
    name: string;
    count: number;
    p95Ms: number;
    maxMs: number;
}
