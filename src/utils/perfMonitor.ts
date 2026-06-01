/**
 * @file perfMonitor.ts
 * @description Lightweight, always-available performance collector for diagnosing
 * session-length degradation (stutter that worsens the longer/more you play).
 *
 * Fed imperatively from hot paths (animation loop, renderer cache rebuilds, map
 * persistence saves). Costs nothing when `enabled` is false — every record* method
 * early-returns. The PerfHUD flips `enabled` on/off with its visibility.
 */

interface SaveStat {
    ms: number;
    bytes: number;
    rooms: number;
    at: number;
}

export interface RebuildBreakdown {
    total: number;    // whole rebuild block
    gather: number;   // spatial-bucket gathering loops
    terrain: number;  // terrain layer draw
    feature: number;  // feature layer draw (icons, doors)
    tiles: number;    // rooms/tiles touched this rebuild
    reason?: string;  // which condition triggered this rebuild
}

const MAX_SAMPLES = 120;

class PerfMonitor {
    enabled = false;

    private drawTimes: number[] = [];     // ms spent inside drawMap per frame
    private frameIntervals: number[] = []; // ms between actual rendered frames
    private lastFrameAt = 0;
    private frameStamps: number[] = [];    // timestamps of rendered frames (for FPS)
    private rebuildStamps: number[] = [];  // timestamps of static-cache rebuilds
    private rebuildReasons: { at: number; reason: string }[] = []; // why each rebuild fired
    private parserWorkerTimes: number[] = [];
    private parserSyncTimes: number[] = [];

    lastFullSave: SaveStat | null = null;
    lastPosSave: SaveStat | null = null;
    peakFullSaveMs = 0;
    roomCount = 0;
    peakDrawMs = 0;

    // Static-cache rebuild breakdown (the confirmed stutter source)
    lastRebuild: RebuildBreakdown | null = null;
    peakRebuild: RebuildBreakdown | null = null;
    peakRebuildMs = 0;

    // Per-tile icon-pass split (accumulated during a single drawTerrains call).
    // wallMs = CPU (getRoomWalls/getGateState/getCaveConnects); iconMs = raster (drawImage).
    wallMs = 0;
    iconMs = 0;
    lastWallMs = 0;
    lastIconMs = 0;

    // Terrain sub-phase split (set once per terrain phase via setTerrainSplit).
    lastTerrainSplit: { terrains: number; local: number; grid: number; zone: number } | null = null;

    addWallMs(ms: number) { if (this.enabled) this.wallMs += ms; }
    addIconMs(ms: number) { if (this.enabled) this.iconMs += ms; }
    resetIconSplit() { this.wallMs = 0; this.iconMs = 0; }
    setTerrainSplit(split: { terrains: number; local: number; grid: number; zone: number }) {
        if (this.enabled) this.lastTerrainSplit = split;
    }

    recordFrame(drawMs: number) {
        if (!this.enabled) return;
        const now = performance.now();

        this.drawTimes.push(drawMs);
        if (this.drawTimes.length > MAX_SAMPLES) this.drawTimes.shift();
        if (drawMs > this.peakDrawMs) this.peakDrawMs = drawMs;

        if (this.lastFrameAt) {
            this.frameIntervals.push(now - this.lastFrameAt);
            if (this.frameIntervals.length > MAX_SAMPLES) this.frameIntervals.shift();
        }
        this.lastFrameAt = now;
        this.frameStamps.push(now);
    }

    recordRebuild(breakdown: RebuildBreakdown) {
        if (!this.enabled) return;
        const now = performance.now();
        this.rebuildStamps.push(now);
        if (breakdown.reason) this.rebuildReasons.push({ at: now, reason: breakdown.reason });
        this.lastRebuild = breakdown;
        this.lastWallMs = this.wallMs;
        this.lastIconMs = this.iconMs;
        if (breakdown.total > this.peakRebuildMs) {
            this.peakRebuildMs = breakdown.total;
            this.peakRebuild = breakdown;
        }
    }

    recordSave(kind: 'full' | 'pos', ms: number, bytes: number, rooms: number) {
        if (!this.enabled) return;
        const stat: SaveStat = { ms, bytes, rooms, at: Date.now() };
        this.roomCount = rooms;
        if (kind === 'full') {
            this.lastFullSave = stat;
            if (ms > this.peakFullSaveMs) this.peakFullSaveMs = ms;
        } else {
            this.lastPosSave = stat;
        }
    }

    recordParserTokenize(mode: 'worker' | 'sync', ms: number) {
        if (!this.enabled) return;
        const bucket = mode === 'worker' ? this.parserWorkerTimes : this.parserSyncTimes;
        bucket.push(ms);
        if (bucket.length > MAX_SAMPLES) bucket.shift();
    }

    resetPeaks() {
        this.peakDrawMs = 0;
        this.peakFullSaveMs = 0;
        this.peakRebuildMs = 0;
        this.peakRebuild = null;
    }

    getSnapshot() {
        const now = performance.now();
        // Trim rolling 1s windows
        this.frameStamps = this.frameStamps.filter(t => now - t < 1000);
        this.rebuildStamps = this.rebuildStamps.filter(t => now - t < 1000);
        this.rebuildReasons = this.rebuildReasons.filter(r => now - r.at < 1000);

        const reasonCounts: Record<string, number> = {};
        for (const r of this.rebuildReasons) reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
        const reasonSummary = Object.entries(reasonCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}:${v}`)
            .join(' ');

        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const p95 = (arr: number[]) => {
            if (!arr.length) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
        };
        const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

        const mem = (performance as any).memory;

        return {
            fps: this.frameStamps.length,                 // rendered frames in last 1s
            rebuildsPerSec: this.rebuildStamps.length,    // cache rebuilds in last 1s
            rebuildReasons: reasonSummary,                // why rebuilds fired (last 1s)
            drawAvgMs: avg(this.drawTimes),
            drawP95Ms: p95(this.drawTimes),
            drawMaxMs: max(this.drawTimes),
            peakDrawMs: this.peakDrawMs,
            parserWorkerAvgMs: avg(this.parserWorkerTimes),
            parserWorkerMaxMs: max(this.parserWorkerTimes),
            parserSyncAvgMs: avg(this.parserSyncTimes),
            parserSyncMaxMs: max(this.parserSyncTimes),
            intervalAvgMs: avg(this.frameIntervals),
            intervalMaxMs: max(this.frameIntervals),       // longest gap = worst jank
            lastFullSave: this.lastFullSave,
            lastPosSave: this.lastPosSave,
            peakFullSaveMs: this.peakFullSaveMs,
            roomCount: this.roomCount,
            lastRebuild: this.lastRebuild,
            peakRebuild: this.peakRebuild,
            peakRebuildMs: this.peakRebuildMs,
            lastWallMs: this.lastWallMs,
            lastIconMs: this.lastIconMs,
            lastTerrainSplit: this.lastTerrainSplit,
            heapUsedMB: mem ? mem.usedJSHeapSize / 1048576 : null,
            heapLimitMB: mem ? mem.jsHeapSizeLimit / 1048576 : null,
        };
    }
}

export const perfMonitor = new PerfMonitor();

if (typeof window !== 'undefined') {
    (window as any).__PERF__ = perfMonitor;
}
