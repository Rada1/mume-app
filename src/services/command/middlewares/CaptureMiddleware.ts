/**
 * @file CaptureMiddleware.ts
 * @description Header-driven middleware for the Reactive Capture Machine.
 * Sets pending flags and handles specialized command state transitions.
 */

import { CommandMiddleware } from '../types';

const COMMAND_CAPTURE_TYPES: Record<string, import('../../../types/capture').CaptureType> = {
    eq: 'equipment',
    equipment: 'equipment',
    inv: 'inventory',
    inventory: 'inventory',
    stat: 'stats',
    stats: 'stats',
    status: 'stats',
    st: 'stats',
    score: 'score',
    sc: 'score',
    info: 'info',
    practice: 'practice',
    quest: 'quests',
    quests: 'quests',
    who: 'who',
    where: 'where',
    achievement: 'achievement',
    achievements: 'achievement'
};

export const CaptureMiddleware: CommandMiddleware = (cmd, context, { silent, isSystem, fromDrawer }) => {
    const {
        captureStage, setStatsLines, setInfoLines, setAchievementLines, setScoreLines, finalizeCapture,
        setPendingFlags
    } = context;
    const lowerCmd = cmd.toLowerCase().trim();

    // 1. Reactive Capture Machine - Pending Flags
    // This tells the parser that the NEXT output matching a trigger should be captured
    // using the specified silence and UI-origin flags.
    if (setPendingFlags) {
        setPendingFlags(silent, fromDrawer, cmd);
    }

    if (captureStage) {
        const baseCommand = lowerCmd.split(/\s+/)[0];
        let captureType = COMMAND_CAPTURE_TYPES[baseCommand];
        if (!captureType && (lowerCmd.startsWith('look in ') || lowerCmd.startsWith('look inside '))) {
            captureType = 'container';
        }
        if (captureType) captureStage.current = captureType;
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
        } else if (lowerCmd === 'achievement' || lowerCmd === 'achievements') {
            if (setAchievementLines) setAchievementLines([]);
        }
    }

    return undefined; // No change to command itself
};
