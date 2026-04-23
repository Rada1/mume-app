/**
 * @file CaptureMiddleware.ts
 * @description Sets flags like isWaitingForInv, isWaitingForEq, and handles 'look in' capture stages.
 */

import { CommandMiddleware } from '../types';

export const CaptureMiddleware: CommandMiddleware = (cmd, context, { silent, isSystem, fromDrawer }) => {
    const {
        isSilentCapture, captureStage, isWaitingForInv, isWaitingForEq,
        isWaitingForStats, setStatsLines, setInfoLines, setScoreLines, isDrawerCapture, setPopoverState, finalizeCapture,
        isWaitingForInfo
    } = context;
    const lowerCmd = cmd.toLowerCase().trim();

    // Safety: If core context is missing, bail out so the command can still be sent
    if (!captureStage) {
        console.warn(`[CaptureMiddleware] Command context is incomplete. Bypassing capture for "${cmd}"`);
        return undefined;
    }

    // Silent Capture Management
    if (silent && isSystem && isSilentCapture) {
        isSilentCapture.current++;
        // Safety timeout moved back to Executor for access to context.finalizeCapture
    }

    // Container Interception
    if (lowerCmd.startsWith('look in ')) {
        if (captureStage) captureStage.current = 'container';
        if (isDrawerCapture) isDrawerCapture.current = 1;
        // Only reset popover if this is NOT a silent (drawer-triggered) look in
        if (!silent && setPopoverState) {
            setPopoverState((prev: any) => prev ? { ...prev, type: 'container', containerItems: [] } : prev);
        }
    }

    if (fromDrawer && isDrawerCapture) {
        isDrawerCapture.current++;
    } else if (!isSystem) {
        // CRITICAL: If the user sends a manual command, we MUST ensure they aren't stuck 
        if (isDrawerCapture) isDrawerCapture.current = 0;
        if (isSilentCapture) isSilentCapture.current = 0;
        if (lowerCmd !== 'who' && lowerCmd !== 'where' && finalizeCapture) {
            finalizeCapture();
        }
    }

    // Capture Flags
    if (lowerCmd === 'who' || lowerCmd === 'where') {
        // No drawer capture for these, we want them in the main log
        if (captureStage) captureStage.current = lowerCmd === 'who' ? 'who' : 'where';
    } else if (lowerCmd === 'inventory' || lowerCmd === 'inv' || lowerCmd === 'i') {
        if (isWaitingForInv) isWaitingForInv.current = true;
        if (captureStage) captureStage.current = 'none';
    } else if (lowerCmd === 'stat' || lowerCmd === 'st' || lowerCmd === 'status' || lowerCmd === 'score' || lowerCmd === 'sc' || lowerCmd === 'at' || lowerCmd.startsWith('info %m')) {
        console.log(`[Middleware] Setting isWaitingForStats! Cmd: "${cmd}" (Matches: stat/score/at/info)`);
        if (isWaitingForStats) isWaitingForStats.current = true;
        if (captureStage) captureStage.current = 'none';
        if (!silent && !isSystem && !fromDrawer && setStatsLines && setScoreLines) {
            setStatsLines([]);
            setScoreLines([]);
        }
    } else if (lowerCmd === 'eq' || lowerCmd === 'equipment') {
        if (isWaitingForEq) isWaitingForEq.current = true;
        if (captureStage) captureStage.current = 'none';
    } else if (lowerCmd === 'info') {
        if (isWaitingForInfo) isWaitingForInfo.current = true;
        if (!silent && !isSystem && !fromDrawer && setInfoLines) {
            setInfoLines([]);
        }
    } else if (lowerCmd === 'practice' || lowerCmd === 'prac') {
        // Practice detection is also handled by useStageInitializer
        if (captureStage) captureStage.current = 'practice';
    }

    return undefined; // No change to command itself
};
