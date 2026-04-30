/**
 * @file SystemCommandMiddleware.ts
 * @description Processes #target, /help, closeall, and other client-only commands.
 */

import { CommandMiddleware } from '../types';
import { extractNoun } from '../../../utils/gameUtils';
import { useModeStore } from '../../../stores/useModeStore';

export const SystemCommandMiddleware: CommandMiddleware = (cmd, context) => {
    const { 
        setTarget, setSettingsTab, setIsSettingsOpen, handleTabClick, addMessage, setUI
    } = context;
    const lowerCmd = cmd.toLowerCase().trim();

    // Target Setting
    const setTargetMatch = cmd.match(/^(:|#)?target\s*(\s+|=)\s*(.+)$/i) || cmd.match(/^#target\s+(.+)$/i);
    if (setTargetMatch) {
        const rawTarget = setTargetMatch[3] || setTargetMatch[2] || setTargetMatch[1];
        if (rawTarget) {
            const nounTarget = extractNoun(rawTarget.trim());
            setTarget(nounTarget);
            return null; // Handled
        }
    }

    // Snoop Handling (Client sync) — both /snoop and bare snoop commands
    const snoopMatch = lowerCmd.match(/^(?:\/snoop|snoop)(?:\s+(.+))?$/);
    if (snoopMatch) {
        const argStr = snoopMatch[1] || '';
        const nameParts = argStr.split(/\s+/).filter(p => !p.startsWith('-') && p.length > 0);
        const snoopTarget = nameParts[0] || null;
        if (snoopTarget) {
            useModeStore.getState().startSpectate(snoopTarget);
        } else {
            useModeStore.getState().stopSpectate();
        }
    }

    if (lowerCmd === '/help' || lowerCmd === '/?') {
        if (setSettingsTab && setIsSettingsOpen) {
            setSettingsTab('help');
            setIsSettingsOpen(true);
            return null; // Handled
        }
    }

    if (lowerCmd === 'closeall') {
        setUI({ drawer: 'none' });
        return null; // Handled
    }

    return undefined; // No change
};
