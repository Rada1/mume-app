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
    'dodge', 'dodges', 'dodged',
    'parry', 'parries', 'parried',
    'block', 'blocks', 'blocked',
    'flee', 'flees', 'fled',
    'disarm', 'disarms', 'disarmed',
    'trip', 'trips', 'tripped',
    'rescue', 'rescues', 'rescued'
]);

const COMBAT_OUTCOMES = new Set([
    'miss', 'misses', 'missed',
    'tick', 'ticks', 'ticked',
    'tickle', 'tickles', 'tickled',
    'scratch', 'scratches', 'scratched',
    'graze', 'grazes', 'grazed',
    'bruise', 'bruises', 'bruised',
    'hurt', 'hurts',
    'wound', 'wounds', 'wounded',
    'decimate', 'decimates', 'decimated',
    'devastate', 'devastates', 'devastated',
    'mutilate', 'mutilates', 'mutilated',
    'massacre', 'massacres', 'massacred',
    'obliterate', 'obliterates', 'obliterated',
    'annihilate', 'annihilates', 'annihilated',
    'kill', 'kills', 'killed', 'dead',
    'severely', 'extremely', 'strongly', 'barely', 'hard', 'lightly', 'badly', 'critically', 'cleanly', 'skillfully'
]);

const ANATOMY_WORDS = new Set([
    'head', 'skull', 'neck', 'throat', 'face', 'eye', 'eyes', 'ear', 'ears', 'nose', 'mouth', 'jaw', 'snout', 'beak', 'fang', 'fangs',
    'body', 'chest', 'torso', 'back', 'spine', 'ribs', 'stomach', 'abdomen', 'waist', 'groin', 'flank',
    'shoulder', 'shoulders', 'arm', 'arms', 'elbow', 'elbows', 'forearm', 'forearms', 'wrist', 'wrists', 'hand', 'hands', 'finger', 'fingers',
    'hip', 'hips', 'thigh', 'thighs', 'leg', 'legs', 'knee', 'knees', 'calf', 'calves', 'shin', 'shins', 'ankle', 'ankles', 'foot', 'feet', 'toe', 'toes', 'hoof', 'hooves',
    'wing', 'wings', 'tail', 'tails', 'claw', 'claws', 'tentacle', 'tentacles'
]);

// --- Logic Section ---

/**
 * Formats tokens of a combat message into structured typography tokens.
 * - Action verb: BOLD (combat-verb)
 * - Subject ('you'), Target entity, Anatomy noun, Damage tier: REGULAR (combat-regular / entity)
 * - Syntactic glue, lateral adjectives, punctuation: DIMMED (combat-dimmed)
 */
export function formatCombatLineTokens(tokens: Token[]): Token[] {
    if (!tokens || tokens.length === 0) return tokens;

    const rawResult: Token[] = [];
    let hasVerb = false;

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

            const flushDimmed = () => {
                if (currentDimmed) {
                    rawResult.push({
                        type: 'text',
                        content: currentDimmed,
                        classes: ['combat-dimmed']
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

                if (lower === 'you') {
                    flushDimmed();
                    rawResult.push({
                        type: 'text',
                        content: piece,
                        classes: ['combat-regular']
                    } as TextToken);
                } else if (!hasVerb && COMBAT_VERBS.has(lower)) {
                    hasVerb = true;
                    flushDimmed();
                    rawResult.push({
                        type: 'text',
                        content: piece,
                        classes: ['combat-verb']
                    } as TextToken);
                } else if (ANATOMY_WORDS.has(lower)) {
                    flushDimmed();
                    rawResult.push({
                        type: 'text',
                        content: piece,
                        classes: ['combat-regular']
                    } as TextToken);
                } else if (COMBAT_OUTCOMES.has(lower) || (hasVerb && COMBAT_VERBS.has(lower))) {
                    flushDimmed();
                    rawResult.push({
                        type: 'text',
                        content: piece,
                        classes: ['combat-regular']
                    } as TextToken);
                } else {
                    // Lateral modifiers (left, right), articles, prepositions, connectors etc.
                    currentDimmed += piece;
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
