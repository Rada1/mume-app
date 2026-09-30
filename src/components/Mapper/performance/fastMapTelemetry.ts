/**
 * @file Latest worker map measurements consumed by the optional performance HUD.
 */
// --- Logic Section ---

import type { FastMapWorkerMetrics } from './protocol';

let latest: FastMapWorkerMetrics | null = null;

export function setFastMapMetrics(metrics: FastMapWorkerMetrics): void {
  latest = metrics;
}

export function clearFastMapMetrics(): void {
  latest = null;
}

export function getFastMapMetrics(): FastMapWorkerMetrics | null {
  return latest;
}
