/**
 * @file SystemCommandMiddleware.ts
 * @description Processes #target, /help, closeall, and other client-only commands.
 */

import { CommandMiddleware } from '../types';
import { extractNoun } from '../../../utils/gameUtils';
import { useModeStore } from '../../../stores/useModeStore';

export const SystemCommandMiddleware: CommandMiddleware = (cmd, context) => {
    const { 
        setTarget, setSettingsTab, setIsSettingsOpen, setIsCharacterOpen, 
        setIsEquipmentOpen, setIsInventoryOpen, addMessage 
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

    // Snoop Handling (Client sync)
    if (lowerCmd.startsWith('/snoop')) {
        const parts = lowerCmd.split(/\s+/);
        if (parts.length > 1) {
            // Check for options like -prompt -gmcp
            const target = parts.find(p => !p.startsWith('-') && p !== '/snoop');
            if (target) {
                useModeStore.getState().startSpectate(target);
            } else if (parts.length === 1 || (parts.length === 2 && parts[1] === '/snoop')) {
                // Just /snoop might mean stop
                useModeStore.getState().stopSpectate();
            }
        } else {
            // Bare /snoop usually stops or shows status
            // We'll let it fall through to server, but we might want to stop if it clears snoop
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
        setIsCharacterOpen(false); 
        setIsEquipmentOpen(false); 
        setIsInventoryOpen(false);
        return null; // Handled
    }

    return undefined; // No change
};
