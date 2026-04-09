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
        if (captureStage.current !== 'stat' && captureStage.current !== 'info') return false;

        // Parse affected by list
        if (lower.startsWith('affected by:')) {
            setCharacterInfo(prev => ({ ...prev, affectedBy: [] }));
            return true;
        }
        
        if (lower.startsWith('- ')) {
            const spell = textOnly.substring(2).trim();
            const sLower = spell.toLowerCase();
            if (spell && !sLower.includes('hunger') && !sLower.includes('thirst')) {
                setCharacterInfo(prev => ({
                    ...prev,
                    affectedBy: [...(prev.affectedBy || []), spell]
                }));
            }
            return true;
        }

        // Parse Gold, XP, TP, Level from score/info command
        const moneyRegex = /(?:gold|money|copper|lauren|celeb|busc|silver|gold):\s*([\d,]+)|([\d,]+)\s*(?:gold|silver|copper|lauren|celeb|busc|pennies|coins)/gi;
        let moneyMatch;
        let totalGoldOnLine = undefined;
        
        while ((moneyMatch = moneyRegex.exec(textOnly)) !== null) {
            const val = parseInt((moneyMatch[1] || moneyMatch[2]).replace(/,/g, ''));
            if (totalGoldOnLine === undefined) totalGoldOnLine = 0;
            
            const lowMatch = moneyMatch[0].toLowerCase();
            if (lowMatch.includes('gold') || lowMatch.includes('lauren')) totalGoldOnLine += val;
            else if (lowMatch.includes('silver') || lowMatch.includes('celeb') || lowMatch.includes('pennies')) totalGoldOnLine += val / 10;
            else if (lowMatch.includes('copper') || lowMatch.includes('busc')) totalGoldOnLine += val / 100;
            else totalGoldOnLine += val; 
        }
        
        if (totalGoldOnLine !== undefined) {
            setCharacterInfo(prev => ({ ...prev, gold: Math.floor(totalGoldOnLine!) }));
        }

        const statRegex = /(str|int|wis|dex|con|wil|per):\s*(\d+)/gi;
        let match;
        const stats: any = {};
        let statFound = false;
        while ((match = statRegex.exec(textOnly)) !== null) {
            stats[match[1].toLowerCase()] = parseInt(match[2]);
            statFound = true;
        }
        if (statFound) {
            setCharacterInfo(prev => ({
                ...prev,
                stats: { ...(prev.stats || {str:0, int:0, wis:0, dex:0, con:0, wil:0, per:0}), ...stats }
            }));
        }

        if (captureStage.current === 'info') {
            const levelMatch = textOnly.match(/level:\s*(\d+)/i);
            const xpMatch = textOnly.match(/exp(?:erience)?:\s*([\d,]+)/i);
            const tnlMatch = textOnly.match(/tnl:\s*([\d,]+)/i);
            const ageMatch = textOnly.match(/You are ([\d\s\w,]+) old\./i);
            const weightMatch = textOnly.match(/weigh ([\d\s\w]+)\./i);
            const eqWeightMatch = textOnly.match(/equipment weighs ([\d\s\w]+)\./i);
            const alertnessMatch = textOnly.match(/Alertness:\s*(\w+)/i);
            
            if (levelMatch || xpMatch || tnlMatch || ageMatch || weightMatch || eqWeightMatch || alertnessMatch) {
                const levelVal = levelMatch ? parseInt(levelMatch[1]) : undefined;
                const xpVal = xpMatch ? parseInt(xpMatch[1].replace(/,/g, '')) : undefined;
                const xpMaxVal = (xpVal !== undefined && tnlMatch) ? (xpVal + parseInt(tnlMatch[1].replace(/,/g, ''))) : undefined;

                setCharacterInfo(prev => ({
                    ...prev,
                    ...(levelVal !== undefined && { level: levelVal }),
                    ...(xpVal !== undefined && { xp: xpVal }),
                    ...(xpMaxVal !== undefined && { xpMax: xpMaxVal }),
                    ...(ageMatch && { age: ageMatch[1].trim() }),
                    ...(weightMatch && { weight: weightMatch[1].trim() }),
                    ...(eqWeightMatch && { eqWeight: eqWeightMatch[1].trim() }),
                    ...(alertnessMatch && { alertness: alertnessMatch[1].toLowerCase() })
                }));
            }

            // Parse Perception
            if (lower.includes('perception:')) {
                const visionMatch = textOnly.match(/vision\s*\((\d+)\/(\d+)\)/i);
                const hearingMatch = textOnly.match(/hearing\s*\((\d+)\/(\d+)\)/i);
                const smellMatch = textOnly.match(/smell\s*\((\d+)\/(\d+)\)/i);
                if (visionMatch || hearingMatch || smellMatch) {
                    setCharacterInfo(prev => ({
                        ...prev,
                        perception: {
                            vision: visionMatch ? `${visionMatch[1]}/${visionMatch[2]}` : (prev.perception?.vision || '100/100'),
                            hearing: hearingMatch ? `${hearingMatch[1]}/${hearingMatch[2]}` : (prev.perception?.hearing || '100/100'),
                            smell: smellMatch ? `${smellMatch[1]}/${smellMatch[2]}` : (prev.perception?.smell || '100/100'),
                        }
                    }));
                }
            }

            // Parse War Info
            if (lower.includes('acts for war:') || lower.includes('war points:')) {
                const actsMatch = textOnly.match(/Acts for war:\s*(\d+)/i);
                const warPointsMatch = textOnly.match(/War points:\s*(\d+)/i);
                if (actsMatch || warPointsMatch) {
                    setCharacterInfo(prev => ({
                        ...prev,
                        ...(actsMatch && { actsForWar: parseInt(actsMatch[1]) }),
                        ...(warPointsMatch && { warPoints: parseInt(warPointsMatch[1]) })
                    }));
                }
            }
        }

        return true;
    }, [captureStage, setCharacterInfo]);

    return { parseGlobalStatus, parseDetailedScore };
}
