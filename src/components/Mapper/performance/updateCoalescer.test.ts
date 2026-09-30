/**
 * @file Unit tests for main-thread update batching and worker capability checks.
 */
// --- Logic Section ---

import { describe, expect, it, vi } from 'vitest';
import { supportsWorkerMap } from './client';
import { UpdateCoalescer } from './updateCoalescer';

describe('UpdateCoalescer', () => {
  it('sends only the newest camera state in each animation frame', () => {
    const callbacks: Array<() => void> = [];
    const send = vi.fn<(value: number) => void>();
    const queue = new UpdateCoalescer(send, callback => {
      callbacks.push(callback);
      return callbacks.length;
    }, () => {});

    queue.push(1);
    queue.push(2);
    queue.push(3);
    expect(callbacks).toHaveLength(1);
    callbacks[0]!();
    expect(send).toHaveBeenCalledExactlyOnceWith(3);
  });

  it('cancels pending updates during worker teardown', () => {
    const cancel = vi.fn<(handle: number) => void>();
    const send = vi.fn<(value: string) => void>();
    const queue = new UpdateCoalescer(send, () => 42, cancel);
    queue.push('pending');
    queue.dispose();
    expect(cancel).toHaveBeenCalledWith(42);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('supportsWorkerMap', () => {
  const supported = { worker: true, offscreenCanvas: true, webgl2: true, transfer: true };

  it('allows worker rendering only when the full surface is available', () => {
    expect(supportsWorkerMap(supported)).toBe(true);
    expect(supportsWorkerMap({ ...supported, webgl2: false })).toBe(false);
    expect(supportsWorkerMap({ ...supported, transfer: false })).toBe(false);
  });
});
