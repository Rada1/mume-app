/**
 * @file commandTargetUtils.ts
 * @description Utilities to detect targetable MUME commands and format commands with targets.
 */

// --- Logic Section ---
import { TARGETED_SKILLS } from './practiceClassCatalog';
import { getSpellSyntax } from './spellSyntaxUtils';
import { sanitizeGameTarget } from './gameUtils';

const TARGETED_VERBS = new Set([
    'kill', 'consider', 'assist', 'bash', 'kick', 'backstab',
    'charge', 'rescue', 'bandage', 'track', 'order', 'shoot',
    'hit', 'target', 'steal', 'envenom', 'examine', 'look',
    'disarm'
]);

/**
 * Checks if a given MUME command string accepts a target entity.
 */
export const canCommandAcceptTarget = (command: string): boolean => {
    if (!command || !command.trim()) return false;
    const trimmed = command.trim();

    // Explicit wildcard target placeholder
    if (trimmed.includes('%n')) return true;

    // Check for quoted spell: cast 'fireball' or c 'fireball' or commune 'bless'
    const spellMatch = trimmed.match(/^(?:cast|c|commune)\s+'([^']+)'/i);
    if (spellMatch) {
        const spellName = spellMatch[1].trim().toLowerCase();
        if (TARGETED_SKILLS.has(spellName)) return true;
        const syntax = getSpellSyntax(spellName);
        return syntax.includes('<target>');
    }

    // Check for targeted combat/skill verbs
    const verbMatch = trimmed.match(/^([a-zA-Z]+)(?:\s+.*)?$/);
    if (verbMatch) {
        const verb = verbMatch[1].toLowerCase();
        if (TARGETED_VERBS.has(verb)) return true;
        if (TARGETED_SKILLS.has(verb)) return true;
    }

    return false;
};

/**
 * Applies a target to a command string if the command accepts a target.
 * If command already has %n, replaces %n.
 * If command does not have %n and is targeted, appends the target unless already present.
 */
export const applyTargetToCommand = (command: string, target: string | null): string => {
    if (!command || !command.trim()) return command;
    const cleanTarget = target ? (sanitizeGameTarget(target) || target.trim()) : null;

    // Handle %n wildcard
    if (command.includes('%n')) {
        if (command.match(/%n\|/)) {
            return command.replace(/%n\|([^\s]+)/g, (_match, fallback) => {
                return cleanTarget || fallback;
            });
        }
        if (cleanTarget) {
            return command.replace(/%n/g, cleanTarget);
        }
        return command.replace(/\s*%n/g, '').trim();
    }

    if (!cleanTarget) return command.trim();

    // If the command cannot accept a target (e.g. 'flee', 'score', 'shroud'), leave as-is
    if (!canCommandAcceptTarget(command)) {
        return command;
    }

    const trimmed = command.trim();

    // Quoted spell: cast 'fireball' -> cast 'fireball' orc
    const spellMatch = trimmed.match(/^((?:cast|c|commune)\s+'[^']+')(?:\s+(.*))?$/i);
    if (spellMatch) {
        const base = spellMatch[1];
        const existingArg = (spellMatch[2] || '').trim();
        // If an explicit target was already attached (e.g. cast 'fireball' guard), replace it or keep
        return `${base} ${cleanTarget}`;
    }

    // Verb command: bash -> bash orc, kill -> kill orc
    const verbMatch = trimmed.match(/^([a-zA-Z]+)(?:\s+(.*))?$/);
    if (verbMatch) {
        const verb = verbMatch[1];
        return `${verb} ${cleanTarget}`;
    }

    return `${trimmed} ${cleanTarget}`;
};
