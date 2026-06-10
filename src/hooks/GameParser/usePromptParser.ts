/**
 * @file usePromptParser.ts
 * @description Detects MUME prompt boundaries without deriving combat HUD state from prompt text.
 */

import { useCallback } from 'react';
import { CombatHealthStatus, CaptureStage, GameStats } from '../../types';

export interface PromptParserDeps {
    capture: import('../../types/capture').CaptureController;
    finalizeCapture?: (targetStage?: CaptureStage) => void;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferName: (val: string | null) => void;
    isSpectateMode?: boolean;
    setStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateOpponentName?: (val: string | null) => void;
    setSpectateOpponentStatus?: (val: CombatHealthStatus | null) => void;
    captureStage?: React.MutableRefObject<CaptureStage>;
    inCombatRef?: React.MutableRefObject<boolean>;
}

// --- Logic Section ---

export function usePromptParser(deps: PromptParserDeps) {
    const { capture } = deps;

    const parsePrompt = useCallback((textOnly: string, _isSnoop: boolean = false) => {
        // Prompt text is only a boundary signal here. Character vitals,
        // opponent identity, tank/buffer status, and combat state come from GMCP.
        const promptRegex = /^(([^\r\n<>]*[>])\s*|^([\[\!\*\(](?=[^\]\)\>]*\d)[0-9hHmMvVspSP%/\(\)\[\]\s,:+-]{3,}[\]\)\>]\s*))/;
        const textPMatch = textOnly.match(promptRegex);
        
        if (!textPMatch) {
            return {
                isMatch: false,
                promptPart: '',
                attachedText: '',
                isEndPrompt: false,
                isGameplayPrompt: false
            };
        }

        const promptPart = textPMatch[0];
        const attachedText = textOnly.slice(promptPart.length).trim();
        
        if (capture.hasSession() && !attachedText) {
            capture.finalizeSession();
        }

        const isEndPrompt = (
            !!textPMatch &&
            !attachedText &&
            !['practice', 'who', 'shop', 'where', 'quest', 'stat', 'info', 'whois', 'description'].includes(capture.getActiveType() as any)
        ) || 
            (/^((?:(?:\[.*?\]|[\w\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-\s]|\([^)]+\))\s*)*[\]\)\>])\s*$/.test(textOnly)) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:'));

        const isGameplayPrompt = /HP:\w+|MA:\w+|MV:\w+|SP:\w+/i.test(promptPart);

        return { isMatch: true, promptPart, attachedText, isEndPrompt, isGameplayPrompt };
    }, [capture]);

    return { parsePrompt };
}
