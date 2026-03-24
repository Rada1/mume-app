/**
 * @file CaptureMiddleware.ts
 * @description Sets flags like isWaitingForInv, isWaitingForEq, and handles 'look in' capture stages.
 */

import { CommandMiddleware } from '../types';

export const CaptureMiddleware: CommandMiddleware = (cmd, context, { silent, isSystem, fromDrawer }) => {
    const { 
        isSilentCapture, captureStage, isWaitingForInv, isWaitingForEq, 
        isWaitingForStats, setStatsLines, isDrawerCapture, setPopoverState, finalizeCapture 
    } = context;
    const lowerCmd = cmd.toLowerCase().trim();

    // Silent Capture Management
    if (silent && isSystem) {
        isSilentCapture.current++;
        // Safety timeout moved back to Executor for access to context.finalizeCapture
    }

    // Container Interception
    if (lowerCmd.startsWith('look in ')) {
        captureStage.current = 'container';
        isDrawerCapture.current = 1;
        // Only reset popover if this is NOT a silent (drawer-triggered) look in
        if (!silent) {
            setPopoverState((prev: any) => prev ? { ...prev, type: 'container', containerItems: [] } : prev);
        }
    }

    if (fromDrawer) {
        isDrawerCapture.current++;
    } else if (!isSystem) {
        // CRITICAL: If the user sends a manual command, we MUST ensure they aren't stuck 
        isDrawerCapture.current = 0;
        isSilentCapture.current = 0;
        if (lowerCmd !== 'who' && lowerCmd !== 'where') {
            finalizeCapture();
        }
    }

    // Capture Flags
    if (lowerCmd === 'inventory' || lowerCmd === 'inv' || lowerCmd === 'i') {
        isWaitingForInv.current = true;
        captureStage.current = 'none';
    } else if (lowerCmd === 'stat' || lowerCmd === 'st' || lowerCmd === 'status' || lowerCmd === 'score' || lowerCmd === 'sc' || lowerCmd === 'at') {
        isWaitingForStats.current = true;
        captureStage.current = 'none';
        setStatsLines([]);
    } else if (lowerCmd === 'eq' || lowerCmd === 'equipment') {
        isWaitingForEq.current = true;
        captureStage.current = 'none';
    } else if (lowerCmd === 'practice' || lowerCmd === 'prac') {
        captureStage.current = 'practice';
    }

    return undefined; // No change to command itself
};
