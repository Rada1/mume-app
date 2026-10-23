/** @file commandAliases.ts — Server alias imports and command suggestion contracts. */
import type { Message } from './game';

// --- Data Contracts ---
export interface CommandAlias {
    name: string;
    expansion: string;
}

export interface CommandAliasState {
    aliases: CommandAlias[];
    pending: CommandAlias[] | null;
    error: string | null;
    begin: () => void;
    cancel: (error?: string) => void;
    reset: () => void;
    receive: (line: string) => 'ignored' | 'row' | 'complete' | 'invalid';
}

export interface MumeCommandEntry {
    display: string;
    minimum: string;
    full: string;
    aliasExpansion?: string;
}

export interface MumeCommandMatch {
    entry: MumeCommandEntry | null;
    suggestions: MumeCommandEntry[];
    token: string;
    suffix: string;
    isValid: boolean;
}

export interface SentCommandTextProps {
    message: Pick<Message, 'textRaw' | 'tokens' | 'aliasCommandDisplay'>;
}

export interface AliasSuggestionCommand {
    command: string;
    token: string;
    argumentText: string;
    prefix: string;
}
