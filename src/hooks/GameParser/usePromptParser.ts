/**
 * @file usePromptParser.ts
 * @description Parses MUME prompts to extract health status, combatants, and attached text.
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
        capture,
        setPlayerHealthStatus,
        setOpponentHealthStatus,
        setOpponentName,
        setBufferHealthStatus,
        setBufferName,
        isSpectateMode,
        setSpectateStats
    } = deps;

    const findStatus = (str: string): CombatHealthStatus | null => {
        const s = str.toLowerCase();
        for (const [key, val] of Object.entries(HEALTH_MAP)) {
            if (s.includes(key)) return val;
        }
        return null;
    };

    const parsePrompt = useCallback((textOnly: string, isSnoop: boolean = false) => {
        // Robust MUME prompt detection:
        // 1. Traditional prompts: HP:Fine MA:Fine >
        // 2. Symbols-only prompts: ![ C iM NN NS 15092[150:92]
        // 3. Bracketed prompts: [87%H 40%M]
        const promptRegex = /^(([^\r\n<>]*[>])\s*|^([\[\!\*\(][^\]\)\r\n]{5,}[\]\)\>]\s*))/;
        const textPMatch = textOnly.match(promptRegex);
        
        if (!textPMatch) return { isMatch: false, promptPart: '', attachedText: '', isEndPrompt: false, isGameplayPrompt: false };

        const promptPart = textPMatch[0];
        const attachedText = textOnly.slice(promptPart.length).trim();
        
        // Finalize reactive capture session on prompt if no attached text
        if (capture.hasSession() && !attachedText) {
            capture.finalizeSession();
        }

        // --- Combat Health Extraction ---
        // 1. Player Health
        const playerMatch = promptPart.match(/HP:(\w+)/i);
        if (playerMatch) {
            const status = findStatus(playerMatch[1]);
            // In spectate mode, the user's own prompt should NOT update the spectated target's status.
            // All spectator stats must rely solely on Char.Vitals log-parsed GMCP or snooped prompts.
            if (isSnoop) {
                // We don't have a direct setter for spectate health status from prompt yet,
                // but we could add it if needed. For now, verbose prompts handle actual numbers.
            } else if (!isSpectateMode) {
                setPlayerHealthStatus(status ?? 'Healthy');
            }
        } else if (!isSpectateMode && !isSnoop) {
            setPlayerHealthStatus('Healthy');
        }

        // NOTE: 'waiting' (casting) state is driven exclusively by GMCP Group position updates
        // (see useGmcpGroup.ts). Do NOT derive it from the prompt — the prompt arrives on every
        // tick and would immediately race with and override the GMCP 'true', breaking both the
        // cancel-button visibility and the audio stop mechanism.
        const hasAttachedCombatStatus = /:\s*(healthy|fine|hurt|wounded|bad|awful|stunned|dying|bleeding)\b/i.test(attachedText);
        const combatStatusSource = hasAttachedCombatStatus ? attachedText : promptPart;

// --- Combat Health Extraction (Opponents and Tanks/Buffers) ---
        // This is moved up so we can use the 'pairs' detection to verify hasFighting
        const combatantsPart = combatStatusSource
            .replace(/\b(?:HP|MA|MV|SP|Move|Mana)\s*:\s*\w+/gi, '') // Remove vital statuses
            .replace(/^[\*\)\!\(\[\]oO\.f%\~+WU:=O\#\?\s\-]+/, '') // Remove leading prompt symbols
            .replace(/^.*\]\s+(?=[^:]+:\s*\w+\s*$)/, '')
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
            name = name.replace(/^[\]\)\s\!\*\:\+\#\?\=\[><\.]+/, '').replace(/[\[\(\s\!\*\:\+\#\?\=\]\]><\.]+$/, '').trim();
            
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
            if (isSnoop) {
                // If it's a snooped prompt, we update spectate opponent
                if (deps.setSpectateOpponentName) deps.setSpectateOpponentName(oppName);
                if (deps.setSpectateOpponentStatus) deps.setSpectateOpponentStatus(oppStatus);
            } else {
                setOpponentName(oppName);
            }
        } else if (!isSpectateMode && !isSnoop && !deps.inCombatRef?.current) {
            setOpponentHealthStatus(null);
            setOpponentName(null);
        }

        if (buffName && buffStatus) {
            setBufferName(buffName);
            setBufferHealthStatus(buffStatus);
        } else if (!promptPart.includes('Buff:') && !isSnoop) {
            setBufferName(null);
            setBufferHealthStatus(null);
        }

        const isEndPrompt = (!!textPMatch && !attachedText && !['practice', 'who', 'shop', 'where', 'quest', 'stat', 'info', 'whois', 'description'].includes(capture.getActiveType() as any)) || 
            (/^((?:(?:\[.*?\]|[\w\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-\s]|\([^)]+\))\s*)*[\]\)\>])\s*$/.test(textOnly)) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:'));

        // --- Verbose Status Parsing (Spectate Mode / Snooped Stat) ---
        // Matches both "87/98 hits, 46/130 mana, and 100/106 moves."
        // and "87(98) hits, 46(130) mana and 120(140) moves."
        // and "487/522 hits and 142/160 moves." (mana absent for non-caster classes)
        const verboseRegex = /(\d+)[\/\(](\d+)[\)]?\s+hits(?:,?\s+(\d+)[\/\(](\d+)[\)]?\s+mana)?,?\s+(?:and\s+)?(\d+)[\/\(](\d+)[\)]?\s+moves/i;
        const verboseMatch = textOnly.match(verboseRegex);
        if (verboseMatch) {
            const hp = parseInt(verboseMatch[1]);
            const maxHp = parseInt(verboseMatch[2]);
            const hasMana = verboseMatch[3] !== undefined;
            const mana = hasMana ? parseInt(verboseMatch[3]) : undefined;
            const maxMana = hasMana ? parseInt(verboseMatch[4]) : undefined;
            const move = parseInt(verboseMatch[5]);
            const maxMove = parseInt(verboseMatch[6]);
            if (isSnoop) {
                setSpectateStats(prev => ({
                    ...prev,
                    hp, maxHp: maxHp,
                    move, maxMove: maxMove,
                    ...(mana !== undefined ? { mana, maxMana: maxMana } : {})
                }));
            } else if (!isSpectateMode) {
                deps.setStats(prev => ({
                    ...prev,
                    hp, maxHp: maxHp,
                    move, maxMove: maxMove,
                    ...(mana !== undefined ? { mana, maxMana: maxMana } : {})
                }));
            }
        }

        const isGameplayPrompt = /HP:\w+|MA:\w+|MV:\w+|SP:\w+/i.test(promptPart);

        return { isMatch: true, promptPart, attachedText, isEndPrompt, isGameplayPrompt };
    }, [
        capture, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, 
        setBufferHealthStatus, setBufferName,
        isSpectateMode, setSpectateStats, deps
    ]);

    return { parsePrompt };
}
