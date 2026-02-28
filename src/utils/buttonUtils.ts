import { CustomButton, SwipeDirection } from '../types';

/**
 * Calculates the command to execute based on swipe delta and modifiers.
 */
export const getButtonCommand = (
    button: CustomButton,
    dx: number,
    dy: number,
    context?: string,
    maxDist?: number,
    modifiers: string[] = [],
    joystickState?: { currentDir: string | null, isTargetModifierActive: boolean },
    target?: string | null,
    isLong?: boolean
) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isSwiped = dist > 15;

    // Cancellation logic: if we moved significantly out (>30px) and now we are back in (<15px)
    if (maxDist && maxDist > 25 && dist < 12) {
        return null;
    }

    let cmd = button.command;
    let actionType = button.actionType || 'command';
    let angle = 0;

    if (isSwiped && button.swipeCommands) {
        angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Unified Direction Logic (Geared)
        const directions: SwipeDirection[] = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
        const index = (Math.round(angle / 45) + 8) % 8;
        const dir = directions[index];

        if (isLong && button.longSwipeCommands?.[dir]) {
            cmd = button.longSwipeCommands[dir]!;
            actionType = button.longSwipeActionTypes?.[dir] || 'command';
        } else if (button.swipeCommands[dir]) {
            cmd = button.swipeCommands[dir]!;
            actionType = button.swipeActionTypes?.[dir] || 'command';
        }
    }

    if (context) {
        if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
        else cmd = `${cmd} ${context}`;
    }

    if (!cmd && (!joystickState || !joystickState.currentDir)) {
        return null;
    }

    const finalMods: string[] = [];
    if (joystickState) {
        if (joystickState.currentDir) {
            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
            finalMods.push(dirMap[joystickState.currentDir] || joystickState.currentDir);
        } else if (joystickState.isTargetModifierActive && target) {
            finalMods.push(target);
        }
    }

    const finalCmd = actionType === 'command' ? [cmd, ...finalMods, ...modifiers].filter(Boolean).join(' ') : cmd;

    return {
        cmd: finalCmd,
        actionType,
        isSwipe: isSwiped,
        angle
    };
};
