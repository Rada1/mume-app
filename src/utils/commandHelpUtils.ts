/**
 * @file commandHelpUtils.ts
 * @description Helpers for resolving MUME help topics from command button definitions.
 */

import type React from 'react';
import { MUME_COMMANDS } from './mumeCommandCatalog';
import { useCommandPanelStore } from '../stores/useCommandPanelStore';
import { useUIStore } from '../stores/useUIStore';
import type { PopoverState } from '../types';

// --- Logic Section ---

/**
 * Expands abbreviations for standard MUME commands using the catalog.
 */
export const expandMumeCommand = (token: string): string => {
    const lower = token.toLowerCase();
    const found = MUME_COMMANDS.find(entry =>
        lower === entry.full || (lower.startsWith(entry.minimum) && entry.full.startsWith(lower))
    );
    return found ? found.full : lower;
};

/**
 * Resolves the appropriate help topic name for a command string or button.
 */
export const resolveHelpTopic = (rawCommand: string, buttonLabel?: string): string => {
    const trimmed = rawCommand.trim();
    if (!trimmed) return buttonLabel?.trim().toLowerCase() || '';

    // If it's already a help command e.g. "help foo"
    const helpPrefixMatch = /^help\s+(.+)$/i.exec(trimmed);
    if (helpPrefixMatch) {
        return helpPrefixMatch[1].replace(/['"]/g, '').trim().toLowerCase();
    }

    // Spell cast/commune commands: e.g. "cast 'cure light' %n", "c 'magic missile'", "cast fireball %n"
    const quotedSpellMatch = /^(?:cast|c|commune)\s+['"]([^'"]+)['"]/i.exec(trimmed);
    if (quotedSpellMatch && quotedSpellMatch[1].trim()) {
        return quotedSpellMatch[1].trim().toLowerCase();
    }
    const unquotedSpellMatch = /^(?:cast|c|commune)\s+([a-zA-Z0-9_-]+)/i.exec(trimmed);
    if (unquotedSpellMatch && unquotedSpellMatch[1].trim()) {
        return unquotedSpellMatch[1].trim().toLowerCase();
    }

    // Clear parameter wildcards like %n, %p, %n|target, etc.
    const cleanCmd = trimmed.replace(/%[a-z](\|[^\s]+)?/gi, '').trim();

    // Check for "look in" -> topic is "look"
    if (/^look\s+in\b/i.test(cleanCmd)) {
        return 'look';
    }

    // First word/verb
    const firstWord = cleanCmd.split(/\s+/)[0]?.toLowerCase();
    if (!firstWord) return buttonLabel?.trim().toLowerCase() || '';

    // Specific common command verb normalizations
    if (firstWord === 'c' || firstWord === 'cast') return 'cast';
    if (firstWord === 'con' || firstWord === 'cons') return 'consider';
    if (firstWord === 'ex' || firstWord === 'exa') return 'examine';
    if (firstWord === 'sc') return 'score';
    if (firstWord === 'st') return 'stat';
    if (firstWord === 'inf') return 'info';
    if (firstWord === 'wh') return 'who';
    if (firstWord === 'whe' || firstWord === 'wher') return 'where';
    if (firstWord === 'whoi') return 'whois';
    if (firstWord === 'eq') return 'equipment';
    if (firstWord === 'inv') return 'inventory';
    if (firstWord === 'pr') return 'practice';
    if (firstWord === 'dis' || firstWord === 'dism') return 'dismount';

    // Try expanding using MUME command catalog
    const expanded = expandMumeCommand(firstWord);
    if (expanded) return expanded;

    return firstWord;
};

/**
 * Strips leading and trailing non-alphanumeric punctuation from a raw topic candidate,
 * preserving internal spaces and hyphens (e.g. "'cure light'" -> "cure light", "flee!" -> "flee").
 */
export const cleanTopicCandidate = (raw: string): string => {
    return raw.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
};

export { extractTopicFromLogClick, handleLogHelpClick } from './logHelpUtils';

/**
 * Dispatches a MUME help request, opening the Command Panel if closed,
 * arming help capture in popover state, and exiting command help mode.
 */
export const dispatchCommandHelp = (
    topicOrCommand: string,
    executeCommand: (
        command: string,
        echo?: boolean,
        showPrompt?: boolean,
        skipAlias?: boolean,
        isManual?: boolean,
        metadata?: { shouldFocus?: boolean; fromUi?: boolean }
    ) => void,
    isMobile?: boolean
): boolean => {
    const topic = resolveHelpTopic(topicOrCommand);
    if (!topic) return false;

    const cmdPanelStore = useCommandPanelStore.getState();
    if (isMobile) {
        if (!cmdPanelStore.isMobileGuideOpen) cmdPanelStore.setIsMobileGuideOpen(true);
    } else {
        if (!cmdPanelStore.isOpen) cmdPanelStore.setIsOpen(true);
    }
    cmdPanelStore.setIsHelpMode(false);

    const uiStore = useUIStore.getState();
    const currentPopover = uiStore.popoverState;
    const basePopover: PopoverState = currentPopover || {
        x: 0,
        y: 0,
        type: 'menu',
        setId: 'cat-room',
        category: 'cat-room',
        isRoomDescription: true,
        context: 'Room',
        displayName: 'Room',
        entityId: 'command-panel-room'
    };

    uiStore.setPopoverState({
        ...basePopover,
        entityId: basePopover.entityId || 'command-panel-room',
        hasInspectionCard: true,
        isCapturingHelp: true,
        capturedHelpLines: undefined,
        helpTopic: topic,
        isCapturingExamine: false,
        capturedExamineLines: undefined,
        isCapturingConsider: false,
        capturedConsiderLines: undefined,
        isCapturingWhois: false,
        capturedWhoisLines: undefined,
        whoisTarget: undefined,
        isCapturingWho: false,
        capturedWhoLines: undefined,
        isCapturingWhere: false,
        capturedWhereLines: undefined,
        isCapturingRoomAction: false,
        roomActionKind: undefined,
        capturedRoomActionLines: undefined,
        isCapturingPersonalAction: false,
        personalActionKind: undefined,
        capturedPersonalActionLines: undefined
    });

    executeCommand(`help ${topic.toLowerCase()}`, false, false, false, false, { shouldFocus: false, fromUi: true });
    return true;
};


