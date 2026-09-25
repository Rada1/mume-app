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
                // Parse: cast <spell> [args] or skill <skill> [args]
                // Accounts for single-word, single-quoted, and double-quoted spell/skill names
                const match = cmd.match(/^(?:cast|skill)\s+(?:'([^']+)'|"([^"]+)"|(\S+))(?:\s+(.*))?$/i);
                if (match) {
                    const actionName = (match[1] || match[2] || match[3] || '').trim().toLowerCase();
                    const existingArgs = (match[4] || '').trim();

                    // Keyed spells (teleport, portal, scry, watch room) require magic keys, not combat targets
                    const isKeyed = ['teleport', 'portal', 'scry', 'watch room', 'tp', 'tele'].includes(actionName);

                    // Only auto-append target if no argument was provided and it's not a keyed spell
                    if (!existingArgs && !isKeyed) {
                        finalCmd = `${cmd.trim()} ${target}`;
                    }
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
