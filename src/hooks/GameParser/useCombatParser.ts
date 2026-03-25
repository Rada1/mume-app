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
}

const COMBAT_VERBS_STR = ['hit', 'miss', 'wound', 'kill', 'maul', 'pierce', 'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'strike', 'backstab', 'charge', 'kick', 'bash', 'shatter', 'bite', 'sting', 'shocked', 'stunned', 'blinded', 'silenced', 'hurt', 'die', 'fighting', 'incantations', 'recovered'].join('|');
const COMBAT_REGEX = new RegExp(`(?: )(${COMBAT_VERBS_STR})s?(?: )|(${COMBAT_VERBS_STR})s? you`);

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
        setDeathRoomId
    } = deps;

    const checkCombatMatch = useCallback((lower: string) => {
        const isMatch = COMBAT_REGEX.test(lower) || ((lower.includes('dodge') || lower.includes('parry') || lower.includes('flee')) && inCombatRef.current);
        
        if (!isMatch) return { isMatch: false };

        const impactVerbs = ['hit', 'pierce', 'slash', 'smite', 'crush', 'pound', 'stab', 'cleave'];
        const isImpact = impactVerbs.some(verb => lower.includes(` ${verb} `) || lower.includes(` ${verb}s `) || lower.includes(`${verb} you`) || lower.includes(`${verb}s you`));

        // Determine side
        let side: 'player' | 'opponent' | 'groupmate' | undefined = undefined;
        if (lower.startsWith('you ') || lower.startsWith('your ')) {
            side = 'player';
        } else {
            // Check if any group member name starts the line
            const groupNameMatch = groupMembers.find(m => m.name && lower.startsWith(m.name.toLowerCase() + ' '));
            if (groupNameMatch) {
                side = 'groupmate';
            } else {
                side = 'opponent';
            }
        }
        return { isMatch: true, side, isImpact };
    }, [inCombatRef, groupMembers]);

    const handleCombatExit = useCallback((lower: string) => {
        if (inCombatRef.current) {
            if (/you (?:have )?sl(?:ay|ew|ain)\b/i.test(lower) ||
                /\bis dead!\s*r\.?i\.?p/i.test(lower) ||
                /^you flee\b/i.test(lower) ||
                /\bflees\s/i.test(lower) ||
                /you stop fighting/i.test(lower)) {
                setInCombat(false, true);
                setOpponentHealthStatus(null);
                setOpponentName(null);
                
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
    }, [inCombatRef, setInCombat, setOpponentHealthStatus, setOpponentName, setDeathRoomId, mapperRef]);

    const handleXpTicker = useCallback((lower: string) => {
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
