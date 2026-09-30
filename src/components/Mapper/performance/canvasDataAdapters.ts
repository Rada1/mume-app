/** @file Small adapters for mapper canvas data crossing into the fast worker. */
// --- Logic Section ---

import type { FastMapTextLabel } from './model';
import type { FastRoomExit } from './model';
import { infomarkLabelStyle } from './infomarkStyle';

export function tupleStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

export function preferLiveFlags(live: readonly string[] | undefined, bundled: unknown): string[] {
  return live && live.length ? [...live] : tupleStrings(bundled);
}

export function mergeRoomExits(live: unknown, bundled: unknown): Record<string, FastRoomExit> {
  const liveExits = exitRecord(live);
  const bundledExits = exitRecord(bundled);
  const merged: Record<string, FastRoomExit> = { ...bundledExits, ...liveExits };
  for (const [short, long] of [['n', 'north'], ['s', 'south'], ['e', 'east'], ['w', 'west'], ['u', 'up'], ['d', 'down'], ['unknown', 'out']] as const) {
    const liveExit = liveExits[short] ?? liveExits[long];
    if (liveExit !== undefined) merged[short] = liveExit;
  }
  return merged;
}

function exitRecord(value: unknown): Record<string, FastRoomExit> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, FastRoomExit>
    : {};
}

function labelEntries(source: unknown): unknown[] {
  if (Array.isArray(source)) return source;
  if (source !== null && typeof source === 'object') return Object.values(source);
  return [];
}

function cssHexColor(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? Number.parseInt(match[1]!, 16) : undefined;
}

export function labelsFrom(
  source: unknown,
  options: { fontSizeScale?: number; markerStyle?: boolean; excludeIdPrefix?: string } = {},
): FastMapTextLabel[] {
  const labels: FastMapTextLabel[] = [];
  for (const item of labelEntries(source)) {
    if (item === null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id === 'string' && options.excludeIdPrefix && record.id.startsWith(options.excludeIdPrefix)) continue;
    const x = typeof record.x === 'number' ? record.x : NaN;
    const y = typeof record.y === 'number' ? record.y : NaN;
    const z = typeof record.z === 'number' ? record.z : 0;
    const text = typeof record.text === 'string' ? record.text : '';
    if (!Number.isFinite(x) || !Number.isFinite(y) || !text.trim()) continue;
    const fontSize = typeof record.fontSize === 'number' ? record.fontSize : 11;
    const markerStyle = options.markerStyle === true;
    const markerClass = typeof record.infomarkClass === 'number' ? record.infomarkClass : 0;
    const markerAppearance = markerStyle ? infomarkLabelStyle(markerClass) : undefined;
    labels.push({
      x,
      y: -y,
      z,
      text,
      anchor: markerStyle ? 'mmapper' : 'center',
      rotation: typeof record.infomarkAngle === 'number' ? record.infomarkAngle : 0,
      fontSize: fontSize * (options.fontSizeScale ?? 1),
      color: markerAppearance?.color ?? (markerStyle ? 0xffffff : cssHexColor(record.color)),
      backgroundColor: markerAppearance?.backgroundColor,
      backgroundAlpha: markerAppearance?.backgroundAlpha,
      underline: markerAppearance?.underline,
      italic: markerAppearance?.italic,
    });
  }
  return labels;
}
