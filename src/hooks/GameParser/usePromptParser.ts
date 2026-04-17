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
        
        if (!textPMatch) return { isMatch: false, promptPart: '', attachedText: '', isEndPrompt: false, isGameplayPrompt: false };

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
            // In spectate mode, the user's own prompt should NOT update the spectated target's status.
            // All spectator stats must rely solely on Char.Vitals log-parsed GMCP.
            if (!isSpectateMode) {
                setPlayerHealthStatus(status ?? 'Healthy');
            }
        } else if (!isSpectateMode) {
            setPlayerHealthStatus('Healthy');
        }

        // NOTE: 'waiting' (casting) state is driven exclusively by GMCP Group position updates
        // (see useGmcpGroup.ts). Do NOT derive it from the prompt — the prompt arrives on every
        // tick and would immediately race with and override the GMCP 'true', breaking both the
        // cancel-button visibility and the audio stop mechanism.
// --- Combat Health Extraction (Opponents and Tanks/Buffers) ---
        // This is moved up so we can use the 'pairs' detection to verify hasFighting
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

        // NOTE: spectateInCombat is driven exclusively by Char.Vitals GMCP position field
        // (in useLogGmcpParser). Do NOT set it here — parsePrompt fires on the user's own
        // prompt too, so prompt-based detection would incorrectly trigger combat music
        // whenever the user themselves is fighting while spectating someone else.

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
        } else if (!isSpectateMode) {
            setOpponentHealthStatus(null);
            setOpponentName(null);
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
        // Matches both "87/98 hits, 46/130 mana, and 100/106 moves."
        // and "487/522 hits and 142/160 moves." (mana absent for non-caster classes)
        const verboseRegex = /(\d+)\/(\d+)\s+hits(?:,?\s+(\d+)\/(\d+)\s+mana)?,?\s+and\s+(\d+)\/(\d+)\s+moves/i;
        const verboseMatch = textOnly.match(verboseRegex);
        if (verboseMatch) {
            const hp = parseInt(verboseMatch[1]);
            const maxHp = parseInt(verboseMatch[2]);
            const hasMana = verboseMatch[3] !== undefined;
            const mana = hasMana ? parseInt(verboseMatch[3]) : undefined;
            const maxMana = hasMana ? parseInt(verboseMatch[4]) : undefined;
            const move = parseInt(verboseMatch[5]);
            const maxMove = parseInt(verboseMatch[6]);
            if (isSpectateMode) {
                setSpectateStats(prev => ({
                    ...prev,
                    hp, maxHp,
                    move, maxMove,
                    ...(mana !== undefined ? { mana, maxMana } : {})
                }));
            } else {
                deps.setStats(prev => ({
                    ...prev,
                    hp, maxHp,
                    move, maxMove,
                    ...(mana !== undefined ? { mana, maxMana } : {})
                }));
            }
        }

        const isGameplayPrompt = /HP:\w+|MA:\w+|MV:\w+|SP:\w+/i.test(promptPart);

        return { isMatch: true, promptPart, attachedText, isEndPrompt, isGameplayPrompt };
    }, [
        captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, 
        setBufferHealthStatus, setBufferName, finalizeCapture,
        isSpectateMode, setSpectateStats, setSpectateHealthStatus, 
        setSpectateOpponentName, setSpectateOpponentStatus, setSpectateInCombat
    ]);

    return { parsePrompt };
}
