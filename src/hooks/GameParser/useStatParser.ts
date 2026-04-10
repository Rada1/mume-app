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
        return false;
    }, [setMood, setStats, inCombatRef, executeCommandRef]);

    const parseDetailedScore = useCallback((textOnly: string, lower: string) => {
        // Redundant structured parsing removed per user request.
        // The drawer now displays the raw captured lines, and structured data (Level, XP, Gold) 
        // is handled more reliably via GMCP in useGmcpVitals.ts.
        return true;
    }, []);


    return { parseGlobalStatus, parseDetailedScore };
}
