/** @file reverseCommandTargets.ts — Finds entities by reversing their category → trait → button actions. */
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { ActionFilterDeps } from './actionUtils';
import type { ResolvedCommandTargetSuggestions } from './commandTargetSuggestionResolver';
import { isButtonValidForEntity } from './actionUtils';
import { getResolvedTraitSections } from './inlineActionModel';

// --- Reverse Action Lookup ---
const normalize = (command: string) => command.toLowerCase().replace(/["']/g, '').trim().replace(/\s+/g, ' ');
export const resolveReverseCommandTargets = (
    command: string, entries: CommandActionTargetEntry[], deps: ActionFilterDeps
): ResolvedCommandTargetSuggestions | null => {
    // Multi-argument and special catalog menus retain their argument-specific resolvers.
    if (/^(?:give|put|get|pour|buy|sell|value|mend|show|compare|list|look|examine|tell|ask|whisper)(?:\s|$)/i.test(command)) return null;
    const input = normalize(command);
    const matches = deps.buttons.flatMap(button => {
        const template = button.command.match(/^(.*?)\s+%n(?:\|[^\s]+)?$/i);
        if (!template || /[;\n]/.test(template[1])) return [];
        const head = normalize(template[1]);
        return input === head || input.startsWith(`${head} `) ? [{ button, head }] : [];
    });
    if (!matches.length) return null;
    const longestHead = Math.max(...matches.map(match => match.head.length));
    const matching = matches.filter(match => match.head.length === longestHead);
    const head = matching[0].head;
    const suggestions = entries.filter(entry => matching.some(({ button }) => {
        const sections = getResolvedTraitSections(entry.category, entry.label, deps.inlineCategories || [])
            .filter(section => entry.category !== 'cat-exit' || entry.hasDoor !== false || section.trait.id !== 'trait-door-actions');
        const actionSections = sections.filter(section => section.buttonIds.includes(button.id));
        if (entry.groupMember && actionSections.every(section => section.trait.id === 'trait-offense')) return false;
        return actionSections.length > 0 && isButtonValidForEntity(button, entry.id, entry.category, deps, entry.category, entry.label);
    })).map(entry => ({ key: entry.id, label: entry.id === 'command-panel-self' ? 'Self' : entry.label, value: entry.context,
        meta: entry.id === 'command-panel-self' ? 'self'
            : entry.group === 'inventory' || entry.group === 'worn' ? entry.group
            : entry.category === 'cat-exit' ? 'exit'
            : entry.group === 'objects' ? 'object' : entry.category.replace(/^cat-/, ''), category: entry.category }));
    return { suggestions, fragment: input.slice(head.length).trim(), argumentIndex: 0, isActionDerived: true };
};
