/**
 * @file useCharacterLines.ts
 * @description Hook to derive and filter character lines for the CharacterView.
 */

import { useMemo } from 'react';
import { DrawerLine } from '../../types';

interface UseCharacterLinesProps {
    infoLines: DrawerLine[];
    practiceLines: DrawerLine[];
    questLines: DrawerLine[];
    isAtGuildmaster?: boolean;
}

export const useCharacterLines = ({
    infoLines,
    practiceLines,
    questLines,
    isAtGuildmaster
}: UseCharacterLinesProps) => {
    
    const getClassColor = (skillClass?: string) => {
        if (!skillClass) return 'transparent';
        const cls = skillClass.toLowerCase();
        if (cls === 'warrior') return 'rgba(239, 68, 68, 0.15)'; // Red
        if (cls === 'none' || cls === 'ranger') return 'rgba(34, 197, 94, 0.15)'; // Green
        if (cls === 'cleric') return 'rgba(234, 179, 8, 0.22)'; // Holy Yellow
        if (cls === 'thief') return 'rgba(148, 163, 184, 0.15)'; // Silver/Grey
        if (cls === 'mage') return 'rgba(59, 130, 246, 0.22)'; // Arcane Blue
        return 'transparent';
    };

    const formattedInfo = useMemo(() => infoLines, [infoLines]);

    const formattedPractice = useMemo(() => {
        return practiceLines.map(line => ({
            ...line,
            style: {
                background: isAtGuildmaster ? 'transparent' : getClassColor(line.practiceSkill?.skillClass)
            }
        }));
    }, [practiceLines, isAtGuildmaster]);

    const formattedQuests = useMemo(() => questLines, [questLines]);

    return {
        infoLines: formattedInfo,
        practiceLines: formattedPractice,
        questLines: formattedQuests
    };
};
