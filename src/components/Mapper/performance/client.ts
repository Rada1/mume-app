/**
 * @file Main-thread worker lifecycle and low-volume map message client.
 */
// --- Logic Section ---

import type { AdaptedFastMap } from './mapAdapter';
import type { FastMapFrame, FastMapGameEvent, FastMapSearchOverlay, FastMapWorkerEvent, MainToFastMapWorker } from './protocol';
import type { FastMapGroupMember, FastMapTextLabel } from './model';
import { UpdateCoalescer } from './updateCoalescer';

export interface WorkerMapSupport {
  worker: boolean;
  offscreenCanvas: boolean;
  webgl2: boolean;
  transfer: boolean;
}

export function supportsWorkerMap(support: WorkerMapSupport): boolean {
  return support.worker && support.offscreenCanvas && support.webgl2 && support.transfer;
}

export function browserWorkerMapSupport(canvas: HTMLCanvasElement): WorkerMapSupport {
  return {
    worker: typeof Worker !== 'undefined',
    offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    webgl2: typeof WebGL2RenderingContext !== 'undefined',
    transfer: typeof canvas.transferControlToOffscreen === 'function',
  };
}

export class FastMapWorkerClient {
  private worker: Worker;
  private ready = false;
  private failed = false;
  private pendingMap: AdaptedFastMap | null = null;
  private pendingLabels: FastMapTextLabel[] = [];
  private pendingSearchOverlay: FastMapSearchOverlay | null = null;
  private pendingDoorStates = new Uint32Array();
  private pendingExploration: { roomIds: string[]; revealAll: boolean } | null = null;
  private hasSentMap = false;
  private readonly updates: UpdateCoalescer<FastMapFrame>;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly onEvent: (event: FastMapWorkerEvent) => void,
    private readonly onFailure: (reason: string) => void,
    transparentBackground = false,
  ) {
    const support = browserWorkerMapSupport(canvas);
    if (!supportsWorkerMap(support)) throw new Error('Worker-owned WebGL2 is unavailable in this browser.');
    this.worker = new Worker(new URL('./worker/fastMap.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = event => this.handleEvent(event.data as FastMapWorkerEvent);
    this.worker.onerror = event => {
      event.preventDefault();
      this.fail(event.message || 'Performance map worker failed.');
    };
    this.worker.onmessageerror = () => this.fail('Performance map worker sent an unreadable message.');
    this.updates = new UpdateCoalescer(frame => this.post({ type: 'frame', frame }));
    const width = Math.max(1, canvas.width);
    const height = Math.max(1, canvas.height);
    const dpr = Math.max(1, canvas.width / Math.max(1, canvas.clientWidth));
    try {
      const offscreen = canvas.transferControlToOffscreen();
      this.worker.postMessage({ type: 'init', canvas: offscreen, width, height, dpr, metrics: false, transparentBackground } satisfies MainToFastMapWorker, [offscreen]);
    } catch (error) {
      this.worker.terminate();
      throw error;
    }
  }

  loadMap(adapted: AdaptedFastMap): void {
    this.pendingDoorStates = new Uint32Array();
    if (!this.ready) {
      this.pendingMap = adapted;
      return;
    }
    this.sendMap(adapted);
  }

  setLabels(labels: FastMapTextLabel[]): void {
    this.pendingLabels = labels;
    if (this.ready && this.hasSentMap) this.post({ type: 'labels', labels });
  }

  setGroupMembers(members: FastMapGroupMember[]): void {
    this.post({ type: 'group-members', members });
  }

  setSearchOverlay(overlay: FastMapSearchOverlay): void {
    this.pendingSearchOverlay = overlay;
    if (this.ready && this.hasSentMap) this.post({ type: 'search-overlay', overlay });
  }

  setDoorStates(states: Uint32Array): void {
    if (states.length === 0) return;
    if (!this.ready || !this.hasSentMap) {
      const pending = new Uint32Array(this.pendingDoorStates.length + states.length);
      pending.set(this.pendingDoorStates);
      pending.set(states, this.pendingDoorStates.length);
      this.pendingDoorStates = pending;
      return;
    }
    this.post({ type: 'door-states', states }, [states.buffer]);
  }

  setExploredRooms(roomIds: string[], revealAll: boolean): void {
    this.pendingExploration = { roomIds, revealAll };
    this.post({ type: 'explored-rooms', roomIds, revealAll });
  }

  visitRoom(roomId: string): void {
    this.post({ type: 'visit-room', roomId });
  }

  resize(width: number, height: number, dpr: number): void {
    this.post({ type: 'resize', width, height, dpr });
  }

  update(frame: FastMapFrame): void {
    this.updates.push(frame);
  }

  sendGameEvent(event: FastMapGameEvent): void {
    this.post({ type: 'game-event', event });
  }

  syncRoom(roomId: string | null): void {
    this.post({ type: 'sync-room', roomId });
  }

  setMetricsEnabled(enabled: boolean): void {
    this.post({ type: 'metrics', enabled });
  }

  dispose(): void {
    this.updates.dispose();
    this.worker.terminate();
  }

  private handleEvent(event: FastMapWorkerEvent): void {
    if (event.type === 'ready') {
      this.ready = true;
      if (this.pendingMap) {
        this.sendMap(this.pendingMap);
        this.pendingMap = null;
      }
    }
    if (event.type === 'error') this.fail(`${event.stage}: ${event.message}${event.stack ? `\n${event.stack}` : ''}`);
    this.onEvent(event);
  }

  private sendMap(adapted: AdaptedFastMap): void {
    const { map, transferables } = adapted;
    this.worker.postMessage({ type: 'load-map', map } satisfies MainToFastMapWorker, transferables);
    this.hasSentMap = true;
    if (this.pendingLabels.length) this.post({ type: 'labels', labels: this.pendingLabels });
    if (this.pendingSearchOverlay) this.post({ type: 'search-overlay', overlay: this.pendingSearchOverlay });
    if (this.pendingExploration) this.post({ type: 'explored-rooms', ...this.pendingExploration });
    if (this.pendingDoorStates.length) {
      const states = this.pendingDoorStates;
      this.pendingDoorStates = new Uint32Array();
      this.setDoorStates(states);
    }
  }

  private post(message: MainToFastMapWorker, transfer: Transferable[] = []): void {
    if (!this.failed) this.worker.postMessage(message, transfer);
  }

  private fail(reason: string): void {
    if (this.failed) return;
    this.failed = true;
    this.dispose();
    this.onFailure(reason);
  }
}
