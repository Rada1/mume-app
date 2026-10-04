/**
 * @file Worker-side lifecycle, coalescing, and telemetry for the fast map.
 */
// --- Logic Section ---

import { FastMapRenderer } from '../FastMapRenderer';
import type { FastMapFrame, FastMapSearchOverlay, FastMapWorkerEvent, FastMapWorkerMetrics, MainToFastMapWorker } from '../protocol';
import type { FastMapData, FastMapGroupMember, FastMapTextLabel } from '../model';

export interface FastMapRendererApi {
  readonly buildMs: number;
  readonly mapRoomCount: number;
  initialize(): Promise<void>;
  setMap(map: FastMapData): void;
  setLabels?(labels: FastMapTextLabel[]): void;
  setGroupMembers?(members: FastMapGroupMember[]): void;
  setSearchOverlay?(overlay: FastMapSearchOverlay): void;
  readonly needsAnimation?: boolean;
  setDoorStates?(states: Uint32Array): void;
  setExploredRooms?(roomIds: readonly string[], revealAll: boolean): void;
  visitRoom?(roomId: string): void;
  resize(width: number, height: number, dpr: number): void;
  render(frame: FastMapFrame): void;
  dispose(): void;
}

export type FastMapRendererFactory = (canvas: OffscreenCanvas, transparentBackground: boolean) => FastMapRendererApi;

export interface FastMapWorkerHost {
  post(event: FastMapWorkerEvent): void;
  requestFrame(callback: () => void): void;
}

export class FastMapCore {
  private renderer: FastMapRendererApi | null = null;
  private latestFrame: FastMapFrame | null = null;
  private scheduled = false;
  private animationTimer: ReturnType<typeof setTimeout> | null = null;
  private metricsEnabled = false;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private renderedFrames = 0;
  private updates = 0;
  private coalescedUpdates = 0;
  private renderSamples: number[] = [];
  private renderIntervals: number[] = [];
  private lastRenderedAt = 0;
  private sampleStart = performance.now();
  private mapLoads = 0;
  private staticBuildMs = 0;
  private exploredRoomIds = new Set<string>();
  private revealAllRooms = false;

  constructor(
    private readonly host: FastMapWorkerHost,
    private readonly rendererFactory: FastMapRendererFactory = (canvas, transparentBackground) => new FastMapRenderer(canvas, transparentBackground),
  ) {}

