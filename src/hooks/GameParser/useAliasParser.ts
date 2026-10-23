/** @file useAliasParser.ts — Feeds player alias sync responses into the serialized snapshot queue. */

import { useCallback } from 'react';
import { useCommandAliasStore } from '../../stores/useCommandAliasStore';
import { usePanelDataStore } from '../../stores/usePanelDataStore';
import { stripAnsiControlSequences } from '../../utils/ansi';
import type { PanelDataSender } from '../../types';

// --- Logic Section ---
export const useAliasParser = () => useCallback((
    line: string, isSnoop: boolean, isSpectateMode: boolean, sendPage?: PanelDataSender
) => {
    if (isSnoop || isSpectateMode || !useCommandAliasStore.getState().pending) return false;
    const clean = stripAnsiControlSequences(line)
        .replace(/&gt;/gi, '>').replace(/&lt;/gi, '<')
        .replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&amp;/gi, '&');
    if (/Return: continue|\*\*\* \[Hit Return/i.test(clean)) {
        queueMicrotask(() => {
            if (useCommandAliasStore.getState().pending) sendPage?.('');
        });
        return true;
    }
    const result = useCommandAliasStore.getState().receive(clean);
    if (result === 'complete') usePanelDataStore.getState().complete('aliases');
    if (result === 'invalid') usePanelDataStore.getState().fail('aliases');
    return result !== 'ignored' || clean.trim().toLowerCase() === 'alias';
}, []);
