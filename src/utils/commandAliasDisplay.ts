/** @file commandAliasDisplay.ts — Records server alias meaning without changing the command sent. */

import type { CommandAlias } from '../types';

// --- Logic Section ---
// MUME substitutes & with arguments; single-command aliases otherwise append them.
// Escaped &, ; and backslashes are literal. Multi-command aliases do not append arguments.
const expandAliasArguments = (expansion: string, suffix: string): string => {
    let result = '';
    let substitutesArguments = false;
    let multipleCommands = false;
    for (let index = 0; index < expansion.length; index += 1) {
        const character = expansion[index];
        if (character === '\\' && /[;&\\]/.test(expansion[index + 1] || '')) {
            result += expansion[++index];
        } else if (character === '&') {
            result += suffix.trim();
            substitutesArguments = true;
        } else {
            result += character;
            if (character === ';') multipleCommands = true;
        }
    }
    return `${result}${!substitutesArguments && !multipleCommands ? suffix : ''}`.trim();
};

export const getCommandAliasDisplay = (input: string, aliases: CommandAlias[]): string | null => {
    const match = /^(\S+)([\s\S]*)$/.exec(input.trim());
    if (!match) return null;
    const alias = aliases.find(entry => entry.name === match[1].toLowerCase());
    return alias ? expandAliasArguments(alias.expansion, match[2]) : null;
};
