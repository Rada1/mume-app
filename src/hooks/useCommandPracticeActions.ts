/** @file useCommandPracticeActions.ts — Describes ability help and training for the shared trait action list. */
import type { CommandPracticeAction, CommandPracticeActionsProps } from '../types';
import { createButton } from '../utils/buttonFactory';

// --- Logic Section ---
export const useCommandPracticeActions = ({ practice, onRequestHelp }: CommandPracticeActionsProps): CommandPracticeAction[] => {
    if (!practice.selected) return [];
    const name = practice.selected.name;
    const pending = Boolean(practice.report.pendingCommand);
    const actions: CommandPracticeAction[] = [{
        button: createButton({ id: 'command-practice-help', label: 'help', command: `help ${name.toLowerCase()}`, setId: 'trait-guildmaster' }),
        run: () => onRequestHelp(name), disabled: pending
    }];
    if (practice.training) actions.push({
        button: createButton({ id: 'command-practice-train', label: 'practice', command: `practice ${name.toLowerCase()}`, setId: 'trait-guildmaster' }),
        run: practice.train, disabled: !practice.training.enabled || pending || !practice.canRequest,
        title: pending ? 'Practicing…' : practice.training.reason
    });
    return actions;
};
