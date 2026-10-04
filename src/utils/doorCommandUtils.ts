/** @file doorCommandUtils.ts — Shared checks for commands that require a room door. */

// --- Logic Section ---
export const isDoorPresenceSpellCommand = (command: string): boolean => {
    const normalized = command.trim().toLowerCase().replace(/^(?:cast|c|commune)\s+/, '');
    const quotedSpell = normalized.match(/^(['"])(.*?)\1/)?.[2];
    return /^(?:block door|break door)(?:\s|$)/.test(quotedSpell || normalized);
};
