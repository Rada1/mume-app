/**
 * @file useStatParser.ts
 * @description Extracts character statistics, gold, and score details from game output.
 */

import { useCallback } from 'react';
import { GameStats, CharacterInfo, CaptureStage } from '../../types';

export interface StatParserDeps {
    setMood: (val: string) => void;
    setStats: (val: GameStats | ((prev: GameStats) => GameStats)) => void;
    setCharacterInfo: (val: CharacterInfo | ((prev: CharacterInfo) => CharacterInfo)) => void;
    inCombatRef: React.RefObject<boolean>;
    executeCommandRef: React.RefObject<(cmd: string, ...args: any[]) => void>;
    captureStage: React.MutableRefObject<CaptureStage>;
}

export function useStatParser(deps: StatParserDeps) {
    const {
        setMood,
        setStats,
        setCharacterInfo,
        inCombatRef,
        executeCommandRef,
        captureStage
    } = deps;

    const parseGlobalStatus = useCallback((content: string, contentLower: string) => {
        if (contentLower.startsWith('your ob ') || contentLower.startsWith('your mood ') || contentLower.startsWith('your armor ') || contentLower.startsWith('your armour ') || /\b(ob|db|pb|mood|armor|armour|arm)\b/i.test(contentLower)) {
            const obMatch = content.match(/Ob\s*(?::|is)?\s*(\d+)%/i);
            const dbMatch = content.match(/Db\s*(?::|is)?\s*(\d+)%/i);
            const pbMatch = content.match(/Pb\s*(?::|is)?\s*(\d+)%/i);
            const armorMatch = content.match(/(?:Armo?ur|Armor|Arm)\s*(?::|is)?\s*(\d+)%/i);
            const moodMatch = content.match(/your mood is (?:now )?(\w+)/i);
            const moodCompactMatch = content.match(/\bMood\s*:\s*(\w+)/i);
            const wimpyMatch = content.match(/Wimpy(?:\s*set\s*to|:)?\s*(\d+)/i);

            if (obMatch || dbMatch || pbMatch || armorMatch || moodMatch || moodCompactMatch || wimpyMatch) {
                const moodValue = moodMatch ? moodMatch[1] : (moodCompactMatch ? moodCompactMatch[1] : null);
                if (moodValue) {
                    setMood(moodValue.toLowerCase());
                    const isMoodChange = /your mood is now/i.test(content);
                    if (isMoodChange && inCombatRef.current && executeCommandRef.current) {
                        setTimeout(() => executeCommandRef.current?.('stat', true, true, true, true), 100);
                    }
                }

                setStats(prev => ({
                    ...prev,
                    ...(obMatch && { ob: parseInt(obMatch[1]) }),
                    ...(dbMatch && { db: parseInt(dbMatch[1]) }),
                    ...(pbMatch && { pb: parseInt(pbMatch[1]) }),
                    ...(armorMatch && { armour: parseInt(armorMatch[1]) }),
                    ...(wimpyMatch && { wimpy: parseInt(wimpyMatch[1]) }),
                }));
                return true;
            }
        }

        // --- NEW REBUILT GOLD PARSER ---
        const trimmed = content.trim();
        const isRawNumeric = /^\d+$/.test(trimmed);
        const hasGoldKeywords = contentLower.includes('gold') || contentLower.includes('silver') || contentLower.includes('copper') ||
                              contentLower.includes('lauren') || contentLower.includes('celeb') || contentLower.includes('busc');
        
        if (hasGoldKeywords || isRawNumeric) {
            if (isRawNumeric) {
                // If the output is a raw number (e.g. "114"), per user instruction this is Gold (1g = 240c)
                const g = parseInt(trimmed);
                const total = g * 240;
                console.log(`[GoldParser] REBUILT (Raw): Detected ${g} gold (${total} total copper) from line: "${trimmed}"`);
                setCharacterInfo(prev => ({ ...prev, gold: total }));
                return true;
            }

            const cleanContent = content.replace(/[,:]/g, ' '); 
            const goldM = cleanContent.match(/(\d+)\s*(?:gold|lauren)/i);
            const silverM = cleanContent.match(/(\d+)\s*(?:silver|celeb)/i);
            const copperM = cleanContent.match(/(\d+)\s*(?:copper|busc|pennies?|coins?|coins?)/i);
            
            if (goldM || silverM || copperM) {
                const g = goldM ? parseInt(goldM[1]) : 0;
                const s = silverM ? parseInt(silverM[1]) : 0;
                const c = copperM ? parseInt(copperM[1]) : 0;
                const total = (g * 240) + (s * 12) + c;
                
                console.log(`[GoldParser] REBUILT (Keywords): Detected ${g}g, ${s}s, ${c}c (Total: ${total}) from line: "${content.trim()}"`);
                setCharacterInfo(prev => ({ ...prev, gold: total }));
                return true;
            }
        }

        return false;
    }, [setMood, setStats, setCharacterInfo, inCombatRef, executeCommandRef]);

    const parseDetailedScore = useCallback((textOnly: string, lower: string) => {
        // Redundant structured parsing removed per user request.
        // The drawer now displays the raw captured lines, and structured data (Level, XP, Gold) 
        // is handled more reliably via GMCP in useGmcpVitals.ts.
        return true;
    }, []);


    return { parseGlobalStatus, parseDetailedScore };
}
