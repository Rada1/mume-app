/** @file useOffensiveCityActionConfirmation.ts — Confirms red offensive actions where auto-targeting is disabled. */

import { useCallback } from 'react';
import { isAutoTargetChipDisabledZone } from '../utils/commandAutoTarget';
import { isOffensiveSingleTargetCommand } from '../utils/commandTargetUtils';
import { isRedCodedSwipeCommand } from '../utils/swipeCommandColors';

// --- Logic Section ---
export const useOffensiveCityActionConfirmation = (roomZone: string | null | undefined) =>
    useCallback((command: string): boolean => {
        const trimmedCommand = command.trim();
        if (!trimmedCommand || !isAutoTargetChipDisabledZone(roomZone)) return true;
        if (!isOffensiveSingleTargetCommand(trimmedCommand) && !isRedCodedSwipeCommand(trimmedCommand)) return true;

        const city = roomZone?.trim() || 'this city';
        return window.confirm(`Auto-targeting is disabled in ${city}. Confirm this action?\n\n${trimmedCommand}`);
    }, [roomZone]);
