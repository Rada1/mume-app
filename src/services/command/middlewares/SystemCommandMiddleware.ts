/**
 * @file SystemCommandMiddleware.ts
 * @description Processes #target, /help, closeall, and other client-only commands.
 */

import { CommandMiddleware } from '../types';
import { extractNoun } from '../../../utils/gameUtils';

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
