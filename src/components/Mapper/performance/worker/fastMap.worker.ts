/**
 * @file Module worker entry point for Performance Mode's WebGL2 mapper.
 */
// --- Logic Section ---

import type { FastMapWorkerEvent, MainToFastMapWorker } from '../protocol';
import { FastMapCore } from './FastMapCore';

interface WorkerScope {
  postMessage(event: FastMapWorkerEvent): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<MainToFastMapWorker>) => void): void;
}

const scope = self as unknown as WorkerScope;
let core: FastMapCore | null = null;

scope.addEventListener('message', event => {
  if (event.data.type === 'init') {
    // Main-thread updates are already coalesced to one display frame; render
    // immediately on receipt to avoid another worker-frame scheduling delay.
    core = new FastMapCore({ post: message => scope.postMessage(message), requestFrame: callback => callback() });
    void core.initialize(event.data);
    return;
  }
  core?.handle(event.data);
});
