/**
 * @file Temporarily restores original room-flag brightness when a room is discovered.
 */
// --- Logic Section ---

import type { GpuLayer } from './rendererBuffers';
import { setRoomFlagRenderState } from './roomExplorationRendering';

const FLASH_STATE = 3;
const FLASH_DURATION_MS = 1000;

export class RoomFlagFlash {
  private readonly expiresAt = new Map<number, number>();

  get isActive(): boolean {
    return this.expiresAt.size > 0;
  }

  start(gl: WebGL2RenderingContext, layer: GpuLayer, room: number): void {
    if (setRoomFlagRenderState(gl, layer, room, FLASH_STATE)) {
      this.expiresAt.set(room, performance.now() + FLASH_DURATION_MS);
    }
  }

  update(gl: WebGL2RenderingContext, layers: ReadonlyMap<number, GpuLayer>, getState: (room: number) => number): void {
    const now = performance.now();
    for (const [room, expires] of this.expiresAt) {
      if (now < expires) continue;
      const layer = layers.get(room);
      if (layer) setRoomFlagRenderState(gl, layer, room, getState(room));
      this.expiresAt.delete(room);
    }
  }

  clear(): void {
    this.expiresAt.clear();
  }
}
