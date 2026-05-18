/**
 * @file TeleportMiddleware.ts
 * @description Intercepts teleport-related commands to show the selection UI.
 */

import { CommandMiddleware } from '../types';
import { buildKeyedSpellCommand, findMagicKeyTarget, parseKeyedSpellCommand, pruneExpiredMagicKeys } from '../../../utils/magicKeyUtils';

export const TeleportMiddleware: CommandMiddleware = (cmd, { teleportTargets, setPopoverState }) => {
    const lowerCmd = cmd.toLowerCase().trim();
    const activeTargets = pruneExpiredMagicKeys(teleportTargets);
    const keyedSpell = parseKeyedSpellCommand(cmd);

    if (keyedSpell) {
        if (!keyedSpell.target && activeTargets.length > 0) {
            setPopoverState({
                x: window.innerWidth / 2 - 100,
                y: window.innerHeight / 2 - 100,
                type: 'teleport-select',
                setId: 'teleport',
                spellCommand: keyedSpell.prefix
            });
            return null;
        }

        const target = findMagicKeyTarget(activeTargets, keyedSpell.target);
        if (target) return buildKeyedSpellCommand(keyedSpell.prefix, target);
    }

    // Teleport Interception
    if (activeTargets.length > 0) {
        const teleportMatch = lowerCmd.match(/^(cast\s+['"]?(teleport|portal|scry|watch room)['"]?)$/i);
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
