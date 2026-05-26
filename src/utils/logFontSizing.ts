/**
 * @file logFontSizing.ts
 * @description Shared math for fitting the message log font to the viewport.
 */

// --- Constants ---

export const MOBILE_PORTRAIT_AUTO_FONT_BIAS_PX = 0.5;

const MAX_LOG_FONT_SIZE_PX = 48;
const MOBILE_PORTRAIT_MIN_LOG_FONT_SIZE_PX = 6;
const MIN_LOG_FONT_SIZE_PX = 10;

// --- Helpers ---

export const getMinimumLogFontSize = (isMobile: boolean, isLandscape: boolean) =>
    isMobile && !isLandscape ? MOBILE_PORTRAIT_MIN_LOG_FONT_SIZE_PX : MIN_LOG_FONT_SIZE_PX;

export const getMobilePortraitFontBias = (isMobile: boolean, isLandscape: boolean) =>
    isMobile && !isLandscape ? MOBILE_PORTRAIT_AUTO_FONT_BIAS_PX : 0;

export const clampLogFontSize = (fontSizePx: number, minSizePx: number) =>
    Math.min(MAX_LOG_FONT_SIZE_PX, Math.max(minSizePx, fontSizePx));
