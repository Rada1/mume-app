/** @file resolveButtonClickCommand.ts — Resolves command templates for button actions. */
import type { CustomButton } from '../../types';
import { extractMumeKeyword, formatMumeTarget } from '../../utils/gameUtils';
import { getInlineCategoryAxes } from '../../utils/inlineCategoryAxes';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { usesCommandTargetChip } from '../../utils/commandTreeCurrentTarget';

// --- Logic Section ---
export interface ResolveButtonClickCommandOptions {
    button: CustomButton;
    context?: string;
    parentNoun?: string;
    direction?: string;
    target: string | null;
    keywordOverrides: Record<string, string>;
    popoverCategory?: string;
    popoverSetId?: string;
    isTrackpadModifierActive: boolean;
    joystickDirection?: string | null;
    joystickTargetModifierActive: boolean;
}

export interface ResolvedButtonClickCommand {
    finalCmd: string;
    baseCmd: string;
    finalContext: string;
    detectedParent?: string;
    consumedTarget: boolean;
    consumesJoystick: boolean;
}

const isDirection = (value: string) =>
    ['n', 's', 'e', 'w', 'u', 'd', 'north', 'south', 'east', 'west', 'up', 'down', 'ne', 'nw', 'se', 'sw']
        .includes(value.toLowerCase());

export const resolveButtonClickCommand = ({
    button, context, parentNoun, direction, target, keywordOverrides, popoverCategory,
    popoverSetId, isTrackpadModifierActive, joystickDirection, joystickTargetModifierActive
}: ResolveButtonClickCommandOptions): ResolvedButtonClickCommand => {
    // Explicit menu contexts remain valid for every command; offensive actions
    // and Track may implicitly consume the locked target chip.
    const chipTarget = usesCommandTargetChip(button) ? target : null;
    const effectiveContext = context && keywordOverrides[context] ? keywordOverrides[context] : context;
    const popoverAxes = getInlineCategoryAxes(popoverCategory || popoverSetId);
    const isNpcContext = popoverAxes.isCharacter || Boolean(popoverSetId?.startsWith('npc'));
    const isBashDoorTarget = /^bash\s+%n(?:\||\s|$)/i.test(button.command.trim())
        && (popoverAxes.categoryId === 'cat-exit' || /^exit\s+/i.test(effectiveContext || ''));
    const bashDoorContext = (effectiveContext || '').replace(/^exit\s+/i, '').trim();
    let finalContext = isBashDoorTarget ? (bashDoorContext ? `exit ${bashDoorContext}` : 'exit')
        : ['cat-mount-object', 'cat-container-item'].includes(popoverAxes.categoryId || '') ? effectiveContext || '' : popoverAxes.isObject
        ? /^\d+\./.test(effectiveContext?.trim() || '')
            ? formatMumeTarget(effectiveContext) || ''
            : extractMumeKeyword(effectiveContext || '')
        : formatMumeTarget(effectiveContext) || effectiveContext || '';
    let detectedParent = parentNoun;

    const isIndexedTarget = /^\d+\.[\w'*.-]+/.test(finalContext);
    if (!isNpcContext && !isIndexedTarget && !detectedParent && finalContext && finalContext.includes('.')) {
        const parts = finalContext.split('.');
        const lastPart = parts[parts.length - 1];
        if (Number.isNaN(Number.parseInt(lastPart))) detectedParent = lastPart;
    }

    if (detectedParent && finalContext && finalContext.endsWith(`.${detectedParent}`)) {
        finalContext = finalContext.slice(0, -(detectedParent.length + 1));
    }

    let cmd = decodeCommandEntities(button.command);
    let consumedTarget = false;
    if (finalContext) {
        if (cmd.match(/%n\|/)) cmd = cmd.replace(/%n\|[^\s]+/g, finalContext);
        else if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, finalContext);
    } else if (cmd.includes('%n') && chipTarget) {
        if (cmd.match(/%n\|/)) cmd = cmd.replace(/%n\|[^\s]+/g, chipTarget);
        else cmd = cmd.replace(/%n/g, chipTarget);
        consumedTarget = true;
    } else if (cmd.match(/%n\|/)) {
        cmd = cmd.replace(/%n\|([^\s]+)/g, '$1');
    }
    if (detectedParent && cmd.includes('%p')) cmd = cmd.replace(/%p/g, detectedParent);

    const resolvedDirection = direction || (isDirection(finalContext) ? finalContext : undefined)
        || (chipTarget && isDirection(chipTarget) ? chipTarget : undefined);
    if (resolvedDirection) cmd = cmd.includes('%d') ? cmd.replace(/%d/g, resolvedDirection) : cmd;

    if (button.setId === 'doors' && !button.command.includes('%')) {
        const appendTarget = resolvedDirection || finalContext;
        if (appendTarget && !cmd.toLowerCase().includes(appendTarget.toLowerCase())) cmd = `${cmd} ${appendTarget}`;
    }

    cmd = cmd.replace(/%[ndp]/g, '').replace(/%%n/g, '').trim();
    const baseCmd = cmd;
    let finalCmd = baseCmd;
    let consumesJoystick = false;
    const skipJoystick = (button as CustomButton & { _skipJoystick?: boolean })._skipJoystick;
    if (isTrackpadModifierActive && !skipJoystick) {
        const lookTarget = decodeCommandEntities(button.command).trim();
        if (lookTarget && lookTarget !== '__clear_target__') finalCmd = `look ${lookTarget}`;
    } else if (joystickDirection && !skipJoystick) {
        const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
        finalCmd = `${finalCmd} ${dirMap[joystickDirection] || joystickDirection}`;
        consumesJoystick = true;
    } else if (joystickTargetModifierActive && chipTarget && !consumedTarget && !skipJoystick) {
        finalCmd = `${finalCmd} ${chipTarget}`;
        consumesJoystick = true;
    }

    return { finalCmd, baseCmd, finalContext, detectedParent, consumedTarget, consumesJoystick };
};
