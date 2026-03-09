import { useCallback } from 'react';

const PROFICIENCY_MAP: Record<string, number> = {
    'awful': 15, 'bad': 30, 'poor': 45, 'average': 60, 'fair': 70,
    'good': 80, 'very good': 90, 'excellent': 100, 'superb': 101,
};

const CLASSES = ['ranger', 'warrior', 'mage', 'cleric', 'thief'];

export const usePracticeParser = (
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void,
    setCharacterClass: (val: any) => void
) => {
    const parsePracticeLine = useCallback((textOnly: string) => {
        const lowerText = textOnly.toLowerCase();
        if (lowerText.includes('skill / spell') || textOnly.includes('---')) return;

        // 1. Dotted Format (Single Column)
        const dottedMatch = textOnly.match(/^([a-zA-Z\s\-]+)\s+\.{3,}\s+([a-zA-Z\s%\d\(\)]+)$/);
        if (dottedMatch) {
            const ability = dottedMatch[1].trim().toLowerCase();
            const valuePart = dottedMatch[2].trim().toLowerCase();
            let proficiency = 0;
            const pctMatch = valuePart.match(/(\d+)%/);
            if (pctMatch) proficiency = parseInt(pctMatch[1]);
            else {
                for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                    if (valuePart.includes(lit)) { proficiency = val; break; }
                }
            }
            if (ability && proficiency > 0) {
                setAbilities(prev => ({ ...prev, [ability]: proficiency }));
            }
            return;
        }

        // 2. Advanced Multi-Column / Wide Table Parser
        const parts = textOnly.trim().split(/\s{2,}/).filter(p => p.trim().length > 0);
        
        let i = 0;
        while (i < parts.length) {
            const rawPart = parts[i].trim();
            const ability = rawPart.toLowerCase();
            
            if (CLASSES.includes(ability)) {
                setCharacterClass(ability);
                i++;
                continue;
            }

            const valuePart = parts[i + 1]?.trim().toLowerCase();
            if (!valuePart) {
                i++;
                continue;
            }

            let proficiency = 0;
            if (valuePart.includes('%')) {
                proficiency = parseInt(valuePart) || 0;
            } else {
                for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                    if (valuePart === lit || valuePart.startsWith(lit)) {
                        proficiency = val;
                        break;
                    }
                }
            }

            if (proficiency > 0) {
                setAbilities(prev => ({ ...prev, [ability]: proficiency }));
                
                let j = i + 2;
                while (j < parts.length) {
                    const lookAhead = parts[j].trim().toLowerCase();
                    if (lookAhead.includes('%') || PROFICIENCY_MAP[lookAhead]) break;
                    if (CLASSES.includes(lookAhead)) {
                        setCharacterClass(lookAhead);
                        i = j;
                        break;
                    }
                    j++;
                }
                i = Math.max(i + 2, j);
            } else {
                const combinedAbility = `${ability} ${valuePart}`.toLowerCase();
                const nextValuePart = parts[i + 2]?.trim().toLowerCase();
                
                if (nextValuePart) {
                    let nextProf = 0;
                    if (nextValuePart.includes('%')) nextProf = parseInt(nextValuePart);
                    else {
                        for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                            if (nextValuePart === lit || nextValuePart.startsWith(lit)) { nextProf = val; break; }
                        }
                    }

                    if (nextProf > 0) {
                        setAbilities(prev => ({ ...prev, [combinedAbility]: nextProf }));
                        i += 3;
                        continue;
                    }
                }
                i++;
            }
        }
    }, [setAbilities, setCharacterClass]);

    return { parsePracticeLine };
};
