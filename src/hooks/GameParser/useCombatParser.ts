/**
 * @file useCombatParser.ts
 * @description Detects combat events, side determination, and experience tickers.
 */

import { useCallback } from 'react';
import { GroupMember, CharacterInfo, CombatHealthStatus } from '../../types';
import {
    recordCombatRechargeBlockedLine,
    recordCombatRechargeConfirmation,
    recordOpponentCombatRechargeConfirmation
} from '../../stores/useCombatRechargeStore';
import {
    isOpponentFailedAttackLine,
    isPlayerAttemptAvoidedLine,
    isPlayerFailedAttackLine,
    extractDeadMobName
} from '../../utils/combatRechargeUtils';
import { triggerKillPrompt } from '../../stores/useKillPromptStore';
import { gmcpBus } from '../../events/gmcpBus';
import { getNearbyCombatImpact } from './nearbyCombatAudio';
import { useXpTickerParser } from './useXpTickerParser';
import { stripAnsiControlSequences } from '../../utils/ansi';

export interface CombatParserDeps {
    inCombatRef: React.RefObject<boolean>;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    triggerXpTicker?: (xp?: number) => void;
    triggerTpTicker?: (tp?: number) => void;
    groupMembers: GroupMember[];
    mapperRef?: React.RefObject<any>;
    setDeathRoomId?: (val: string | null) => void;
    spectateCharacterName?: string | null;
    roomPlayers?: import('../../types').GmcpOccupant[];
    // Spectate setters
    setSpectateInCombat?: (val: boolean, force?: boolean) => void;
    setSpectateOpponentName?: (val: string | null) => void;
    setSpectateOpponentStatus?: (val: CombatHealthStatus | null) => void;
    playKillSound?: (options?: { pitch?: number, volume?: number }) => void;
    playLevelSound?: (options?: { pitch?: number, volume?: number }) => void;
    playHitImpactSound?: (options?: { pitch?: number, volume?: number } | string) => void;
    playOofSound?: () => void;
    playEffect?: (name: string, options?: any) => void;
    playArrowHitSound?: (options?: { pitch?: number, volume?: number }) => void;
    playSpectateHitImpactSound?: (options?: { pitch?: number, volume?: number } | string) => void;
    playSpectateOofSound?: () => void;
    playSpectateNearbyCombatSound?: (name: string, options?: { filterFrequency?: number, volumeMultiplier?: number }) => void;
    setInCombat?: (inCombat: boolean, force?: boolean) => void;
    characterName?: string | null;
    addMessage?: (type: any, text: string) => void;
    isSpectateMode?: boolean;
}

const COMBAT_VERBS_STR = ['hit', 'miss', 'wound', 'kill', 'maul', 'pierce', 'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shocked', 'stunned', 'blinded', 'silenced', 'hurt', 'die', 'fighting', 'recovered', 'shoot', 'shoots', 'blast', 'shatters', 'joins?', 'assists?', 'dodge', 'dodges', 'parry', 'parries', 'deflect', 'deflects', 'evade', 'evades', 'blocks?', 'avoids?', 'fails?', 'failed'].join('|');
const COMBAT_REGEX = new RegExp(`\\b(${COMBAT_VERBS_STR})(?:es|s)?\\b`, 'i');
const BACKSTAB_MESSAGE_REGEX = /\bmakes a strange sound,\s*as you place\b/i;
const COMBAT_DAMAGE_SOUND_BY_VERB: Record<string, string> = { hit: 'hit2', stab: 'stab', backstab: 'backstab', slash: 'slash', crush: 'crushpound', pound: 'crushpound', bash: 'bash', cleave: 'cleave', pierce: 'pierce', smite: 'smite', shoot: 'arrowhit', shoots: 'arrowhit' };

