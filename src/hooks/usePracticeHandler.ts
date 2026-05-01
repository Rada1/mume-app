import { useState, useRef, useCallback } from 'react';
import { PracticeData, PracticeSkill } from '../types';

export function usePracticeHandler(
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
) {
    const isPracticeActiveRef = useRef(false);
    const isAtGuildmasterRef = useRef(false);
    // Set when a silent/system practice command is issued (e.g. on initial connect).
    // Survives intermediate prompt-triggered finalizations so the response is always suppressed.
    const silentSyncPendingRef = useRef(false);
    const [isPracticeActive, setIsPracticeActiveState] = useState(false);
    const setIsPracticeActive = useCallback((val: boolean) => {
        isPracticeActiveRef.current = val;
        setIsPracticeActiveState(val);
    }, []);

    const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
    const [isUiRequested, setIsUiRequested] = useState(false);
    const lastPracticedSkillRef = useRef<string | null>(null);
    const parsedSkillsRef = useRef<PracticeSkill[]>([]);
    const practiceLogBufferRef = useRef<{ type: 'header' | 'skill', data: any, text: string }[]>([]);

    const setLastPracticedSkill = (skill: string | null) => {
        lastPracticedSkillRef.current = skill;
    };

    const parsePracticeLine = useCallback((text: string): PracticeSkill | null | boolean | { sessionsLeft: number } => {
        const lower = text.toLowerCase();

        // 1. Detect sessions left (Reset marker)
        // MUME examples: 
        // "You have 33 practice sessions left to spend."
        // "You have 33 sessions left to spend."
        // "You have 5 practice sessions available."
        const sessionMatch = text.match(/You have (\d+)/i) || text.match(/(\d+) (?:practice )?sessions?/i);
        
        if (sessionMatch && lower.includes('session')) {
            const count = parseInt(sessionMatch[1]);
            console.log(`[PracticeHandler] DETECTED SESSIONS: ${count} from line: "${text}"`);
            setIsPracticeActive(true);
            isAtGuildmasterRef.current = false; // Reset for new capture
            parsedSkillsRef.current = []; // Fresh start for this capture
            setPracticeData(prev => ({
                sessionsLeft: count,
                skills: prev?.skills || [], // Keep old skills until finalize
                isAtGuildmaster: false
            }));
            return { sessionsLeft: count };
        }

        if ((lower.includes('skill') && lower.includes('knowledge')) || lower.includes('can teach you') || text.startsWith('---')) {
            console.log('[PracticeHandler] Detected header/separator:', text);
            // Don't reset parsedSkillsRef here, as headers can appear mid-list
            setIsPracticeActive(true);
            return true;
        }

        if (isPracticeActiveRef.current) {
            // MUME output columns: [Skill Name]  [Sessions]  [Knowledge]  [Difficulty]  [Class]
            const parts = text.trim().split(/\s{2,}/).filter(p => p.length > 0);
            const knowledgeMap: Record<string, string> = {
                'awful': '15%', 'bad': '30%', 'poor': '45%', 'average': '60%', 'fair': '70%', 'good': '80%', 'very good': '90%', 'excellent': '98%', 'superb': '100%',
            };

            const compactMatch = text.trim().match(/^(.+?)\s+(very good|awful|bad|poor|average|fair|good|excellent|superb|\d+%)\s+(.+?)\s+(ranger|warrior|mage|cleric|thief|none)(?:\s+.*)?$/i);
            if (compactMatch && parts.length < 2) {
                const [, name, knowledgeStr, difficulty, rawClass] = compactMatch;
                const isExplicitNone = rawClass.toLowerCase() === 'none';
                const skillClass = isExplicitNone ? 'Ranger' : rawClass.charAt(0).toUpperCase() + rawClass.slice(1).toLowerCase();
                const mappedPercentage = knowledgeMap[knowledgeStr.toLowerCase()];
                const proficiency = mappedPercentage ? parseInt(mappedPercentage) : (parseInt(knowledgeStr) || 0);

                const skill: PracticeSkill = {
                    name: name.trim(), sessions: '', knowledge: knowledgeStr, proficiency, difficulty: difficulty.trim(), advice: '', skillClass
                };

                parsedSkillsRef.current.push(skill);
                console.log(`[PracticeHandler] Parsed compact skill: "${skill.name}" | Knowledge: ${skill.knowledge} | Class: ${skill.skillClass}`);
                return skill;
            }

            if (parts.length >= 2) {
                const name = parts[0].trim();

                // Detect sessions column: matches "N/N" or "N/ N" pattern (e.g. "2/10", "0/ 9")
                const sessionPattern = /^\d+\/\s*\d+$/;
                const hasSessionsCol = parts.length >= 3 && sessionPattern.test(parts[1].trim());
                
                if (hasSessionsCol) {
                    (isAtGuildmasterRef as any).current = true;
                }

                const sessionsStr = hasSessionsCol ? parts[1].trim().replace(/\s+/g, '') : '';
                const knowledgeStr = (hasSessionsCol ? parts[2] : parts[1])?.trim() || '';
                const difficulty    = (hasSessionsCol ? parts[3] : parts[2])?.trim() || '';
                const rawClass = (hasSessionsCol ? parts[4] : parts[3])?.trim();
                const isExplicitNone = rawClass?.toLowerCase() === 'none';
                let skillClass = rawClass || 'Ranger';

                // Multi-word values (e.g. "Easy to improve") are advice, not a class name
                if (!skillClass || isExplicitNone || skillClass.includes(' ')) skillClass = 'Ranger';

                const mappedPercentage = knowledgeMap[knowledgeStr.toLowerCase()];
                // Keep percentage if numeric, otherwise keep word
                const knowledge = knowledgeStr.includes('%') ? knowledgeStr : knowledgeStr;
                const proficiency = mappedPercentage ? parseInt(mappedPercentage) : (parseInt(knowledgeStr) || 0);

                // Heuristic for skills if the class column is missing or ambiguous
                const skillNameLower = name.toLowerCase();
                const warriorSkills = ['bash', 'kick', 'rescue', 'slashing', 'stabbing', 'two-handed', 'cleaving', 'concussion', 'parry', 'endurance', 'shield parry'];
                const mageSkills = ['magic', 'spell', 'meditate', 'staff'];
                const clericSkills = ['pray', 'bless', 'healing', 'percieve'];
                const thiefSkills = ['hide', 'sneak', 'steal', 'backstab', 'pick lock', 'search', 'climb', 'trap'];

                // If it came in as Ranger (our default) or missing, try more specific heuristics,
                // BUT only if it wasn't explicitly labeled as "None" by the game.
                if (!isExplicitNone && (skillClass === 'Ranger' || !rawClass)) {
                    if (warriorSkills.some(s => skillNameLower.includes(s))) skillClass = 'Warrior';
                    else if (mageSkills.some(s => skillNameLower.includes(s))) skillClass = 'Mage';
                    else if (clericSkills.some(s => skillNameLower.includes(s))) skillClass = 'Cleric';
                    else if (thiefSkills.some(s => skillNameLower.includes(s))) skillClass = 'Thief';
                    // Defaults to Ranger if none of the above
                    else skillClass = 'Ranger';
                }

                // Accept any line that has a sessions column OR a recognisable knowledge value
                if (hasSessionsCol || proficiency > 0 || knowledgeStr.includes('%') || mappedPercentage) {
                    const skill: PracticeSkill = {
                        name, sessions: sessionsStr, knowledge, proficiency, difficulty, advice: '', skillClass
                    };

                    console.log(`[PracticeHandler] Parsed skill: "${skill.name}" | Sessions: ${skill.sessions} | Knowledge: ${skill.knowledge} | Difficulty: ${skill.difficulty} | Class: ${skill.skillClass} (GM: ${isAtGuildmasterRef.current})`);
                    parsedSkillsRef.current.push(skill);
                    return skill;
                } else {
                    console.log(`[PracticeHandler] Skipping line (unrecognised): "${text}"`);
                }
            }
        }

        // 4. Update Message
        // Regex robustly handles prepended prompts (e.g. "*[ CW HP:Hurt>You took...") and captures:
        // 1. Sessions taken, 2. Max sessions for skill (remaining), 3. New knowledge %
        const updateMatch = text.match(/You took (\d+) out of (\d+) sessions?.*knowledge is now (\d+)%/i);
        if (updateMatch) {
            const [_, taken, remaining, newKnowledge] = updateMatch;
            const skillName = lastPracticedSkillRef.current;
            console.log(`[PracticeHandler] DETECTED UPDATE: ${taken}/${remaining} sessions, ${newKnowledge}% knowledge for skill: ${skillName}`);
            if (skillName) {
                setPracticeData(prev => {
                    if (!prev) return prev;
                    
                    const skills = prev.skills.map(s => 
                        s.name.toLowerCase() === skillName.toLowerCase() 
                            ? { ...s, sessions: `${taken}/${remaining}`, knowledge: newKnowledge + '%', proficiency: parseInt(newKnowledge) }
                            : s
                    );

                    // Decrement total sessions left (each 'practice' call spends 1 session)
                    const sessionsLeft = Math.max(0, prev.sessionsLeft - 1);
                    
                    return { ...prev, skills, sessionsLeft };
                });
                const normalizedName = skillName.trim().toLowerCase();
                setAbilities(prevAbils => ({ ...prevAbils, [normalizedName]: parseInt(newKnowledge) }));
            }
            return false;
        }

        return false;
    }, [setIsPracticeActive, setAbilities]);

    const finalizePractice = useCallback((
        addMessage?: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void,
        setPopoverState?: (state: any) => void
    ) => {
        const skillsToSet = [...parsedSkillsRef.current];
        const logBuffer = [...practiceLogBufferRef.current];

        console.log('[PracticeHandler] Finalizing practice capture. Parsed skills:', skillsToSet.length);
        
        // Always clear the log buffer so stale entries don't accumulate across captures
        practiceLogBufferRef.current = [];

        if (skillsToSet.length > 0) {
            // Real data received — clear the pending silent sync flag
            silentSyncPendingRef.current = false;

            setPracticeData(prev => prev ? {
                ...prev,
                skills: skillsToSet,
                isAtGuildmaster: isAtGuildmasterRef.current
            } : {
                sessionsLeft: 0,
                skills: skillsToSet,
                isAtGuildmaster: isAtGuildmasterRef.current
            });

            setAbilities(prev => {
                const next = { ...prev };
                skillsToSet.forEach(s => {
                    next[s.name.toLowerCase()] = s.proficiency;
                });
                return next;
            });

            // CRITICAL: Clear the buffer after we've processed it
            parsedSkillsRef.current = [];
        }
    }, [setAbilities]);

    const addToLogBuffer = (type: 'header' | 'skill', data: any, text: string) => {
        practiceLogBufferRef.current.push({ type, data, text });
    };

    return {
        isPracticeActive,
        setIsPracticeActive,
        practiceData,
        setPracticeData,
        parsePracticeLine,
        setLastPracticedSkill,
        lastPracticedSkill: lastPracticedSkillRef,
        isUiRequested,
        setIsUiRequested,
        finalizePractice,
        addToLogBuffer,
        silentSyncPendingRef,
        setSilentSyncPending: (val: boolean) => { silentSyncPendingRef.current = val; }
    };
}
