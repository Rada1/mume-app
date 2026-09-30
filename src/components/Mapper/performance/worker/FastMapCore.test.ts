/**
 * @file Worker core tests for map-load lifecycle, update coalescing, and init fallback.
 */
// --- Logic Section ---

import { describe, expect, it, vi } from 'vitest';
import type { FastMapData, FastMapGroupMember, FastMapTextLabel } from '../model';
import type { FastMapFrame, FastMapWorkerEvent, MainToFastMapWorker } from '../protocol';
import { DEFAULT_MAP_BACKGROUND } from '../mapBackground';
import { FastMapCore, type FastMapRendererApi } from './FastMapCore';

const testMap = (): FastMapData => ({
  roomCount: 0,
  roomIds: [],
  serverIds: [],
  names: [],
  descriptions: [],
  x: new Int32Array(),
  y: new Int32Array(),
  z: new Int32Array(),
  terrain: new Uint8Array(),
  exitFlags: new Uint16Array(),
  exitTargetStarts: new Uint32Array(1),
  exitTargets: new Uint32Array(),
});

const frame = (x: number): FastMapFrame => ({
  view: { x, y: 0, zoom: 1, layer: 0 },
  player: null,
  liveRoom: null,
  prediction: null,
  background: DEFAULT_MAP_BACKGROUND,
});

function fakeRenderer(overrides: Partial<FastMapRendererApi> = {}): FastMapRendererApi & { maps: FastMapData[]; labels: FastMapTextLabel[][]; groups: FastMapGroupMember[][]; frames: FastMapFrame[]; disposed: boolean } {
  const renderer = {
    buildMs: 4,
    mapRoomCount: 0,
    maps: [] as FastMapData[],
    labels: [] as FastMapTextLabel[][],
    groups: [] as FastMapGroupMember[][],
    frames: [] as FastMapFrame[],
    disposed: false,
    async initialize() {},
    setMap(map: FastMapData) { this.maps.push(map); },
    setLabels(labels: FastMapTextLabel[]) { this.labels.push(labels); },
    setGroupMembers(members: FastMapGroupMember[]) { this.groups.push(members); },
    resize() {},
    render(value: FastMapFrame) { this.frames.push(value); },
    dispose() { this.disposed = true; },
    ...overrides,
  };
  return renderer;
}

function initMessage(): Extract<MainToFastMapWorker, { type: 'init' }> {
  return { type: 'init', canvas: { width: 1, height: 1 } as OffscreenCanvas, width: 1, height: 1, dpr: 1, metrics: false, transparentBackground: false };
}

describe('FastMapCore lifecycle', () => {
  it('builds a static map once and renders the newest coalesced frame', async () => {
    const events: FastMapWorkerEvent[] = [];
    const callbacks: Array<() => void> = [];
    const renderer = fakeRenderer();
    const core = new FastMapCore({ post: event => events.push(event), requestFrame: callback => callbacks.push(callback) }, () => renderer);
    await core.initialize(initMessage());
    core.handle({ type: 'load-map', map: testMap() });
    core.handle({ type: 'labels', labels: [{ x: 1, y: 2, z: 0, text: 'bridge' }] });
    core.handle({ type: 'frame', frame: frame(1) });
    core.handle({ type: 'frame', frame: frame(2) });

    expect(events).toContainEqual({ type: 'ready' });
    expect(renderer.maps).toHaveLength(1);
    expect(renderer.labels[0]?.[0]?.text).toBe('bridge');
    expect(callbacks).toHaveLength(1);
    callbacks[0]!();
    expect(renderer.frames).toHaveLength(1);
    expect(renderer.frames[0]?.view.x).toBe(2);

    core.dispose();
    expect(renderer.disposed).toBe(true);
  });

  it('reports initialization failures so the canvas can fall back', async () => {
    const events: FastMapWorkerEvent[] = [];
    const renderer = fakeRenderer({ initialize: async () => { throw new Error('no WebGL2'); } });
    const core = new FastMapCore({ post: event => events.push(event), requestFrame: () => {} }, () => renderer);
    await core.initialize(initMessage());
    expect(events).toContainEqual({ type: 'error', stage: 'init', message: 'no WebGL2' });
    expect(events.some(event => event.type === 'ready')).toBe(false);
  });

  it('sends group location updates to the worker renderer without reloading the map', async () => {
    const renderer = fakeRenderer();
    const core = new FastMapCore({ post: () => {}, requestFrame: () => {} }, () => renderer);
    await core.initialize(initMessage());
    core.handle({ type: 'group-members', members: [{ id: '2', name: 'Arwen', x: 4, y: -3, z: 0, color: 0xbbf7d0 }] });
    expect(renderer.groups[0]).toEqual([{ id: '2', name: 'Arwen', x: 4, y: -3, z: 0, color: 0xbbf7d0 }]);
    expect(renderer.maps).toHaveLength(0);
    core.dispose();
  });
});
