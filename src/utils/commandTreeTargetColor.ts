/** @file commandTreeTargetColor.ts — Stable identity and color for the current player in target menus. */

import { stripAnsiCodes } from './ansi';

export const COMMAND_TREE_SELF_COLOR = '#38bdf8';

export interface CommandTreeTargetIdentity {
    id?: string;
    category?: string;
    label?: string;
    displayName?: string;
    context?: string;
    keyword?: string;
}

// --- Logic Section ---
const normalizeTargetName = (value?: string | null) => stripAnsiCodes(value || '')
    .replace(/^\d+\./, '').replace(/\s+\(\d+\)$/, '').trim().toLocaleLowerCase();

export const isCommandTreeSelfTarget = (target: CommandTreeTargetIdentity, characterName?: string | null) => {
    if (target.id === 'command-panel-self' || target.context?.trim().toLowerCase() === 'self'
        || target.keyword?.trim().toLowerCase() === 'self') return true;

    const playerName = normalizeTargetName(characterName);
    const targetName = normalizeTargetName(target.label || target.displayName || target.context);
    const isRoomCharacter = target.id?.startsWith('roomchars:') === true;
    return (target.category === 'cat-ally' || isRoomCharacter)
        && Boolean(playerName) && targetName === playerName;
};
