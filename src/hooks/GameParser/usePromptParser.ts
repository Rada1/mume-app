/**
 * @file usePromptParser.ts
 * @description Parses MUME prompts to extract health status, combatants, and attached text.
 */

import { useCallback } from 'react';
import { CombatHealthStatus, CaptureStage, GameStats } from '../../types';

export interface PromptParserDeps {
    captureStage: React.MutableRefObject<CaptureStage>;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferName: (val: string | null) => void;
    setInCombat: (val: boolean, force?: boolean) => void;
    finalizeCapture: (targetStage?: CaptureStage) => boolean;
    isSpectateMode?: boolean;
    setStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateStats: (stats: GameStats | ((prev: GameStats) => GameStats)) => void;
    setSpectateHealthStatus: (status: CombatHealthStatus | null) => void;
    setSpectateOpponentName: (val: string | null) => void;
    setSpectateOpponentStatus: (val: CombatHealthStatus | null) => void;
    setSpectateInCombat: (val: boolean) => void;
}

const HEALTH_MAP: Record<string, CombatHealthStatus> = {
    'healthy': 'Healthy',
    'fine': 'Fine',
    'hurt': 'Hurt',
    'wounded': 'Wounded',
    'bad': 'Bad',
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
        finalizeCapture,
        isSpectateMode,
        setSpectateStats,
        setSpectateHealthStatus,
        setSpectateOpponentName,
        setSpectateOpponentStatus,
        setSpectateInCombat
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
        
        if (captureStage.current !== 'none' && !attachedText) {
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

        // --- Condition Extraction from Flags (W, !, etc.) ---
        const hasWaiting = /[\s\*\[\(\!]\*[\s\*\]\)>]/.test(promptPart);
        const hasFighting = /[\s\*\[\(\!]![\s\*\]\)>]/.test(promptPart);

        if (isSpectateMode) {
            setSpectateStats(prev => ({
                ...prev,
                conditions: { ...prev.conditions, waiting: hasWaiting }
            }));
            if (hasFighting) setSpectateInCombat(true);
        } else {
            if (hasFighting) setInCombat(true);
            deps.setStats(prev => ({
                ...prev,
                conditions: { ...prev.conditions, waiting: hasWaiting }
            }));
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
            
            name = name.replace(/^\[[A-Z\s]+\]\s*/, ''); // strip flags like [R], [CW]
            name = name.replace(/^(?:[A-Z]+\s+)+/, ''); // strip flags like CW, R
            name = name.replace(/\s*\(x\)$/, '').trim();
            
            let isParen = false;
            if (name.startsWith('(')) {
                isParen = true;
                name = name.replace(/^\(/, '');
            }
            
            // Strip common prompt symbols that might be captured as part of the name
            name = name.replace(/^[\]\)\s\!\*\:\+\#\?\=\[><\.]+/, '').replace(/[\[\(\s\!\*\:\+\#\?\=\]><\.]+$/, '').trim();
            
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
            if (!isSpectateMode) setInCombat(true);
        } else if (!isSpectateMode) {
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

        // --- Verbose Status Parsing (Spectate Mode / Snooped Stat) ---
        // Example: "87/98 hits, 46/130 mana, and 100/106 moves."
        const verboseRegex = /(\d+)\/(\d+)\s+hits,?\s+(\d+)\/(\d+)\s+mana,?\s+and\s+(\d+)\/(\d+)\s+moves/i;
        const verboseMatch = textOnly.match(verboseRegex);
        if (verboseMatch) {
            const stats = {
                hp: parseInt(verboseMatch[1]),
                maxHp: parseInt(verboseMatch[2]),
                mana: parseInt(verboseMatch[3]),
                maxMana: parseInt(verboseMatch[4]),
                move: parseInt(verboseMatch[5]),
                maxMove: parseInt(verboseMatch[6]),
                wimpy: 0
            };
            if (isSpectateMode) {
                setSpectateStats(stats);
            } else {
                deps.setStats(stats);
            }
        }

        return { isMatch: true, promptPart, attachedText, isEndPrompt };
    }, [
        captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, 
        setBufferHealthStatus, setBufferName, setInCombat, finalizeCapture,
        isSpectateMode, setSpectateStats, setSpectateHealthStatus, 
        setSpectateOpponentName, setSpectateOpponentStatus, setSpectateInCombat
    ]);

    return { parsePrompt };
}
