/**
 * @file useWhoListRefresh.ts
 * @description Loads the global player list only when a target picker needs it.
 */

import { useCallback } from 'react';
import type { ExecuteCommand } from '../types';

const WHO_REQUEST_COOLDOWN_MS = 2000;
let lastWhoRequestAt = 0;

// --- Logic Section ---

export const useWhoListRefresh = (whoList: string[], executeCommand: ExecuteCommand, refreshOnOpen = false) => useCallback(() => {
    if ((whoList.length > 0 && !refreshOnOpen) || Date.now() - lastWhoRequestAt < WHO_REQUEST_COOLDOWN_MS) return;
    lastWhoRequestAt = Date.now();
    executeCommand('who', true, true, false, true);
}, [executeCommand, whoList, refreshOnOpen]);
