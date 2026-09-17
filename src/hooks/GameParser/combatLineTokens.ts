/**
 * @file combatLineTokens.ts
 * @description Formats combat line tokens for high-speed skimmability.
 * Emphasizes action verbs (bold), targets, anatomy, and damage outcomes (regular),
 * while dimming syntactic filler to minimize cognitive clutter during combat.
 */

import { Token, TextToken, EntityToken } from '../../types';

// --- Word Classifications ---

const COMBAT_VERBS = new Set([
    'pierce', 'pierces', 'pierced',
    'slash', 'slashes', 'slashed',
    'cleave', 'cleaves', 'cleaved',
    'crush', 'crushes', 'crushed',
    'stab', 'stabs', 'stabbed',
    'smite', 'smites', 'smote',
    'pound', 'pounds', 'pounded',
    'strike', 'strikes', 'struck',
    'hit', 'hits',
    'maul', 'mauls', 'mauled',
    'whip', 'whips', 'whipped',
    'shoot', 'shoots', 'shot',
    'blast', 'blasts', 'blasted',
    'bite', 'bites', 'bit',
    'claw', 'claws', 'clawed',
    'sting', 'stings', 'stung',
    'kick', 'kicks', 'kicked',
    'bash', 'bashes', 'bashed',
    'backstab', 'backstabs', 'backstabbed',
    'charge', 'charges', 'charged',
    'bludgeon', 'bludgeons', 'bludgeoned',
    'hack', 'hacks', 'hacked',
    'thrust', 'thrusts',
    'burn', 'burns', 'burned', 'burnt',
    'shock', 'shocks', 'shocked',
    'disarm', 'disarms', 'disarmed',
    'trip', 'trips', 'tripped',
    'rescue', 'rescues', 'rescued',
    'clobber', 'clobbers', 'clobbered',
    'smash', 'smashes', 'smashed',
    'grapple', 'grapples', 'grappled',
    'hurl', 'hurls', 'hurled', 'thrusted'
]);

const AVOID_DEFENSE_WORDS = new Set([
    'dodge', 'dodges', 'dodged',
    'parry', 'parries', 'parried',
    'block', 'blocks', 'blocked',
    'deflect', 'deflects', 'deflected',
    'evade', 'evades', 'evaded',
    'avoid', 'avoids', 'avoided',
    'miss', 'misses', 'missed',
    'fail', 'fails', 'failed',
    'sidestep', 'sidesteps', 'sidestepped'
]);

// --- Logic Section ---

/**
 * Formats tokens of a combat message into structured typography tokens.
 * - For hit and damage messages: only action verbs ("slash", "pierce", etc.) are 100% opacity (red/cyan).
 * - For miss and avoid messages: only defense/miss words ("parry", "fail", "avoid", etc.) are 100% opacity (regular color).
 * - Everything else is dimmed to the default 50% opacity (combat-dimmed).
 */
export function formatCombatLineTokens(tokens: Token[], isHitOrDamage?: boolean): Token[] {
    if (!tokens || tokens.length === 0) return tokens;

    const rawResult: Token[] = [];
    const fullText = tokens.map(t => t.content).join('').trim();
    const hasPlayerAvoid = /^(?:you|your)\b/i.test(fullText) && /\b(?:dodge|parry|block|evade|deflect)\b/i.test(fullText);
    const hasOpponentAvoid = !/^(?:you|your)\b/i.test(fullText) && /\b(?:dodges?|parries|blocks?|evades?|deflects?)\s+(?:your|attempt)\b/i.test(fullText);

    const hasAvoidOrMissWord = Array.from(AVOID_DEFENSE_WORDS).some(w => {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        return regex.test(fullText);
    }) || /\b(?:tries to|try to|attempt to)\b/i.test(fullText);

    const effectiveIsHitOrDamage = isHitOrDamage !== undefined
        ? isHitOrDamage
        : !hasAvoidOrMissWord;

    let isPlayerAttack = false;
    let isIncomingDamage = false;

    if (hasPlayerAvoid) {
        isIncomingDamage = true;
    } else if (hasOpponentAvoid) {
        isPlayerAttack = true;
    } else if (/^(?:you|your)\b/i.test(fullText)) {
        isPlayerAttack = true;
    } else if (/\b(?:you|your)\b/i.test(fullText)) {
        isIncomingDamage = true;
    }

    for (const token of tokens) {
        if (token.type === 'entity') {
            // If entity begins with leading article (e.g. "a Morgundul orc-guard"),
            // split off the article as dimmed and keep the core name as regular entity.
            const match = token.content.match(/^(a|an|the)\s+/i);
            if (match) {
                const article = match[0];
                const rest = token.content.slice(article.length);
                rawResult.push({
                    type: 'text',
                    content: article,
                    classes: ['combat-dimmed']
                } as TextToken);
                rawResult.push({
                    ...token,
                    content: rest
                } as EntityToken);
            } else {
                rawResult.push(token);
            }
            continue;
        }

        if (token.type === 'text' || token.type === 'ansi') {
            // Split into alphanumeric words vs non-alphanumeric separators
            const pieces = token.content.split(/([a-zA-Z0-9]+|[^a-zA-Z0-9]+)/).filter(Boolean);
            let currentDimmed = '';
            const dimmedClasses = [...(token.classes || []), 'combat-dimmed'];
            const dimmedStyle = token.style;

            const flushDimmed = () => {
                if (currentDimmed) {
                    rawResult.push({
                        type: 'text',
                        content: currentDimmed,
                        classes: dimmedClasses,
                        ...(dimmedStyle ? { style: dimmedStyle } : {})
                    } as TextToken);
                    currentDimmed = '';
                }
            };

            for (const piece of pieces) {
                const lower = piece.toLowerCase();
                const isWord = /^[a-zA-Z0-9]+$/.test(piece);

                if (!isWord) {
                    currentDimmed += piece;
                    continue;
                }

                if (effectiveIsHitOrDamage) {
                    // For hit and damage messages: ONLY strike verbs ("slash, pierce", etc.) are 100% opacity (red/cyan)
                    if (COMBAT_VERBS.has(lower)) {
                        flushDimmed();
                        const verbClasses = ['combat-verb'];
                        if (isPlayerAttack) {
                            verbClasses.push('combat-verb-player');
                        } else if (isIncomingDamage) {
                            verbClasses.push('combat-verb-incoming');
                        }
                        rawResult.push({
                            type: 'text',
                            content: piece,
                            classes: verbClasses
                        } as TextToken);
                    } else {
                        currentDimmed += piece;
                    }
                } else {
                    // For miss and avoid messages: ONLY defense/miss words ("parry, fail, avoid", etc.) are 100% opacity (regular color)
                    if (AVOID_DEFENSE_WORDS.has(lower)) {
                        flushDimmed();
                        rawResult.push({
                            type: 'text',
                            content: piece,
                            classes: ['combat-verb']
                        } as TextToken);
                    } else {
                        currentDimmed += piece;
                    }
                }
            }
            flushDimmed();
        } else {
            rawResult.push(token);
        }
    }

    // Merge adjacent dimmed text tokens to minimize DOM nodes
    const merged: Token[] = [];
    for (const t of rawResult) {
        const last = merged[merged.length - 1];
        if (
            last &&
            last.type === 'text' &&
            t.type === 'text' &&
            (last as TextToken).classes?.includes('combat-dimmed') &&
            (t as TextToken).classes?.includes('combat-dimmed')
        ) {
            last.content += t.content;
        } else {
            merged.push({ ...t });
        }
    }

    return merged;
}
