/** @file viewport.ts — Responsive terminal layout inputs. */
// --- Layout Types ---
export interface TerminalLayoutOptions {
    isMobile: boolean;
    isLandscape: boolean;
    logFontSize: number;
    windowWidth: number;
    fontFamily: string;
    isTimestampEnabled: boolean;
    isNewbieMode: boolean;
}
