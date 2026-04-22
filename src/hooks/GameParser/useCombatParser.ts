/**
 * @file useCombatParser.ts
 * @description Detects combat events, side determination, and experience tickers.
 */

import { useCallback } from 'react';
import { GroupMember, CharacterInfo, CombatHealthStatus } from '../../types';

export interface CombatParserDeps {
    inCombatRef: React.RefObject<boolean>;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    triggerHitFlash?: () => void;
    triggerOppHitFlash?: () => void;
    triggerXpTicker?: () => void;
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
    playHitImpactSound?: (modifier?: string) => void;
    playOofSound?: () => void;
    playSlashSound?: () => void;
    playCleaveSound?: () => void;
    playSmiteSound?: () => void;
    playPierceSound?: () => void;
    playStabSound?: () => void;
    playArrowHitSound?: () => void;
    setInCombat?: (inCombat: boolean, force?: boolean) => void;
    characterName?: string | null;
    addMessage?: (type: any, text: string) => void;
}

const COMBAT_VERBS_STR = ['hit', 'miss', 'wound', 'kill', 'maul', 'pierce', 'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shocked', 'stunned', 'blinded', 'silenced', 'hurt', 'die', 'fighting', 'recovered', 'shoot', 'shoots', 'blast', 'shatters', 'joins?', 'assists?'].join('|');
const COMBAT_REGEX = new RegExp(`\\b(${COMBAT_VERBS_STR})(?:es|s)?\\b`, 'i');

