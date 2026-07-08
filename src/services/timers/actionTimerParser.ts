/**
 * @file actionTimerParser.ts
 * @description Intercepts commands and parses incoming lines to manage action and spell casting timers.
 */

import { useActionTimerStore } from '../../stores/useActionTimerStore';

const PENDING_TTL_MS = 6000;

// Visual reference scale is set to a constant 10 seconds (10000ms) for all actions,
// acting as a uniform stopwatch ruler.


// --- Logic Section ---

export const recordActionTimerCommand = (command: string) => {
    const clean = command.trim().toLowerCase();
    console.log('[ActionTimer] recordActionTimerCommand:', clean);
    
    // Spells
    if (/^(?:cast|c|commune|pray)\b/.test(clean)) {
        const match = clean.match(/^(?:cast|c|commune|pray)\s+['"]?([^'"]+)['"]?/i);
        if (match && match[1]) {
            const spellName = match[1].trim();
            const formattedName = spellName.charAt(0).toUpperCase() + spellName.slice(1);
            useActionTimerStore.getState().setPendingAction(`Casting: ${formattedName}`, 'spell');
        }
    } 
    // Bandage
    else if (/^band\b|^bandage\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Bandaging', 'skill');
    }
    // Bash - Bashes trigger immediately on command send, as they lag the player instantly.
    else if (/^bash\b/i.test(clean)) {
        useActionTimerStore.getState().startTimer('Bash', 'skill', 10000);
    }
    // Pick
    else if (/^pick\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Picking lock', 'skill');
    }
    // Search
    else if (/^sear\b|^search\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Searching', 'general');
    }
    // Subdue
    else if (/^subdue\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Subduing', 'skill');
    }
    // Track
    else if (/^track\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Tracking', 'skill');
    }
    // Camp
    else if (/^camp\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Camping', 'general');
    }
    // Meditate
    else if (/^meditate\b/i.test(clean)) {
        useActionTimerStore.getState().setPendingAction('Meditating', 'general');
    }
    // Generic Commands fallback
    else if (clean.length > 0) {
        const isDirection = /^(?:n|s|e|w|u|d|north|south|east|west|up|down)$/i.test(clean);
        const isCombat = /^(?:k|kill|hit)$/i.test(clean);
        if (!isDirection && !isCombat) {
            const displayName = command.charAt(0).toUpperCase() + command.slice(1);
            useActionTimerStore.getState().startTimer(displayName, 'general', 500);
        }
    }
};

export const parseActionTimerLine = (text: string) => {
    const store = useActionTimerStore.getState();
    const pending = store.pendingAction;
    const active = store.activeTimer;
    console.log('[ActionTimer] parseActionTimerLine:', text, 'pending:', pending, 'active:', active);

    // 1. Transition pending to active on start patterns
    if (pending && Date.now() - pending.sentAt < PENDING_TTL_MS) {
        let matched = false;

        if (pending.type === 'spell') {
            if (/you start to concentrate|you begin to speak|you start to pray/i.test(text)) {
                matched = true;
            }
        } else {
            // Skill or general
            if (pending.name === 'Bandaging' && /you start to bandage/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Picking lock' && /you start to pick/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Searching' && /you (?:start searching|begin to search)/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Subduing' && /you start to subdue/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Tracking' && /you (?:start to search for tracks|begin to track)/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Camping' && /you start to camp|you begin to camp/i.test(text)) {
                matched = true;
            } else if (pending.name === 'Meditating' && /you start to meditate/i.test(text)) {
                matched = true;
            }
        }

        if (matched) {
            store.startTimer(pending.name, pending.type, 10000);
            return true;
        }
    }

    // 2. Clear active timers on cancel/interrupt/completion patterns
    if (active && !active.isFinished) {
        // Interrupt / Fail lines
        if (/lost your concentration|failed|nothing seems to happen|you can't|you cannot|interrupted|stop bandaging|too exhausted|already bashed|aren't we funny/i.test(text)) {
            store.completeTimer(true);
            return true;
        }

        // Spell completion success indicators
        if (active.type === 'spell' && /you feel|ok\.|your spell|you begin to feel|you conjure|a blue transparent wall|a white aura/i.test(text.toLowerCase())) {
            store.completeTimer(false);
            return true;
        }

        // Action specific completion success lines
        if (active.name === 'Bandaging' && /you bandage|you wrap a bandage/i.test(text)) {
            store.completeTimer(false);
            return true;
        }

        if (active.name === 'Bash' && /you slam into|you send.*sprawling|sprawling/i.test(text)) {
            store.completeTimer(false);
            return true;
        }
    }

    return false;
};
