/**
 * @file mapperHeldCommandTarget.ts
 * @description Applies held tactical commands to mapper occupant hit targets.
 */

import { getButtonCommand } from '../../utils/buttonUtils';
import type { MapOccupantTarget } from './occupantTargets';

// --- Logic Section ---

export const fireHeldCommandAtMapOccupant = (
    deps: any,
    occupantHit: MapOccupantTarget
): boolean => {
    const activeHeldButton = deps.heldButtonRef?.current || deps.heldButton;
    if (!activeHeldButton || activeHeldButton.didFire || activeHeldButton.id?.startsWith('log-inline-')) {
        return false;
    }
    const shouldTriggerHaptic = activeHeldButton.id !== 'map-long-press';

    const context = occupantHit.commandTarget || occupantHit.name;
    const sourceButton = deps.btn?.buttons?.find((button: any) => button.id === activeHeldButton.id);
    if (sourceButton?.actionType === 'modifier') return false;

    if (sourceButton) {
        const resolved = getButtonCommand(
            sourceButton,
            activeHeldButton.dx || 0,
            activeHeldButton.dy || 0,
            context,
            undefined,
            activeHeldButton.modifiers || [],
            deps.joystick,
            deps.target,
            !!deps.joystick?.isTargetModifierActive,
            activeHeldButton.commandPrefixes || []
        );

        if (resolved?.cmd) {
            deps.executeCommand(resolved.cmd, false, false, false, false, { fromUi: true });
            deps.setHeldButton?.((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
            if (shouldTriggerHaptic) deps.triggerHaptic?.(60);
            deps.playClickSound?.();
            return true;
        }
    }

    let finalCmd = activeHeldButton.baseCommand;
    if (!finalCmd) return false;

    finalCmd = finalCmd.includes('%n') ? finalCmd.replace(/%n/g, context) : `${finalCmd} ${context}`;
    finalCmd = [...(activeHeldButton.commandPrefixes || []), finalCmd].filter(Boolean).join(' ');
    deps.executeCommand(finalCmd, false, false, false, false, { fromUi: true });
    deps.setHeldButton?.((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
    if (shouldTriggerHaptic) deps.triggerHaptic?.(60);
    deps.playClickSound?.();
    return true;
};