export function useCombatParser(deps: CombatParserDeps) {
    const {
        inCombatRef, setOpponentHealthStatus, setOpponentName, setCharacterInfo,
        triggerXpTicker, triggerTpTicker, groupMembers, mapperRef, setDeathRoomId,
        spectateCharacterName, roomPlayers, setSpectateInCombat, setSpectateOpponentName,
        setSpectateOpponentStatus, playKillSound, playLevelSound, playEffect, characterName
    } = deps;

    const checkCombatMatch = useCallback((lower: string, isSnoop: boolean = false, cleanLine?: string) => {
        // Exclude specific flavor text that shouldn't be combat
        if (lower.includes('hissing shriek') || lower.includes('the nine')) return { isMatch: false };

        // Strip leading spaces and asterisks (damage indicators in MUME)
        const cleanLower = lower.replace(/^[\s\*]+/, '').trim();
        const isBackstabMessage = BACKSTAB_MESSAGE_REGEX.test(cleanLower);
        if (
            /\b(?:looms?\s+(?:overhead|above)|ready\s+to\s+\w+|\b(?:is|are)\s+(?:here|(?:standing|sitting|resting|sleeping|fighting|lying|hovering|floating|perched|waiting|lurking)\s+here))\b/i.test(cleanLower) ||
            /\b(?:practice sessions left|skill\s*\/\s*spell|difficulty\s+class)\b/i.test(cleanLower) ||
            /\b(?:superb|excellent|very good|good|fair|average|bad|poor|very bad|awful|not learned)\s+(?:very easy|easy|normal|hard|very hard)\b/i.test(cleanLower)
        ) return { isMatch: false };

        const hasCombatTag = !!cleanLine && (
            cleanLine.includes('<hit>') || cleanLine.includes('<damage>') ||
            /<avoid_damage\b/i.test(cleanLine) || /<miss\b/i.test(cleanLine)
        );
        const isSpecificChargeOrShoot = /^you (?:charge|shoot)\b/i.test(cleanLower) || /\bcharges? (?:at|towards) you\b/i.test(cleanLower);
        const hasXmlTag = !!cleanLine && /<[a-zA-Z_]+[ >]/i.test(cleanLine);
        const nearbyCombat = !hasCombatTag ? getNearbyCombatImpact(cleanLower, [characterName, spectateCharacterName]) : undefined;
        const nearbyCombatVerb = nearbyCombat?.verb;
        if (hasXmlTag && !hasCombatTag && !isSpecificChargeOrShoot && !isBackstabMessage && !nearbyCombat) return { isMatch: false };
        const isMatch = isBackstabMessage || hasCombatTag || isSpecificChargeOrShoot || isPlayerAttemptAvoidedLine(cleanLower) || isPlayerFailedAttackLine(cleanLower) || isOpponentFailedAttackLine(cleanLower) || (!nearbyCombat && !/\bhit points?\b/i.test(cleanLower) && inCombatRef.current && (COMBAT_REGEX.test(cleanLower) || cleanLower.includes('dodge') || cleanLower.includes('parry') || cleanLower.includes('flee') || cleanLower.includes('fail')));
        
        if (!isMatch) return { isMatch: false, isNearbyCombatImpact: !!nearbyCombat, isDirectCombatImpact: !!nearbyCombat?.isDirect, verb: nearbyCombatVerb };

        const impactVerbs = ['hit', 'pierce', 'slash', 'smite', 'crush', 'pound', 'stab', 'cleave', 'maul', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shoot', 'shock', 'blast', 'struck', 'burn', 'chill', 'acid', 'poison'];
        
        // Use regex with word boundaries for more robust matching regardless of punctuation
        const impactRegex = new RegExp(`\\b(${impactVerbs.join('|')})(?:es|s)?\\b`, 'i');
        // A combat line is an impact only if it matches an impact verb AND doesn't mention avoidance
        const isImpact = (isBackstabMessage || impactRegex.test(cleanLower)) && !/\b(miss|dodge|parry|evade|avoid|blocks?)\b/i.test(cleanLower);

        // Determine side and target
        let side: 'player' | 'opponent' | 'groupmate' | undefined = undefined;
        let isPlayerTarget = false;
        let groupNameMatch = '';

        if (cleanLower.startsWith('you ') || cleanLower.startsWith('your ')) {
            side = 'player';
        } else {
            // Check if any group member name starts the line
            const pcNames = (roomPlayers || []).map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean) as string[];
            const extraNames = [];
            if (spectateCharacterName) extraNames.push(spectateCharacterName);
            extraNames.push(...((groupMembers || []).map(m => m.name).filter(Boolean) as string[]));
            
            const allAllies = Array.from(new Set([...pcNames, ...extraNames]));
            const gName = allAllies.find(name => {
                const lowerName = name.toLowerCase();
                return cleanLower.startsWith(lowerName + ' ') || 
                       cleanLower.startsWith(lowerName + '(') || 
                       cleanLower.startsWith(lowerName + ' (');
            });
            if (gName) groupNameMatch = gName;
            
            if (groupNameMatch) {
                side = 'groupmate';
            } else {
                side = 'opponent';
                const spectateTargetLower = spectateCharacterName?.toLowerCase();
                isPlayerTarget = /\b(you|your)\b/i.test(cleanLower) || (!!spectateTargetLower && cleanLower.includes(spectateTargetLower));
            }
        }
        if (isPlayerAttemptAvoidedLine(cleanLower) || isPlayerFailedAttackLine(cleanLower)) {
            side = 'player';
            isPlayerTarget = false;
        } else if (isOpponentFailedAttackLine(cleanLower)) {
            side = 'opponent';
            isPlayerTarget = true;
        }
        const modifiers = ['extremely hard', 'very hard', 'hard', 'strongly', 'lightly', 'barely'];
        const modifier = modifiers.find(m => cleanLower.includes(m));
        
        const verbMatch = cleanLower.match(impactRegex);
        const verb = isBackstabMessage ? 'backstab' : verbMatch ? verbMatch[1].toLowerCase() : undefined;

        const isMainActor = (side === 'player') || (side === 'groupmate' && !!spectateCharacterName && groupNameMatch.toLowerCase() === spectateCharacterName.toLowerCase());

        return { isMatch: true, side, isImpact, modifier, verb, isPlayerTarget, isMainActor };
    }, [inCombatRef, groupMembers, spectateCharacterName, roomPlayers, characterName]);

    // --- Logic Section: Combat Exit and Death ---
    const handleCombatExit = useCallback((lower: string, isSnoop: boolean = false, originalText?: string) => {
        const isDeathMessage = /^you are dead!$/i.test(lower.trim());
        if (!isSnoop && isDeathMessage) {
            playEffect?.('death'); gmcpBus.emit('Game.PlayerDeath', undefined);
        }

        if (/\bis dead!\s*r\.?i\.?p/i.test(lower) && (!isSnoop || deps.isSpectateMode)) {
            playKillSound?.();
            // Fire the loot prompt off the R.I.P. line directly — by the time this
            // line is parsed, GMCP has usually already cleared the fighting position,
            // so we can't rely on inCombatRef being true here.
            const deadName = extractDeadMobName(originalText ?? lower);
            if (deadName) triggerKillPrompt(deadName);
        }

        const normalizedLower = stripAnsiControlSequences(lower)
            .replace(/^[\s>*]+/, '')
            .trim();
        const isFlee = /^you flee\b/i.test(normalizedLower);
        if (isFlee && isSnoop && deps.isSpectateMode) {
            if (deps.playSpectateNearbyCombatSound) deps.playSpectateNearbyCombatSound('flee');
            else playEffect?.('flee');
        } else if (isFlee && !isSnoop) {
            playEffect?.('flee');
        }
        const isDeath = /you (?:have )?sl(?:ay|ew|ain)\b/i.test(lower) || /\bis dead!\s*r\.?i\.?p/i.test(lower);
        const isCombatEnd = isDeath || isFlee || /\bflees\s/i.test(lower) || /you stop fighting/i.test(lower);

        if (isDeathMessage && setDeathRoomId && mapperRef?.current) {
            const currentRoom = mapperRef.current.getCurrentRoom?.();
            if (currentRoom?.id) setDeathRoomId(currentRoom.id.toString());
        }

        if (isCombatEnd) {
            if (isSnoop && setSpectateInCombat) {
                setSpectateInCombat(false, true);
                setSpectateOpponentStatus?.(null);
                setSpectateOpponentName?.(null);
            } else {
                setOpponentHealthStatus(null);
                setOpponentName(null);
            }
            return true;
        }
        return false;
    }, [inCombatRef, setOpponentHealthStatus, setOpponentName, setDeathRoomId, mapperRef, setSpectateInCombat, setSpectateOpponentStatus, setSpectateOpponentName, playKillSound, playEffect]);

    const handleXpTicker = useXpTickerParser({
        setCharacterInfo,
        triggerXpTicker,
        triggerTpTicker,
        playLevelSound,
        isSpectateMode: deps.isSpectateMode
    });

    // --- Logic Section: Combat Line Parsing ---
    const parseCombatLine = useCallback((textOnly: string, cleanLine: string, isSnoop: boolean = false): any => {
        const lower = textOnly.toLowerCase();
        if (!isSnoop) recordCombatRechargeBlockedLine(textOnly);

        // 1. Detect Combat Exit/Death
        if (handleCombatExit(lower, isSnoop, textOnly)) return 'game';

        // 2. Detect XP Ticker
        if (handleXpTicker(lower, isSnoop)) return 'game';

        // 3. Detect Combat Match
        const match = checkCombatMatch(lower, isSnoop, cleanLine);
        const nearbySound = match.isNearbyCombatImpact ? (COMBAT_DAMAGE_SOUND_BY_VERB[match.verb] || 'hit2') : undefined;
        const nearbyOptions = { filterFrequency: 900, volumeMultiplier: match.isDirectCombatImpact ? 1 : 0.25 };
        if (nearbySound) (isSnoop ? deps.isSpectateMode && deps.playSpectateNearbyCombatSound?.(nearbySound, nearbyOptions) : deps.playEffect?.(nearbySound, nearbyOptions));
        if (match.isMatch) {
            const hasHitTag = cleanLine.includes('<hit>');
            const hasDamageTag = cleanLine.includes('<damage>');
            const hasAvoidDamageTag = /<avoid_damage\b/i.test(cleanLine);
            const hasMissTag = /<miss\b/i.test(cleanLine);
            const isBackstabMessage = BACKSTAB_MESSAGE_REGEX.test(lower.trim());
            const isPlayerAvoidedAttempt = isPlayerAttemptAvoidedLine(lower);
            const isPlayerFailedAttack = isPlayerFailedAttackLine(lower);
            const isOpponentFailedAttack = isOpponentFailedAttackLine(lower);

            const cleanLower = lower.replace(/^[\s\*]+/, '').trim();
            const isPlayerShoot = /^you shoot\b/i.test(cleanLower);
            const isUserInvolved = match.side === 'player' || match.isPlayerTarget;
            const isMissOrAvoid = hasMissTag || hasAvoidDamageTag || isPlayerAvoidedAttempt || isPlayerFailedAttack || isOpponentFailedAttack || /\byou miss\b/i.test(lower) || /\bmisses you\b/i.test(lower) || /\byou (?:dodge|parry|deflect|evade|block|avoid)\b/i.test(lower) || (isPlayerShoot && /\b(?:miss|misses|missed|fails?)\b/i.test(lower));
            const isPlayerShootHit = isPlayerShoot && !isMissOrAvoid && (hasHitTag || !lower.includes(' shoot at '));
            const combatDamageSound = match.verb ? COMBAT_DAMAGE_SOUND_BY_VERB[match.verb] : undefined;
            const isDirectSpectateCombat = match.side === 'player' || match.isPlayerTarget || match.isMainActor;
            const spectateImpactOptions = isDirectSpectateCombat
                ? undefined
                : { filterFrequency: 900, volumeMultiplier: 0.25 };

            const playArrowHit = () => {
                if (deps.playArrowHitSound) deps.playArrowHitSound();
                else deps.playEffect?.('arrowhit');
            };

            if (combatDamageSound && (hasHitTag || hasDamageTag || isBackstabMessage) && !isPlayerShootHit) {
                if (isSnoop) {
                    deps.playSpectateNearbyCombatSound?.(combatDamageSound, spectateImpactOptions);
                } else {
                    deps.playEffect?.(combatDamageSound);
                }
            }

            if (hasHitTag) {
                if (isSnoop) {
                    if (isPlayerShootHit) {
                        deps.playSpectateNearbyCombatSound?.('arrowhit', spectateImpactOptions);
                    } else if (!combatDamageSound) {
                        deps.playSpectateHitImpactSound?.(match.modifier);
                    }
                } else if (isPlayerShootHit) {
                    playArrowHit();
                } else if (!combatDamageSound) {
                    deps.playHitImpactSound?.(match.modifier);
                }
            } else if (!isSnoop && isPlayerShootHit) {
                playArrowHit();
            }

            if (hasDamageTag && isSnoop) {
                deps.playSpectateNearbyCombatSound?.('damage', spectateImpactOptions);
                deps.playSpectateOofSound?.();
            } else if (hasDamageTag) {
                deps.playEffect?.('damage');
                deps.playOofSound?.();
            }

            if ((!isSnoop || deps.isSpectateMode) && isUserInvolved && isMissOrAvoid) {
                deps.playEffect?.('miss');
            }

            if (!isSnoop && (isPlayerAvoidedAttempt || isPlayerFailedAttack)) {
                recordCombatRechargeConfirmation(match.verb || (hasMissTag || hasAvoidDamageTag ? 'miss' : undefined), false);
            } else if (!isSnoop && hasAvoidDamageTag) {
                recordOpponentCombatRechargeConfirmation(match.verb, false);
            } else if (!isSnoop && isOpponentFailedAttack) {
                recordOpponentCombatRechargeConfirmation(match.verb || 'hit', false);
            } else if (!isSnoop && match.side === 'player') {
                recordCombatRechargeConfirmation(match.verb || (hasMissTag ? 'miss' : undefined), !hasMissTag && !hasAvoidDamageTag);
            } else if (!isSnoop && match.side === 'opponent' && (hasDamageTag || match.isPlayerTarget)) {
                recordOpponentCombatRechargeConfirmation(match.verb, !hasMissTag && !hasAvoidDamageTag);
            }

            return 'combat';
        }

        return null;
    }, [handleCombatExit, handleXpTicker, checkCombatMatch, deps]);

    return { checkCombatMatch, handleCombatExit, handleXpTicker, parseCombatLine };
}