export function useCombatParser(deps: CombatParserDeps) {
    const {
        inCombatRef,
        setOpponentHealthStatus,
        setOpponentName,
        setCharacterInfo,
        triggerXpTicker,
        groupMembers,
        mapperRef,
        setDeathRoomId,
        spectateCharacterName,
        roomPlayers,
        setSpectateInCombat,
        setSpectateOpponentName,
        setSpectateOpponentStatus,
        playKillSound,
        playLevelSound,
        characterName
    } = deps;

    const checkCombatMatch = useCallback((lower: string, isSnoop: boolean = false) => {
        // Exclude specific flavor text that shouldn't be combat
        if (lower.includes('hissing shriek') || lower.includes('the nine')) return { isMatch: false };

        // Strip leading spaces and asterisks (damage indicators in MUME)
        const cleanLower = lower.replace(/^[\s\*]+/, '').trim();

        const isSpecificCharge = /^you charge\b/i.test(cleanLower) || /\bcharges (?:at|towards) you\b/i.test(cleanLower) || /\bcharge (?:at|towards) you\b/i.test(cleanLower);
        const isMatch = COMBAT_REGEX.test(cleanLower) || isSpecificCharge || ((cleanLower.includes('dodge') || cleanLower.includes('parry') || cleanLower.includes('flee')) && inCombatRef.current);
        
        if (!isMatch) return { isMatch: false };

        const impactVerbs = ['hit', 'pierce', 'slash', 'smite', 'crush', 'pound', 'stab', 'cleave', 'wound', 'maul', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shoot', 'shock', 'blast', 'struck', 'burn', 'chill', 'acid', 'poison'];
        
        // Use regex with word boundaries for more robust matching regardless of punctuation
        const impactRegex = new RegExp(`\\b(${impactVerbs.join('|')})(?:es|s)?\\b`, 'i');
        // A combat line is an impact only if it matches an impact verb AND doesn't mention avoidance
        const isImpact = impactRegex.test(cleanLower) && !/\b(miss|dodge|parry|evade|avoid|blocks?)\b/i.test(cleanLower);

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
        const modifiers = ['extremely hard', 'very hard', 'hard', 'strongly', 'lightly', 'barely'];
        const modifier = modifiers.find(m => cleanLower.includes(m));
        
        const verbMatch = cleanLower.match(impactRegex);
        const verb = verbMatch ? verbMatch[1].toLowerCase() : undefined;

        const isMainActor = (side === 'player') || (side === 'groupmate' && !!spectateCharacterName && groupNameMatch.toLowerCase() === spectateCharacterName.toLowerCase());

        return { isMatch: true, side, isImpact, modifier, verb, isPlayerTarget, isMainActor };
    }, [inCombatRef, groupMembers, spectateCharacterName, roomPlayers]);

    const handleCombatExit = useCallback((lower: string, isSnoop: boolean = false) => {
        if (inCombatRef.current || (isSnoop && setSpectateInCombat)) {
            const isDeath = /you (?:have )?sl(?:ay|ew|ain)\b/i.test(lower) || /\bis dead!\s*r\.?i\.?p/i.test(lower);
            if (isDeath ||
                /^you flee\b/i.test(lower) ||
                /\bflees\s/i.test(lower) ||
                /you stop fighting/i.test(lower)) {
                
                if (isDeath) {
                    // playKillSound?.(); // Removed as requested
                }
                
                if (isSnoop && setSpectateInCombat) {
                    setSpectateInCombat(false, true);
                    setSpectateOpponentStatus?.(null);
                    setSpectateOpponentName?.(null);
                } else {
                    // NOTE: setInCombat is intentionally NOT called here.
                    // Combat mode is driven exclusively by GMCP position data.
                    // We still clear the opponent HUD display on unambiguous exit signals.
                    setOpponentHealthStatus(null);
                    setOpponentName(null);
                }
                
                if (/you are dead/i.test(lower) && setDeathRoomId && mapperRef?.current) {
                    const currentRoom = mapperRef.current.getCurrentRoom?.();
                    if (currentRoom?.id) {
                        setDeathRoomId(currentRoom.id.toString());
                    }
                }
                
                return true;
            }
        } else if (/you are dead/i.test(lower) && setDeathRoomId && mapperRef?.current) {
            // Also check for death even if not "in combat" (e.g. trap, fall)
            const currentRoom = mapperRef.current.getCurrentRoom?.();
            if (currentRoom?.id) {
                setDeathRoomId(currentRoom.id.toString());
            }
        }
        return false;
    }, [inCombatRef, setOpponentHealthStatus, setOpponentName, setDeathRoomId, mapperRef, setSpectateInCombat, setSpectateOpponentStatus, setSpectateOpponentName, playKillSound]);

    const handleXpTicker = useCallback((lower: string, isSnoop: boolean = false) => {
        const xpTextMatch = lower.match(/you receive (\d+) experience/i);
        if (xpTextMatch) {
            const delta = parseInt(xpTextMatch[1], 10);
            if (delta > 0) setCharacterInfo(prev => ({ ...prev, xp: prev.xp + delta }));
            triggerXpTicker?.();
            return true;
        } else if (/you receive your share of experience/i.test(lower)) {
            triggerXpTicker?.();
            return true;
        } else if (/you gain a level!/i.test(lower)) {
            playLevelSound?.();
            return true;
        }
        return false;
    }, [setCharacterInfo, triggerXpTicker, playLevelSound]);

    const parseCombatLine = useCallback((textOnly: string, cleanLine: string): any => {
        const lower = textOnly.toLowerCase();

        // 1. Detect Combat Exit/Death
        if (handleCombatExit(lower)) return 'game';

        // 2. Detect XP Ticker
        if (handleXpTicker(lower)) return 'game';

        // 3. Detect Combat Match
        const match = checkCombatMatch(lower);
        if (match.isMatch) {
            // Play Sounds
            if (match.isImpact) {
                const { verb, modifier } = match;
                if (match.side === 'opponent' && match.isPlayerTarget) {
                    deps.playOofSound?.();
                } else if (match.side === 'player' || match.side === 'groupmate') {
                    if (verb === 'slash') deps.playSlashSound?.();
                    else if (verb === 'cleave') deps.playCleaveSound?.();
                    else if (verb === 'smite') deps.playSmiteSound?.();
                    else if (verb === 'pierce') deps.playPierceSound?.();
                    else if (verb === 'stab') deps.playStabSound?.();
                    else if (verb === 'shoot') deps.playArrowHitSound?.();
                    else deps.playHitImpactSound?.(modifier);
                }
            }

            // Visual FX
            if (match.isImpact && match.isPlayerTarget) {
                deps.triggerHitFlash?.();
            } else if (match.isImpact && (match.side === 'player' || match.side === 'groupmate')) {
                deps.triggerOppHitFlash?.();
            }

            return 'combat';
        }

        return null;
    }, [handleCombatExit, handleXpTicker, checkCombatMatch, deps]);

    return { checkCombatMatch, handleCombatExit, handleXpTicker, parseCombatLine };
}
