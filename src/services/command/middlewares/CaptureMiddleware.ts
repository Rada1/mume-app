/**
 * @file CaptureMiddleware.ts
 * @description Header-driven middleware for the Reactive Capture Machine.
 * Sets pending flags and handles specialized command state transitions.
 */

import { CommandMiddleware } from '../types';
import { useArchiveStore } from '../../../stores/useArchiveStore';
import { useCommandShopStore } from '../../../stores/useCommandShopStore';
import { useCommandPracticeStore } from '../../../stores/useCommandPracticeStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useClientPanelStackStore } from '../../../stores/useClientPanelStackStore';
import { isGameplayPagerControl, useGameplayPagerStore } from '../../../stores/useGameplayPagerStore';

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
    wh: 'who',
    where: 'where',
    whe: 'where',
    wher: 'where',
    achievement: 'achievement',
    achievements: 'achievement',
    examine: 'examine',
    ex: 'examine',
    exa: 'examine',
    consider: 'consider',
    con: 'consider',
    cons: 'consider',
    whois: 'whois'
};

export const CaptureMiddleware: CommandMiddleware = (cmd, context, { silent, isSystem, fromDrawer }) => {
    // A viewer Return/back/redisplay/quit continues the existing response.
    // Preserve its buffered pages, pending flags and capture stage until the real prompt.
    if (useGameplayPagerStore.getState().active && isGameplayPagerControl(cmd)) return undefined;
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
        if (useCommandShopStore.getState().pendingCommand?.toLowerCase() === lowerCmd) captureType = 'shop_action';
        if (useCommandPracticeStore.getState().pendingCommand?.toLowerCase() === lowerCmd) captureType = 'practice_action';
        const pendingHelp = useUIStore.getState().popoverState;
        const pendingCommandReport = pendingHelp?.isCapturingCommandReport &&
            pendingHelp.commandReportCommand?.trim().toLowerCase() === lowerCmd;
        if (pendingCommandReport && !captureType && !['board', 'book', 'mail'].includes(pendingHelp.setId)) captureType = 'command_report';
        if (
            !captureType &&
            pendingHelp?.isCapturingHelp &&
            pendingHelp.helpTopic &&
            lowerCmd === `help ${pendingHelp.helpTopic.trim().toLowerCase()}`
        ) captureType = 'help_action';

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

        // --- Self-inspection panel (character card avatar popover) ---
        // Bare "change title" reads your title. Description/whois reads go
        // through the GMCP editor protocol instead (see onMumeEdit), since
        // "change description"/"change whois" open a real edit session.
        if (firstWord === 'change' && words[1] === 'title' && words.length === 2) {
            captureType = 'self_title';
        }

        const isLook = firstWord === 'look' || firstWord === 'l';
        const isTail = firstWord === 'tail';
        const isBoardNoun = lastWord === 'board' || lastWord === 'b' || lastWord === 'bulletin';

        const isPopoverInspect = silent && isSystem && !fromDrawer;

        // Match "look ... board", "look ... b", "look ... bulletin", "tail ...", "tail"
        const isBoardListCommand = !isPopoverInspect && (
            (isLook && isBoardNoun) ||
            lowerCmd === 'look threads' ||
            lowerCmd === 'look all threads' ||
            /^look\s+thread\s+\d+$/i.test(lowerCmd) ||
            (isTail && useArchiveStore.getState().activeView === 'board') ||
            (lowerCmd.startsWith('look at ') && isBoardNoun) ||
            (lowerCmd.startsWith('look all ') && isBoardNoun)
        );

        if (!captureType && isBoardListCommand) {
            useArchiveStore.getState().setPanelMode('board');
            useArchiveStore.getState().setActiveView(lowerCmd.includes('thread') ? 'board-threads' : 'board');
            captureType = 'board_list';
        }

        const isBoardReadCommand = !isPopoverInspect && (
            /^(?:read|view)\s+\d+$/i.test(lowerCmd) ||
            /^(?:read|view)\s+\d+\s+(?:board|b)$/i.test(lowerCmd) ||
            /^read\s+thread\s+\d+(?:\s+(?:next|whole))?$/i.test(lowerCmd)
        );

        if (!captureType && isBoardReadCommand) {
            captureType = useArchiveStore.getState().activeView.startsWith('board') ? 'board_read' : 'mail_read';
        }
        if (captureType === 'board_list' || captureType === 'board_read') {
            useUIStore.getState().setPopoverState({x:0, y:0, setId:'board', type:'menu', commandPanelCapture:true,
                hasInspectionCard:true, commandReportCommand:cmd.trim(),
                commandReportLabel:captureType === 'board_list' ? 'Board' : cmd.trim(), isCapturingCommandReport:true});
            useClientPanelStackStore.getState().setDetailsEnabled(true);
        }
        const mailLookCommand = isLook ? `look ${words.slice(1).join(' ')}` : lowerCmd;
        const isSentMailListCommand = /^look\s+(?:sent\s+mail|mail\s+sent)(?:\s+seen)?$/i.test(mailLookCommand) ||
            /^look\s+(?:seen\s+sent\s+mail|sent\s+seen\s+mail|mail\s+sent\s+seen)$/i.test(mailLookCommand);
        const isMailListCommand = !isPopoverInspect && (
            /^look (?:mail|mailbox)$/.test(mailLookCommand) || lowerCmd === 'tail' || /^tail\s+\d+$/i.test(mailLookCommand) ||
            mailLookCommand === 'look seen mail' || isSentMailListCommand ||
            lowerCmd.startsWith('search mail ') || lowerCmd.startsWith('search sent mail ')
        );
        if (!captureType && isMailListCommand) {
            useArchiveStore.getState().setPanelMode('mail');
            useArchiveStore.getState().setActiveView(isSentMailListCommand || lowerCmd.startsWith('search sent mail ') ? 'mail-sent' : 'mail-inbox');
            captureType = 'mail_list';
        }
        if (captureType === 'mail_list' || captureType === 'mail_read') {
            useUIStore.getState().setPopoverState({x:0, y:0, setId:'mail', type:'menu', commandPanelCapture:true,
                hasInspectionCard:true, commandReportCommand:cmd.trim(), commandReportLabel:captureType === 'mail_list' ? 'Mail' : cmd.trim(), isCapturingCommandReport:true});
            useClientPanelStackStore.getState().setDetailsEnabled(true);
        }
        const roomInspection = useUIStore.getState().popoverState;
        if (!captureType && (/^(?:exits|map)$/i.test(lowerCmd) || /^weather\s+(?:global|fog|local)$/i.test(lowerCmd))
            && roomInspection?.isCapturingRoomAction) {
            captureType = 'room_action';
        }
        if (!captureType && isLook && (words.length > 1 || (roomInspection?.isRoomDescription && roomInspection.isCapturingExamine))) {
            captureType = 'examine';
        }
        const isMailReadCommand = !isPopoverInspect && /^read\s+sent\s+\d+$/i.test(lowerCmd);
        if (!captureType && isMailReadCommand) {
            useArchiveStore.getState().setPanelMode('mail');
            useArchiveStore.getState().setActiveView('mail-sent');
            captureType = 'mail_read';
            useUIStore.getState().setPopoverState({x:0,y:0,setId:'mail',type:'menu',commandPanelCapture:true,
                hasInspectionCard:true,commandReportCommand:cmd.trim(),commandReportLabel:cmd.trim(),isCapturingCommandReport:true});
            useClientPanelStackStore.getState().setDetailsEnabled(true);
        }
        const isBookReadCommand =
            !captureType &&
            !isPopoverInspect &&
            /^(?:read|view)\s+(?!\d+(?:\s|$)|sent\b|thread\b|next\b|last\b|forward\b|origin\b).+/i.test(lowerCmd);
        if (isBookReadCommand) {
            const title = cmd.trim().replace(/^(?:read|view)\s+/i, '').trim();
            useUIStore.getState().setPopoverState({
                x: 0, y: 0, setId: 'book', type: 'menu', commandPanelCapture: true, hasInspectionCard: true,
                commandReportCommand: cmd.trim(), commandReportLabel: title || 'Book',
                isCapturingCommandReport: true
            });
            useClientPanelStackStore.getState().setDetailsEnabled(true);
            captureType = 'book_read';
        }
        if (captureType) {
            captureStage.current = captureType;
        }

        if (captureType === 'book_read' || captureType === 'board_list' || captureType === 'board_read' || captureType === 'mail_list' || captureType === 'mail_read') return undefined;
    }

    if (!isSystem && !fromDrawer) {
        // Manual command cleanup: ensure we aren't "stuck" in a silent background capture 
        // if the user manually triggers a known list command.
        if (finalizeCapture && !['who', 'where', 'whe', 'wher', 'wh'].includes(lowerCmd)) {
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
