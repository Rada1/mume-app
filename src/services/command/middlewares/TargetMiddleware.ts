/**
 * @file TargetMiddleware.ts
 * @description Handles <target> substitution and intelligent auto-append for combat/magic verbs.
 */

import { CommandMiddleware } from '../types';

export const TargetMiddleware: CommandMiddleware = (cmd, { target }) => {
    let finalCmd = cmd;
    const hasTargetPlaceholder = /<target>/i.test(cmd);

    if (hasTargetPlaceholder) {
        if (target) {
            // Replace "<target>" with the actual name
            finalCmd = cmd.replace(/<target>/gi, target);
        } else {
            // Strip "<target>" and clean up double spaces/trailing space
            finalCmd = cmd.replace(/\s*<target>/gi, '').trim();
        }
        return finalCmd;
    } 
    
    if (target) {
        const lower = cmd.toLowerCase().trim();
        // Intelligent auto-append for common combat/magic prefixes if no explicit target provided
        const isCastOrSkill = lower.startsWith('cast ') || lower.startsWith('skill ');

        // Common standalone verbs that usually want a target if one is available
        const combatVerbs = ['kill', 'k', 'hit', 'bash', 'kick', 'trip', 'bs', 'backstab', 'murder', 'charge', 'circle', 'assist', 'rescue', 'shoot', 'throw', 'track', 'consider', 'examine', 'eat', 'drink', 'quaff', 'sip'];
        const isStandaloneCombat = combatVerbs.includes(lower);

        if (isCastOrSkill || isStandaloneCombat) {
            if (isCastOrSkill) {
                // Heuristic: if command is just 'cast "spell"' or 'skill "name"' with no extra word, append target
                const parts = lower.split(/\s+/);
                if (parts.length <= 2 || (parts[0] === 'cast' && parts.length <= 3 && cmd.includes("'"))) {
                    finalCmd = `${cmd.trim()} ${target}`;
                }
            } else {
                // Standalone combat verb - always append if we have a target
                finalCmd = `${cmd.trim()} ${target}`;
            }
            return finalCmd;
        }
    }

    return undefined; // No change
};