  async initialize(message: Extract<MainToFastMapWorker, { type: 'init' }>): Promise<void> {
    try {
      this.renderer = this.rendererFactory(message.canvas, message.transparentBackground);
      this.renderer.resize(message.width, message.height, message.dpr);
      this.metricsEnabled = message.metrics;
      await this.renderer.initialize();
      this.host.post({ type: 'ready' });
      this.requestRender();
      if (this.metricsEnabled) this.startMetrics();
    } catch (error) {
      this.host.post({
        type: 'error',
        stage: 'init',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  handle(message: Exclude<MainToFastMapWorker, { type: 'init' }>): void {
    try {
      switch (message.type) {
        case 'load-map':
          if (!this.renderer) return;
          this.renderer.setMap(message.map);
          this.renderer.setExploredRooms?.([...this.exploredRoomIds], this.revealAllRooms);
          this.mapLoads++;
          this.staticBuildMs = this.renderer.buildMs;
          this.host.post({ type: 'map-loaded', roomCount: this.renderer.mapRoomCount, staticBuildMs: this.staticBuildMs, mapLoads: this.mapLoads });
          this.requestRender();
          return;
        case 'labels':
          this.renderer?.setLabels?.(message.labels);
          this.requestRender();
          return;
        case 'group-members':
          this.renderer?.setGroupMembers?.(message.members);
          this.requestRender();
          return;
        case 'search-overlay':
          this.renderer?.setSearchOverlay?.(message.overlay);
          this.requestRender();
          return;
        case 'door-states':
          this.renderer?.setDoorStates?.(message.states);
          this.requestRender();
          return;
        case 'explored-rooms':
          this.exploredRoomIds = new Set(message.roomIds);
          this.revealAllRooms = message.revealAll;
          this.renderer?.setExploredRooms?.(message.roomIds, message.revealAll);
          this.requestRender();
          return;
        case 'visit-room':
          this.exploredRoomIds.add(message.roomId);
          this.renderer?.visitRoom?.(message.roomId);
          this.requestRender();
          return;
        case 'resize':
          this.renderer?.resize(message.width, message.height, message.dpr);
          this.requestRender();
          return;
        case 'frame':
          this.latestFrame = message.frame;
          if (this.metricsEnabled) this.updates++;
          this.requestRender();
          return;
        case 'metrics':
          this.metricsEnabled = message.enabled;
          if (this.metricsEnabled) this.startMetrics();
          else this.stopMetrics();
      }
    } catch (error) {
      this.host.post({
        type: 'error',
        stage: 'map',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  dispose(): void {
    this.stopMetrics();
    if (this.animationTimer !== null) clearTimeout(this.animationTimer);
    this.animationTimer = null;
    this.renderer?.dispose();
    this.renderer = null;
  }

  private requestRender(): void {
    if (!this.renderer || !this.latestFrame) return;
    if (this.scheduled) {
      this.coalescedUpdates++;
      return;
    }
    this.scheduled = true;
    this.host.requestFrame(() => {
      this.scheduled = false;
      const frame = this.latestFrame;
      if (!frame || !this.renderer) return;
      const start = performance.now();
      try {
        this.renderer.render(frame);
        if (this.renderer.needsAnimation) this.scheduleAnimationFrame();
        if (this.metricsEnabled) {
          if (this.lastRenderedAt > 0) this.renderIntervals.push(start - this.lastRenderedAt);
          this.lastRenderedAt = start;
          this.renderedFrames++;
          this.renderSamples.push(performance.now() - start);
        }
      } catch (error) {
        this.host.post({ type: 'error', stage: 'render', message: error instanceof Error ? error.message : String(error) });
      }
    });
  }

  private scheduleAnimationFrame(): void {
    if (this.animationTimer !== null) return;
    this.animationTimer = setTimeout(() => {
      this.animationTimer = null;
      if (this.renderer?.needsAnimation) this.requestRender();
    }, 16);
  }

  private startMetrics(): void {
    if (this.metricsTimer !== null) return;
    this.sampleStart = performance.now();
    this.renderedFrames = 0;
    this.updates = 0;
    this.coalescedUpdates = 0;
    this.renderSamples = [];
    this.renderIntervals = [];
    this.lastRenderedAt = 0;
    this.metricsTimer = setInterval(() => this.postMetrics(), 1000);
  }

  private stopMetrics(): void {
    if (this.metricsTimer !== null) clearInterval(this.metricsTimer);
    this.metricsTimer = null;
    this.renderSamples = [];
    this.renderIntervals = [];
    this.lastRenderedAt = 0;
    this.renderedFrames = 0;
    this.updates = 0;
    this.coalescedUpdates = 0;
  }

  private postMetrics(): void {
    const now = performance.now();
    const elapsed = Math.max(1, now - this.sampleStart);
    const sorted = [...this.renderSamples].sort((a, b) => a - b);
    const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    const intervals = [...this.renderIntervals].sort((a, b) => a - b);
    const intervalP95Index = Math.min(intervals.length - 1, Math.floor(intervals.length * 0.95));
    const stats: FastMapWorkerMetrics = {
      fps: Math.round(this.renderedFrames * 1000 / elapsed),
      frameIntervalP95Ms: intervals.length ? intervals[intervalP95Index]! : 0,
      frameIntervalMaxMs: intervals.length ? intervals[intervals.length - 1]! : 0,
      renderP95Ms: sorted.length ? sorted[p95Index]! : 0,
      renderMaxMs: sorted.length ? sorted[sorted.length - 1]! : 0,
      staticBuildMs: this.staticBuildMs,
      mapLoads: this.mapLoads,
      updates: this.updates,
      coalescedUpdates: this.coalescedUpdates,
      roomCount: this.renderer?.mapRoomCount ?? 0,
    };
    this.host.post({ type: 'metrics', stats });
    this.renderSamples = [];
    this.renderIntervals = [];
    this.renderedFrames = 0;
    this.updates = 0;
    this.coalescedUpdates = 0;
    this.sampleStart = now;
  }
}
