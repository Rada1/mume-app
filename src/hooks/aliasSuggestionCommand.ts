/** @file aliasSuggestionCommand.ts — Projects an alias into the command used to suggest its next argument. */

import type { AliasSuggestionCommand } from '../types';
import { getMumeCommandMatch } from '../utils/mumeCommandCatalog';

// --- Logic Section ---
export const resolveAliasSuggestionCommand = (
    expansion: string | undefined, suffix: string
): AliasSuggestionCommand | null => {
    if (!expansion) return null;
    // A single trailing placeholder accepts the same arguments as an appended suffix.
    const prefix = expansion.trim().replace(/\s+&$/, '').trim();
    if (/[;&\\%]/.test(prefix)) return null;
    const match = /^(\S+)([\s\S]*)$/.exec(prefix);
    if (!match) return null;
    const token = getMumeCommandMatch(match[1]).entry?.full || match[1].toLowerCase();
    const fixedArguments = match[2].trim();
    const completeSpell = /^(?:cast|commune)$/.test(token) && /^(['"])[^'"]+\1$/.test(fixedArguments);
    const staged = /^(?:give|put|get|pour)$/.test(token) || (token === 'look' && fixedArguments === 'in');
    // Fixed targets (e.g. "close exit") already consume the argument slot.
    if (fixedArguments && !completeSpell && !staged) return null;
    const canonicalPrefix = `${token}${match[2]}`;
    return {
        command: `${canonicalPrefix}${suffix}`,
        token,
        argumentText: completeSpell ? suffix : `${match[2]}${suffix}`,
        prefix: canonicalPrefix
    };
};
