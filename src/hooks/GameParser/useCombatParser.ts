/**
 * @file useCombatParser.ts
 * @description Detects combat events, side determination, and experience tickers.
 */

import { useCallback } from 'react';
import { GroupMember, CharacterInfo, CombatHealthStatus } from '../../types';

export interface CombatParserDeps {
    inCombatRef: React.RefObject<boolean>;
    setInCombat: (val: boolean, force?: boolean) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
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
}

const COMBAT_VERBS_STR = ['hit', 'miss', 'wound', 'kill', 'maul', 'pierce', 'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shocked', 'stunned', 'blinded', 'silenced', 'hurt', 'die', 'fighting', 'recovered', 'shoot', 'shoots', 'blast', 'shatters', 'joins?', 'assists?'].join('|');
const COMBAT_REGEX = new RegExp(`\\b(${COMBAT_VERBS_STR})(?:es|s)?\\b`, 'i');

export function useCombatParser(deps: CombatParserDeps) {
    const {
        inCombatRef,
        setInCombat,
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
        setSpectateOpponentStatus
    } = deps;

    const checkCombatMatch = useCallback((lower: string, isSnoop: boolean = false) => {
        // Exclude specific flavor text that shouldn't be combat
        if (lower.includes('hissing shriek') || lower.includes('the nine')) return { isMatch: false };

        // Strip leading spaces and asterisks (damage indicators in MUME)
        const cleanLower = lower.replace(/^[\s\*]+/, '').trim();

        const isSpecificCharge = /^you charge\b/i.test(cleanLower) || /\bcharges (?:at|towards) you\b/i.test(cleanLower) || /\bcharge (?:at|towards) you\b/i.test(cleanLower);
        const isMatch = COMBAT_REGEX.test(cleanLower) || isSpecificCharge || ((cleanLower.includes('dodge') || cleanLower.includes('parry') || cleanLower.includes('flee')) && inCombatRef.current);
        
        if (!isMatch) return { isMatch: false };

        const impactVerbs = ['hit', 'pierce', 'slash', 'smite', 'crush', 'pound', 'stab', 'cleave', 'wound', 'maul', 'strike', 'backstab', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shoot', 'shock'];
        
        // Use regex with word boundaries for more robust matching regardless of punctuation
        const impactRegex = new RegExp(`\\b(${impactVerbs.join('|')})s?\\b`, 'i');
        const isImpact = impactRegex.test(cleanLower);

        // Determine side and target
        let side: 'player' | 'opponent' | 'groupmate' | undefined = undefined;
        let isPlayerTarget = false;

        if (cleanLower.startsWith('you ') || cleanLower.startsWith('your ')) {
            side = 'player';
        } else {
            // Check if any group member name starts the line
            const pcNames = (roomPlayers || []).map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean) as string[];
            const extraNames = [];
            if (spectateCharacterName) extraNames.push(spectateCharacterName);
            extraNames.push(...(groupMembers.map(m => m.name).filter(Boolean) as string[]));
            
            const allAllies = Array.from(new Set([...pcNames, ...extraNames]));

            const groupNameMatch = allAllies.find(name => {
                const lowerName = name.toLowerCase();
                // Check if line starts with name followed by space/punctuation/modifiers
                return cleanLower.startsWith(lowerName + ' ') || 
                       cleanLower.startsWith(lowerName + '(') || 
                       cleanLower.startsWith(lowerName + ' (');
            });
            
            if (groupNameMatch) {
                side = 'groupmate';
            } else {
                side = 'opponent';
                // Only consider it a player hit if "you" or "your" follows the verb
                // MUME formats: "NPC hits you.", "NPC smites your head.", "NPC dodges your attack."
                // In spectate mode, we might want to hear it for someone else, but for now 
                // "oof" is specifically for the local player's pain.
                isPlayerTarget = /\b(you|your)\b/i.test(cleanLower);
            }
        }
        const modifiers = ['extremely hard', 'very hard', 'hard', 'strongly', 'lightly', 'barely'];
        const modifier = modifiers.find(m => cleanLower.includes(m));
        
        const verbMatch = cleanLower.match(impactRegex);
        const verb = verbMatch ? verbMatch[1].toLowerCase() : undefined;

        return { isMatch: true, side, isImpact, modifier, verb, isPlayerTarget };
    }, [inCombatRef, groupMembers, spectateCharacterName, roomPlayers]);

    const handleCombatExit = useCallback((lower: string, isSnoop: boolean = false) => {
        if (inCombatRef.current || (isSnoop && setSpectateInCombat)) {
            if (/you (?:have )?sl(?:ay|ew|ain)\b/i.test(lower) ||
                /\bis dead!\s*r\.?i\.?p/i.test(lower) ||
                /^you flee\b/i.test(lower) ||
                /\bflees\s/i.test(lower) ||
                /you stop fighting/i.test(lower)) {
                
                if (isSnoop && setSpectateInCombat) {
                    setSpectateInCombat(false, true);
                    setSpectateOpponentStatus?.(null);
                    setSpectateOpponentName?.(null);
                } else {
                    setInCombat(false, true);
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
    }, [inCombatRef, setInCombat, setOpponentHealthStatus, setOpponentName, setDeathRoomId, mapperRef, setSpectateInCombat, setSpectateOpponentStatus, setSpectateOpponentName]);

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
        }
        return false;
    }, [setCharacterInfo, triggerXpTicker]);

    return { checkCombatMatch, handleCombatExit, handleXpTicker };
}
