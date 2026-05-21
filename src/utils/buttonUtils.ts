import { CustomButton, SwipeDirection } from '../types';
import { sanitizeGameTarget } from './gameUtils';
import { decodeCommandEntities } from './commandTextUtils';

const DOOR_ACTION_COMMANDS = new Set(['open', 'close', 'lock', 'unlock', 'knock']);

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
    isLong?: boolean,
    commandPrefixes: string[] = []
) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isSwiped = dist > 15;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    // Cancellation is now handled via screen-absolute position in GameButton.tsx

    if (button.actionType === 'modifier' && !isSwiped) return null;

    let cmd = (isLong && !isSwiped && (!joystickState || !joystickState.currentDir)) ? (button.longCommand || button.command || '') : (isSwiped ? '' : (button.command || ''));
    let actionType = (isLong && !isSwiped && button.longCommand && (!joystickState || !joystickState.currentDir)) ? (button.longActionType || 'command') : (button.actionType || 'command');
    let dir: SwipeDirection | undefined = undefined;

    if (isSwiped) {
        const directions: SwipeDirection[] = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
        const index = (Math.round(angle / 45) + 8) % 8;
        dir = directions[index];

        const hasBase = !!(button.swipeCommands?.[dir] && button.swipeCommands[dir]!.trim());
        const hasLong = !!(isLong && button.longSwipeCommands?.[dir] && button.longSwipeCommands[dir]!.trim());

        if (isLong && (!joystickState || !joystickState.currentDir)) {
            if (hasLong) {
                cmd = button.longSwipeCommands![dir]!;
                actionType = button.longSwipeActionTypes?.[dir] || 'command';
            } else {
                // If in Long mode but NO long swipe is defined, fall back to base swipe if it exists
                if (hasBase) {
                    cmd = button.swipeCommands![dir]!;
                    actionType = button.swipeActionTypes?.[dir] || 'command';
                }
            }
        } else if (hasBase) {
            cmd = button.swipeCommands![dir]!;
            actionType = button.swipeActionTypes?.[dir] || 'command';
        }
    }

    let consumedTarget = false;
    if (context) {
        const cleanContext = sanitizeGameTarget(context) || context;
        if (cmd.match(/%n\|/)) cmd = cmd.replace(/%n\|[^\s]+/g, cleanContext);
        else if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, cleanContext);
        else cmd = cmd ? `${cmd} ${cleanContext}` : cleanContext;
    } else {
        if (cmd.match(/%n\|/)) {
            cmd = cmd.replace(/%n\|([^\s]+)/g, (_match, fallback) => {
                if (target) {
                    consumedTarget = true;
                    return target;
                }
                return fallback;
            });
        } else if (cmd.includes('%n')) {
            if (target) {
                cmd = cmd.replace(/%n/g, target);
                consumedTarget = true;
            } else {
                cmd = cmd.replace(/ %n/g, '').replace(/%n/g, '');
            }
        }
    }

    if (!cmd && (!joystickState || !joystickState.currentDir) && !isSwiped) {
        return null;
    }

    const finalMods: string[] = [];
    if (joystickState) {
        if (joystickState.currentDir) {
            const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
            finalMods.push(dirMap[joystickState.currentDir] || joystickState.currentDir);
        } else if (joystickState.isTargetModifierActive && target && !consumedTarget) {
            finalMods.push(target);
        }
    }

    if (button.id === 'tactical-doors' && DOOR_ACTION_COMMANDS.has(cmd.trim().toLowerCase()) && !finalMods.length && !modifiers.length) {
        cmd = `${cmd} ${target || 'exit'}`;
    }

    const finalCmd = decodeCommandEntities(
        (actionType === 'command') ? [...commandPrefixes, cmd, ...finalMods, ...modifiers].filter(Boolean).join(' ') : cmd
    );
    const modifierStr = finalMods.join(' ');

    if (!dir && joystickState?.currentDir) {
        const joyToSwipe: Record<string, SwipeDirection> = {
            n: 'up', s: 'down', e: 'right', w: 'left',
            ne: 'ne', nw: 'nw', se: 'se', sw: 'sw',
            u: 'nw', d: 'se'
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
