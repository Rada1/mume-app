/**
 * @file TeleportMiddleware.ts
 * @description Intercepts teleport-related commands to show the selection UI.
 */

import { CommandMiddleware } from '../types';
import { buildKeyedSpellCommand, findMagicKeyTarget, parseKeyedSpellCommand, pruneExpiredMagicKeys } from '../../../utils/magicKeyUtils';

export const TeleportMiddleware: CommandMiddleware = (cmd, { teleportTargets }) => {
    const activeTargets = pruneExpiredMagicKeys(teleportTargets);
    const keyedSpell = parseKeyedSpellCommand(cmd);

    if (keyedSpell) {
        const target = findMagicKeyTarget(activeTargets, keyedSpell.target);
        if (target) return buildKeyedSpellCommand(keyedSpell.prefix, target);
    }
    return undefined; // No change
};
