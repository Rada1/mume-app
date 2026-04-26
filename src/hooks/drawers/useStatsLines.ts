/**
 * @file useStatsLines.ts
 * @description Hook to process character stats and score lines.
 */

import { useMemo } from 'react';
import { DrawerLine } from '../../types';

export const useStatsLines = ({ 
    statsLines, 
    scoreLines 
}: { 
    statsLines: DrawerLine[], 
    scoreLines: DrawerLine[] 
}) => {
    const processedScoreLines = useMemo(() => {
        return scoreLines.map(line => ({
            ...line,
            html: line.html.trim()
        }));
    }, [scoreLines]);

    const processedStatsLines = useMemo(() => {
        return statsLines.filter(line => {
            const lowerText = line.text.toLowerCase().trim();
            return !(lowerText === '[stat]' || lowerText === '[at]' || lowerText === 'at' || lowerText === 'ok.');
        }).map(line => ({
            ...line,
            html: line.html.trim()
        }));
    }, [statsLines]);

    return {
        scoreLines: processedScoreLines,
        statsLines: processedStatsLines
    };
};
