/**
 * @file CaptureMiddleware.ts
 * @description Header-driven middleware for the Reactive Capture Machine.
 * Sets pending flags and handles specialized command state transitions.
 */

import { CommandMiddleware } from '../types';
import { useArchiveStore } from '../../../stores/useArchiveStore';

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

        if (baseCommand === '/num') {
            const arg = lowerCmd.split(/\s+/)[1];
            if (arg === 'm' || arg === 'mobile') {
                captureType = 'shaper_mob_find';
            } else if (arg === 'o' || arg === 'object') {
                captureType = 'shaper_obj_find';
            }
        } else if (baseCommand === '/stat') {
            const arg = lowerCmd.split(/\s+/)[1];
            if (arg === 'm' || arg === 'mobile') {
                captureType = 'shaper_mob_stat';
            } else if (arg === 'o' || arg === 'object') {
                captureType = 'shaper_obj_stat';
            }
        } else if (baseCommand === '/info') {
            const arg = lowerCmd.split(/\s+/)[1];
            if (arg === 'm' || arg === 'mobile') {
                captureType = 'shaper_mob_info';
            } else if (arg === 'o' || arg === 'object') {
                captureType = 'shaper_obj_info';
            }
        }
        if (!captureType && /^\/misc\s+build\s+\d+\s+list\b/i.test(lowerCmd)) {
            captureType = 'shaper_live_build_list';
        } else if (!captureType && /^\/at\s+\S+\s+\/stat\s+room(?:\s+full)?\b/i.test(lowerCmd)) {
            captureType = 'shaper_live_room_stat';
        } else if (!captureType && (/^\/com\s+room\s+\S+\s+list\b/i.test(lowerCmd) || /^\/at\s+\S+\s+\/com\s+list\b/i.test(lowerCmd))) {
            captureType = 'shaper_live_com_list';
        } else if (!captureType && (
            /^\/at\s+\S+\s+\/lib\s+list(?:\s+-com(?:mands)?)?\b/i.test(lowerCmd) ||
            /^\/lib\s+room\s+\S+\s+list(?:\s+-com(?:mands)?)?\b/i.test(lowerCmd)
        )) {
            captureType = 'shaper_live_lib_list';
        }

        if (!captureType && (lowerCmd.startsWith('look in ') || lowerCmd.startsWith('look inside '))) {
            captureType = 'container';
        }
        const words = lowerCmd.split(/\s+/);
        const firstWord = words[0];
        const lastWord = words[words.length - 1];

        const isLook = firstWord === 'look' || firstWord === 'l';
        const isTail = firstWord === 'tail';
        const isBoardNoun = lastWord === 'board' || lastWord === 'b' || lastWord === 'bulletin';

        // Match "look ... board", "look ... b", "look ... bulletin", "tail ...", "tail"
        const isBoardListCommand = 
            (isLook && isBoardNoun) ||
            lowerCmd === 'look threads' ||
            lowerCmd === 'look all threads' ||
            /^look\s+thread\s+\d+$/i.test(lowerCmd) ||
            (isTail && useArchiveStore.getState().activeView === 'board') ||
            (lowerCmd.startsWith('look at ') && isBoardNoun) ||
            (lowerCmd.startsWith('look all ') && isBoardNoun);

        if (!captureType && isBoardListCommand) {
            useArchiveStore.getState().setPanelMode('board');
            useArchiveStore.getState().setActiveView(lowerCmd.includes('thread') ? 'board-threads' : 'board');
            captureType = 'board_list';
        }

        const isBoardReadCommand = 
            /^(?:read|view)\s+\d+$/i.test(lowerCmd) ||
            /^(?:read|view)\s+\d+\s+(?:board|b)$/i.test(lowerCmd) ||
            /^read\s+thread\s+\d+(?:\s+(?:next|whole))?$/i.test(lowerCmd);

        if (!captureType && isBoardReadCommand) {
            captureType = useArchiveStore.getState().activeView.startsWith('board') ? 'board_read' : 'mail_read';
        }
        const isSentMailListCommand = /^look\s+(?:sent\s+mail|mail\s+sent)(?:\s+seen)?$/i.test(lowerCmd) ||
            /^look\s+(?:seen\s+sent\s+mail|sent\s+seen\s+mail|mail\s+sent\s+seen)$/i.test(lowerCmd);
        const isMailListCommand =
            lowerCmd === 'look mail' || lowerCmd === 'tail' || /^tail\s+\d+$/i.test(lowerCmd) ||
            lowerCmd === 'look seen mail' || isSentMailListCommand ||
            lowerCmd.startsWith('search mail ') || lowerCmd.startsWith('search sent mail ');
        if (!captureType && isMailListCommand) {
            useArchiveStore.getState().setPanelMode('mail');
            useArchiveStore.getState().setActiveView(isSentMailListCommand || lowerCmd.startsWith('search sent mail ') ? 'mail-sent' : 'mail-inbox');
            captureType = 'mail_list';
        }
        if (!captureType && /^read\s+sent\s+\d+$/i.test(lowerCmd)) {
            useArchiveStore.getState().setPanelMode('mail');
            useArchiveStore.getState().setActiveView('mail-sent');
            captureType = 'mail_read';
        }
        const isBookReadCommand =
            !captureType &&
            /^(?:read|view)\s+(?!\d+\b|sent\b|thread\b|next\b|last\b|forward\b|origin\b).+/i.test(lowerCmd);
        if (isBookReadCommand) {
            const title = cmd.trim().replace(/^(?:read|view)\s+/i, '').trim();
            useArchiveStore.getState().setPanelMode('book');
            useArchiveStore.getState().setActiveView('book');
            useArchiveStore.getState().setActiveDetail({
                id: Date.now(),
                source: 'book',
                view: 'book',
                subject: title || 'Book',
                author: '',
                date: '',
                body: ''
            });
            captureType = 'book_read';
        }
        if (captureType) {
            captureStage.current = captureType;
        }

        // Intercept manual board commands to run them silently
        if ((captureType === 'board_list' || captureType === 'board_read') && !silent) {
            if (context.executeCommand) {
                context.executeCommand(cmd, true, isSystem, false, fromDrawer);
            }
            return null; // Intercept and cancel the original command execution
        }
        if ((captureType === 'mail_list' || captureType === 'mail_read') && !silent) {
            if (context.executeCommand) {
                context.executeCommand(cmd, true, isSystem, false, fromDrawer);
            }
            return null;
        }
        if (captureType === 'book_read' && !silent) {
            if (context.executeCommand) {
                context.executeCommand(cmd, true, isSystem, false, fromDrawer);
            }
            return null;
        }
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
