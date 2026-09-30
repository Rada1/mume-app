/** @file Maps MMapper infomark classes to their label appearance. */
// --- Logic Section ---

import type { FastMapTextLabel } from './model';
import { BLACK, INFOMARK_CLASS_COLORS, textColor, type RGBA } from './vendor/palette';

function colorHex(color: RGBA): number {
  return (Math.round(color[0] * 255) << 16) | (Math.round(color[1] * 255) << 8) | Math.round(color[2] * 255);
}

/** MMapper derives label background, foreground, underline, and italics from class. */
export function infomarkLabelStyle(classIndex: number): Pick<FastMapTextLabel,
  'color' | 'backgroundColor' | 'backgroundAlpha' | 'underline' | 'italic'> {
  const cls = Number.isInteger(classIndex) && classIndex >= 0 && classIndex < INFOMARK_CLASS_COLORS.length
    ? classIndex
    : 0;
  const background = INFOMARK_CLASS_COLORS[cls] ?? BLACK;
  return {
    color: colorHex(textColor(background)),
    backgroundColor: colorHex(background),
    backgroundAlpha: 0.32,
    underline: cls === 9,
    italic: cls === 8,
  };
}
