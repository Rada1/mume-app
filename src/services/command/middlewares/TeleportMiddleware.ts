/**
 * @file TeleportMiddleware.ts
 * @description Intercepts teleport-related commands to show the selection UI.
 */

import { CommandMiddleware } from '../types';

export const TeleportMiddleware: CommandMiddleware = (cmd, { teleportTargets, setPopoverState }) => {
    const lowerCmd = cmd.toLowerCase().trim();

    // Teleport Interception
    if (teleportTargets.length > 0) {
        const teleportMatch = lowerCmd.match(/^(cast\s+['"]?(teleport|portal|scry)['"]?)$/i);
        if (teleportMatch) {
            setPopoverState({ 
                x: window.innerWidth / 2 - 100, 
                y: window.innerHeight / 2 - 100, 
                type: 'teleport-select', 
                setId: 'teleport', 
                spellCommand: teleportMatch[1] 
            });
            return null; // Intercepted
        }
    }

    if (lowerCmd.startsWith('#teleport') || lowerCmd.startsWith('#tp') || lowerCmd.startsWith('#targets')) {
        const isManage = lowerCmd.includes('manage') || lowerCmd.includes('list');
        setPopoverState({
            x: window.innerWidth / 2 - (isManage ? 150 : 100),
            y: window.innerHeight / 2 - (isManage ? 150 : 100),
            type: isManage ? 'teleport-manage' : 'teleport-select',
            setId: 'teleport',
            spellCommand: isManage ? undefined : "cast 'teleport'"
        });
        return null; // Intercepted
    }

    return undefined; // No change
};
