/**
 * @file commandFeedbackUtils.ts
 * @description Matching utilities for mapping executed game commands to UI button slots
 * (CommandDeck items, SkillsDeck items, and QuickButtonBar chips) to trigger visual button press feedback.
 */

export interface DeckItemLike {
    label: string;
    cmd: string;
}

export interface SkillItemLike {
    label: string;
    practiceName: string;
    cmd: string;
}

// --- Logic Section ---

/** CommandDeck action aliases and abbreviations */
const DECK_ALIASES: Record<string, string[]> = {
    Kill: ['kill', 'k'],
    Flee: ['flee', 'fl'],
    Consider: ['consider', 'con', 'cons'],
    Assist: ['assist', 'ass'],
    Say: ['say'],
    Narrate: ['narrate', 'nar'],
    Gtell: ['gtell', 'gt'],
    Yell: ['yell'],
    Tell: ['tell', 't'],
    Emote: ['emote', 'em'],
    Score: ['score', 'sc'],
    Inventory: ['inventory', 'inv', 'i'],
    Equipment: ['equipment', 'eq'],
    Time: ['time'],
    Weather: ['weather', 'wea'],
    Group: ['group', 'gro'],
    Who: ['who', 'wh'],
    Affects: ['affects', 'aff'],
    Watch: ['watch', 'wat'],
    Camp: ['camp'],
    'Camp Rent': ['camp rent'],
    'Drink Water': ['drink water', 'drink']
};

/** Common abbreviations for class skills */
const SKILL_ALIASES: Record<string, string[]> = {
    backstab: ['backstab', 'bs'],
    bandage: ['bandage', 'band'],
    rescue: ['rescue', 'res'],
    track: ['track', 'tra'],
    attack: ['attack', 'att'],
    command: ['command', 'com'],
    envenom: ['envenom', 'env'],
    sneak: ['sneak', 'sn'],
    search: ['search', 'sea'],
    charge: ['charge', 'char']
};

/**
 * Checks whether an executed command matches a CommandDeck item.
 */
export const doesCommandMatchDeckItem = (executedCmd: string, item: DeckItemLike): boolean => {
    const raw = executedCmd.trim().toLowerCase();
    if (!raw) return false;

    // Special prefix syntaxes
    if (item.label === 'Say' && (raw.startsWith("'") || raw.startsWith('say ') || raw === 'say')) {
        return true;
    }
    if (item.label === 'Emote' && (raw.startsWith(':') || raw.startsWith('emote ') || raw === 'emote' || raw.startsWith('em ') || raw === 'em')) {
        return true;
    }

    // Special check for Camp vs Camp Rent
    if (item.label === 'Camp') {
        if (raw.startsWith('camp rent')) return false;
        return raw === 'camp' || raw.startsWith('camp ');
    }
    if (item.label === 'Camp Rent') {
        return raw === 'camp rent' || raw.startsWith('camp rent ');
    }

    // Check known aliases
    const aliases = DECK_ALIASES[item.label];
    if (aliases) {
        const firstToken = raw.split(/\s+/)[0];
        for (const alias of aliases) {
            if (alias.includes(' ')) {
                if (raw === alias || raw.startsWith(`${alias} `)) return true;
            } else {
                if (firstToken === alias) return true;
            }
        }
    }

    // Fallback: check command definition
    const base = item.cmd.trim().toLowerCase();
    if (!base) return false;
    if (item.cmd.endsWith(' ')) {
        return raw === base || raw.startsWith(`${base} `);
    }
    return raw === base;
};

/**
 * Helper to match spell names inside quotes or unquoted.
 */
const matchesSpellQuery = (spellQuery: string, practiceName: string): boolean => {
    if (spellQuery === practiceName) return true;
    const qWords = spellQuery.split(/\s+/).filter(Boolean);
    const pWords = practiceName.split(/\s+/).filter(Boolean);
    if (qWords.length === 0 || pWords.length === 0) return false;
    if (qWords.length === pWords.length) {
        return qWords.every((qw, idx) => pWords[idx].startsWith(qw));
    }
    return false;
};

/**
 * Checks whether an executed command matches a SkillsDeck item.
 */
export const doesCommandMatchSkill = (executedCmd: string, skill: SkillItemLike): boolean => {
    const raw = executedCmd.trim().toLowerCase();
    if (!raw) return false;

    const practiceName = skill.practiceName.trim().toLowerCase();
    const isSpell = skill.cmd.toLowerCase().startsWith("cast '");

    if (isSpell) {
        if (!raw.startsWith('cast ') && !raw.startsWith('c ') && raw !== 'cast' && raw !== 'c') {
            return false;
        }
        const spaceIdx = raw.indexOf(' ');
        if (spaceIdx === -1) return false;
        const rest = raw.slice(spaceIdx + 1).trim();

        // Check quoted spell syntax: cast '...' or c '...'
        if (rest.startsWith("'")) {
            const closingQuote = rest.indexOf("'", 1);
            if (closingQuote !== -1) {
                const query = rest.slice(1, closingQuote).trim();
                return matchesSpellQuery(query, practiceName);
            }
        }

        // Check unquoted spell syntax: cast magic missile orc or c magic missile
        if (matchesSpellQuery(rest, practiceName)) return true;
        if (rest.startsWith(practiceName)) {
            const charAfter = rest[practiceName.length];
            return !charAfter || charAfter === ' ';
        }
        return false;
    }

    // Combat/general skill syntax (e.g. "bandage target", "band target", "bash", "bs orc")
    const firstToken = raw.split(/\s+/)[0];
    const aliases = SKILL_ALIASES[practiceName] || [practiceName];

    for (const alias of aliases) {
        if (alias.includes(' ')) {
            if (raw === alias || raw.startsWith(`${alias} `)) return true;
        } else {
            if (firstToken === alias) return true;
        }
    }

    return false;
};

/**
 * Checks whether an executed command matches a QuickButtonBar chip.
 */
export const doesCommandMatchQuickButton = (executedCmd: string, btnCommand: string): boolean => {
    const e = executedCmd.trim().toLowerCase();
    const b = btnCommand.trim().toLowerCase();
    if (!e || !b) return false;

    if (e === b) return true;
    if (e.startsWith(`${b} `)) return true;
    if (b.startsWith(`${e} `)) return true;

    // Check first word equality for single-word command buttons (e.g. "kill" matching "kill troll")
    const eFirst = e.split(/\s+/)[0];
    const bFirst = b.split(/\s+/)[0];
    if (eFirst === b && bFirst === b) return true;

    return false;
};
