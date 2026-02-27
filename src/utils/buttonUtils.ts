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
    target?: string | null
) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isSwiped = dist > 15;

    // Cancellation logic: if we moved significantly out (>30px) and now we are back in (<15px)
    if (maxDist && maxDist > 25 && dist < 12) {
        return null;
    }

    let cmd = button.command;
    let actionType = button.actionType || 'command';

    if (isSwiped && button.swipeCommands) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        let dir: SwipeDirection;

        if (angle >= -22.5 && angle < 22.5) dir = 'right';
        else if (angle >= 22.5 && angle < 67.5) dir = 'se';
        else if (angle >= 67.5 && angle < 112.5) dir = 'down';
        else if (angle >= 112.5 && angle < 157.5) dir = 'sw';
        else if (angle >= 157.5 || angle < -157.5) dir = 'left';
        else if (angle >= -157.5 && angle < -112.5) dir = 'nw';
        else if (angle >= -112.5 && angle < -67.5) dir = 'up';
        else dir = 'ne';

        if (button.swipeCommands[dir]) {
            cmd = button.swipeCommands[dir]!;
            actionType = button.swipeActionTypes?.[dir] || 'command';
        }
    }

    if (context) {
        if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
        else cmd = `${cmd} ${context}`;
    }

    if (!cmd && (!joystickState || !joystickState.currentDir)) return null;

    const finalMods: string[] = [];
    if (joystickState) {
        if (joystickState.currentDir) {
            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
            finalMods.push(dirMap[joystickState.currentDir] || joystickState.currentDir);
        } else if (joystickState.isTargetModifierActive && target) {
            finalMods.push(target);
        }
    }

    if (actionType === 'command') {
        return [cmd, ...finalMods, ...modifiers].filter(Boolean).join(' ');
    }
    return null;
};
