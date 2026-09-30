/** @file Reads the opaque terminal backdrop color for the worker map canvas. */
// --- Logic Section ---

export type FastMapBackground = readonly [number, number, number];

export const DEFAULT_MAP_BACKGROUND: FastMapBackground = [26 / 255, 20 / 255, 16 / 255];

function parseColor(value: string): { color: FastMapBackground; alpha: number } | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex) {
    const packed = Number.parseInt(hex[1]!, 16);
    return { color: [((packed >> 16) & 255) / 255, ((packed >> 8) & 255) / 255, (packed & 255) / 255], alpha: 1 };
  }
  const rgb = /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/i.exec(value.trim());
  if (!rgb) return null;
  return {
    color: [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255],
    alpha: rgb[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(rgb[4]))),
  };
}

function composite(foreground: FastMapBackground, alpha: number, background: FastMapBackground): FastMapBackground {
  return [
    foreground[0] * alpha + background[0] * (1 - alpha),
    foreground[1] * alpha + background[1] * (1 - alpha),
    foreground[2] * alpha + background[2] * (1 - alpha),
  ];
}

export function readMapBackground(canvas: HTMLCanvasElement): FastMapBackground {
  const appBackground = parseColor(getComputedStyle(canvas).getPropertyValue('--bg-app'))?.color ?? DEFAULT_MAP_BACKGROUND;
  const logBackdrop = document.querySelector<HTMLElement>('.log-opaque-backdrop');
  if (!logBackdrop) return appBackground;
  const logColor = parseColor(getComputedStyle(logBackdrop).backgroundColor);
  return logColor ? composite(logColor.color, logColor.alpha, appBackground) : appBackground;
}
