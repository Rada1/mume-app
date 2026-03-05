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
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Cancellation logic: South-East (SE)
    // Matches the UI indicator positioning (0 to 90 degrees)
    if (dist > 70 && angle > 0 && angle < 90) {
        return null; // CANCEL
    }

    let cmd = (isLong && !isSwiped && button.longCommand) ? button.longCommand : (isSwiped ? '' : button.command);
    let actionType = (isLong && !isSwiped && button.longCommand) ? (button.longActionType || 'command') : (button.actionType || 'command');
    let dir: SwipeDirection | undefined = undefined;

    if (isSwiped) {
        const directions: SwipeDirection[] = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
        const index = (Math.round(angle / 45) + 8) % 8;
        dir = directions[index];

        const hasBase = !!(button.swipeCommands?.[dir] && button.swipeCommands[dir]!.trim());
        const hasLong = !!(isLong && button.longSwipeCommands?.[dir] && button.longSwipeCommands[dir]!.trim());

        if (hasBase || hasLong) {
            if (hasBase) {
                cmd = button.swipeCommands![dir]!;
                actionType = button.swipeActionTypes?.[dir] || 'command';
            }
            if (hasLong) {
                cmd = button.longSwipeCommands![dir]!;
                actionType = button.longSwipeActionTypes?.[dir] || 'command';
            }
        } else {
            // Visual feedback only - no command execution
            cmd = '';
            actionType = 'command';
        }
    }

    if (context) {
        if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
        else cmd = `${cmd} ${context}`;
    }

    if (!cmd && (!joystickState || !joystickState.currentDir) && !isSwiped) {
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

    const finalCmd = (actionType === 'command') ? [cmd, ...finalMods, ...modifiers].filter(Boolean).join(' ') : cmd;
    const modifierStr = finalMods.join(' ');

    if (!dir && joystickState?.currentDir) {
        const joyToSwipe: Record<string, SwipeDirection> = {
            n: 'up', s: 'down', e: 'right', w: 'left',
            ne: 'ne', nw: 'nw', se: 'se', sw: 'sw'
        };
        dir = joyToSwipe[joystickState.currentDir];
    }

    return {
        cmd: finalCmd,
        modifiers: modifierStr,
        actionType,
        isSwipe: isSwiped,
        angle,
        dir
    };
};
