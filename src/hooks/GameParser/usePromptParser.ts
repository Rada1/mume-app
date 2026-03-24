/**
 * @file usePromptParser.ts
 * @description Parses MUME prompts to extract health status, combatants, and attached text.
 */

import { useCallback } from 'react';
import { CombatHealthStatus, CaptureStage } from '../../types';

export interface PromptParserDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferName: (val: string | null) => void;
    setInCombat: (val: boolean, force?: boolean) => void;
    finalizeCapture: (targetStage?: CaptureStage) => boolean;
}

const HEALTH_MAP: Record<string, CombatHealthStatus> = {
    'healthy': 'Healthy',
    'fine': 'Fine',
    'hurt': 'Hurt',
    'wounded': 'Wounded',
    'bad': 'Badly Wounded',
    'awful': 'Awful',
    'stunned': 'Stunned',
    'dying': 'Dying',
    'bleeding': 'Dying'
};

export function usePromptParser(deps: PromptParserDeps) {
    const {
        captureStage,
        setPlayerHealthStatus,
        setOpponentHealthStatus,
        setOpponentName,
        setBufferHealthStatus,
        setBufferName,
        setInCombat,
        finalizeCapture
    } = deps;

    const findStatus = (str: string): CombatHealthStatus | null => {
        const s = str.toLowerCase();
        for (const [key, val] of Object.entries(HEALTH_MAP)) {
            if (s.includes(key)) return val;
        }
        return null;
    };

    const parsePrompt = useCallback((textOnly: string) => {
        const promptRegex = /^([^\r\n<>]{0,120}>)\s*/;
        const textPMatch = textOnly.match(promptRegex);
        
        if (!textPMatch) return { isMatch: false, promptPart: '', attachedText: '', isEndPrompt: false };

        const promptPart = textPMatch[0];
        const attachedText = textOnly.slice(promptPart.length).trim();
        
        const isPager = textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return to continue]');
        if (captureStage.current !== 'none' && !attachedText && !isPager) {
            finalizeCapture();
        }

        // --- Combat Health Extraction ---
        // 1. Player Health
        const playerMatch = promptPart.match(/HP:(\w+)/i);
        if (playerMatch) {
            const status = findStatus(playerMatch[1]);
            setPlayerHealthStatus(status ?? 'Healthy');
        } else {
            setPlayerHealthStatus('Healthy');
        }

        // 2 & 3. Combatants (Opponents and Tanks/Buffers)
        const combatantsPart = promptPart
            .replace(/\b(?:HP|MA|MV|SP|Move|Mana)\s*:\s*\w+/gi, '') // Remove vital statuses
            .replace(/^[\*\)\!\(\[\]oO\.f%\~+WU:=O\#\?\s\-]+/, '') // Remove leading prompt symbols
            .replace(/>$/, '');

        const pairs: {name: string, status: CombatHealthStatus | null, isParen: boolean}[] = [];
        const regex = /([^:]+?)\s*:\s*(\w+)/g;
        let m;
        while ((m = regex.exec(combatantsPart)) !== null) {
            let name = m[1].trim();
            const status = findStatus(m[2]);
            
            name = name.replace(/^(?:[A-Z]+\s+)+/, ''); // strip flags like CW, R
            name = name.replace(/\s*\(x\)$/, '').trim();
            
            let isParen = false;
            if (name.startsWith('(')) {
                isParen = true;
                name = name.replace(/^\(/, '');
            }
            
            name = name.replace(/^[\)\s]+/, '').replace(/[\(\)\s]+$/, '').trim();
            
            if (name.startsWith('*') && name.endsWith('*')) {
                name = name.substring(1, name.length-1);
            }
            
            const isVitalPrefix = /^(hp|m|v|t|e|w|move|mana|tired)$/i.test(name);
            if (status && !isVitalPrefix && name.length > 0) {
                pairs.push({ name, status, isParen });
            }
        }

        let oppName: string | null = null;
        let oppStatus: CombatHealthStatus | null = null;
        let buffName: string | null = null;
        let buffStatus: CombatHealthStatus | null = null;

        pairs.forEach(p => {
            if (p.isParen) {
                buffName = p.name;
                buffStatus = p.status;
            } else if (!oppName) {
                oppName = p.name;
                oppStatus = p.status;
            } else if (!buffName) {
                buffName = p.name;
                buffStatus = p.status;
            }
        });

        if (oppName && oppStatus) {
            setOpponentName(oppName);
            setOpponentHealthStatus(oppStatus);
            setInCombat(true);
        } else {
            setOpponentHealthStatus(null);
            setOpponentName(null);
            setInCombat(false);
        }

        if (buffName && buffStatus) {
            setBufferName(buffName);
            setBufferHealthStatus(buffStatus);
        } else if (!promptPart.includes('Buff:')) {
            setBufferName(null);
            setBufferHealthStatus(null);
        }

        const isEndPrompt = (!!textPMatch && !attachedText && !['practice', 'who', 'shop', 'where', 'quest', 'stat', 'info', 'whois', 'description'].includes(captureStage.current as any)) || 
            (/^((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-]|\([^)]+\))\s*)*[>])\s*$/.test(textOnly)) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:') && textOnly.includes('>'));

        return { isMatch: true, promptPart, attachedText, isEndPrompt };
    }, [captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setInCombat, finalizeCapture]);

    return { parsePrompt };
}
