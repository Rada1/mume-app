/**
 * @file usePlayerLines.ts
 * @description Hook to derive and filter player lines for the PlayersView.
 */

import { useMemo } from 'react';
import { DrawerLine } from '../../types';

interface UsePlayerLinesProps {
    whoLines: DrawerLine[];
    whereLines: DrawerLine[];
    favorites: string[];
}

export const usePlayerLines = ({
    whoLines,
    whereLines,
    favorites
}: UsePlayerLinesProps) => {

    const formattedWho = useMemo(() => whoLines, [whoLines]);
    const formattedWhere = useMemo(() => whereLines, [whereLines]);

    return {
        whoLines: formattedWho,
        whereLines: formattedWhere
    };
};
