/**
 * @file ActionMiddleware.ts
 * @description Processes #action and #unaction client commands.
 */

import { CommandMiddleware } from '../types';

export const ActionMiddleware: CommandMiddleware = (cmd, { setActions, addMessage }) => {
    const lowerCmd = cmd.toLowerCase().trim();

    // Action Interception
    if (lowerCmd.startsWith('#action')) {
        const actionMatch = cmd.match(/^#action\s+({?)(.+?)(}?)\s+({?)(.+?)(}?)\s*$/i);
        if (actionMatch) {
            const pattern = actionMatch[2];
            const command = actionMatch[5];
            setActions(prev => [...prev, {
                id: Math.random().toString(36).substring(2, 9),
                pattern,
                command,
                isRegex: false,
                enabled: true
            }]);
            addMessage('system', `Action added: [${pattern}] -> [${command}]`);
            return null; // Handled internally
        } else {
            addMessage('system', 'Usage: #action {pattern} {command}');
            return null; // Handled internally
        }
    }
    
    if (lowerCmd.startsWith('#unaction')) {
        const unactionMatch = cmd.match(/^#unaction\s+({?)(.+?)(}?)\s*$/i);
        if (unactionMatch) {
            const patternToRemove = unactionMatch[2].toLowerCase();
            setActions(prev => {
                const filtered = prev.filter(a => a.pattern.toLowerCase() !== patternToRemove);
                if (filtered.length !== prev.length) {
                    addMessage('system', `Action removed: [${patternToRemove}]`);
                } else {
                    addMessage('system', `Action not found: [${patternToRemove}]`);
                }
                return filtered;
            });
            return null; // Handled internally
        } else {
            addMessage('system', 'Usage: #unaction {pattern}');
            return null; // Handled internally
        }
    }

    return undefined; // No change
};
