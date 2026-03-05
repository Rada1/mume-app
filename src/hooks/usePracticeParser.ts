import { useCallback } from 'react';

const PROFICIENCY_MAP: Record<string, number> = {
    'awful': 15, 'bad': 30, 'poor': 45, 'average': 60, 'fair': 70,
    'good': 80, 'very good': 90, 'excellent': 100, 'superb': 101,
};

export const usePracticeParser = (
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void,
    setCharacterClass: (val: any) => void
) => {
    const parsePracticeLine = useCallback((textOnly: string) => {
        if (textOnly.toLowerCase().includes('skill / spell') || textOnly.includes('---')) return;

        let ability = '';
        let proficiency = 0;
        let detectedClass = '';

        // 1. Dotted Format
        const dottedMatch = textOnly.match(/^([a-zA-Z\s\-]+)\s+\.{3,}\s+([a-zA-Z\s%\d\(\)]+)$/);
        if (dottedMatch) {
            ability = dottedMatch[1].trim().toLowerCase();
            const valuePart = dottedMatch[2].trim().toLowerCase();
            const pctMatch = valuePart.match(/(\d+)%/);
            if (pctMatch) proficiency = parseInt(pctMatch[1]);
            else {
                for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                    if (valuePart.includes(lit)) { proficiency = val; break; }
                }
            }
        }
        // 2. Table Format
        else {
            const parts = textOnly.trim().split(/\s{2,}/);
            if (parts.length >= 2) {
                ability = parts[0].trim().toLowerCase();
                const knowledge = parts[1].trim().toLowerCase();
                if (knowledge.includes('%')) proficiency = parseInt(knowledge) || 0;
                else {
                    for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                        if (knowledge === lit || knowledge.startsWith(lit)) { proficiency = val; break; }
                    }
                }
                if (parts.length >= 4) {
                    const cls = parts[3].trim().toLowerCase();
                    if (['ranger', 'warrior', 'mage', 'cleric', 'thief'].includes(cls)) detectedClass = cls;
                }
            }
        }

        if (ability && proficiency > 0) {
            setAbilities(prev => ({ ...prev, [ability]: proficiency }));
            if (detectedClass) setCharacterClass(detectedClass);
        }
    }, [setAbilities, setCharacterClass]);

    return { parsePracticeLine };
};
