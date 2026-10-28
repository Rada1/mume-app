/** @file commandTreeCurrentTarget.ts — Keeps the locked target available to offensive command branches. */
import type { CustomButton } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { isCurrentCommandTarget } from './currentCommandTarget';
import { canCommandAcceptTarget, isOffensiveTargetCommand } from './commandTargetUtils';
import { isFriendlyTargetCommand } from './friendlyTargetCommand';

// --- Offensive Target Section ---
export const isCommandTreeOffensiveTargetAction = (button: CustomButton): boolean => {
    if (/^(?:assist|ass|track)(?:\s|$)/i.test(button.command.trim())) return false;
    if (!canCommandAcceptTarget(button.command)) return false;
    if (/^(?:bash|pick)\s+%n\|exit\b/i.test(button.command.trim())) return false;
    if (isFriendlyTargetCommand(button) || button.inlineTargetKinds?.every(kind => kind !== 'character')) return false;
    return isOffensiveTargetCommand(button.command)
        || /^trait-(?:offense|control)$/.test(button.setId)
        || /^inline-ability-(?:offense|control)-/.test(button.id);
};

export const usesCommandTargetChip = (button: CustomButton): boolean => (
    isCommandTreeOffensiveTargetAction(button)
    || (/^track(?:\s|$)/i.test(button.command.trim()) && canCommandAcceptTarget(button.command))
);

// --- Current Target Section ---
export const getCommandTreeCurrentTarget = (
    entries: CommandActionTargetEntry[],
    selectedTarget: string | null | undefined
): CommandActionTargetEntry | null => {
    const target = selectedTarget?.trim();
    if (!target) return null;

    const existing = entries.find(entry => isCurrentCommandTarget(entry, target));
    if (existing) return { ...existing, scope: 'global' };

    return {
        id: `command-current-target:${target.toLowerCase().replace(/\s+/g, '-')}`,
        label: target,
        keyword: target,
        context: target,
        category: 'cat-enemy',
        group: 'npcs',
        scope: 'global'
    };
};
