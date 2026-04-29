/**
 * @file CaptureMiddleware.ts
 * @description Header-driven middleware for the Reactive Capture Machine.
 * Sets pending flags and handles specialized command state transitions.
 */

import { CommandMiddleware } from '../types';

export const CaptureMiddleware: CommandMiddleware = (cmd, context, { silent, isSystem, fromDrawer }) => {
    const {
        captureStage, setStatsLines, setInfoLines, setScoreLines, finalizeCapture,
        setPendingFlags
    } = context;
    const lowerCmd = cmd.toLowerCase().trim();

    // 1. Reactive Capture Machine - Pending Flags
    // This tells the parser that the NEXT output matching a trigger should be captured
    // using the specified silence and UI-origin flags.
    if (setPendingFlags) {
        setPendingFlags(silent, fromDrawer);
    }

    if (captureStage) {
        if (lowerCmd === 'where') captureStage.current = 'where';
        else if (lowerCmd === 'who') captureStage.current = 'who';
    }

    if (!isSystem && !fromDrawer) {
        // Manual command cleanup: ensure we aren't "stuck" in a silent background capture 
        // if the user manually triggers a known list command.
        if (finalizeCapture && !['who', 'where'].includes(lowerCmd)) {
            finalizeCapture();
        }
        
        // Manual state clearing for fresh updates
        if (['stat', 'st', 'status', 'score', 'sc', 'at'].includes(lowerCmd)) {
            if (setStatsLines) setStatsLines([]);
            if (setScoreLines) setScoreLines([]);
        } else if (lowerCmd === 'info') {
            if (setInfoLines) setInfoLines([]);
        }
    }

    return undefined; // No change to command itself
};
