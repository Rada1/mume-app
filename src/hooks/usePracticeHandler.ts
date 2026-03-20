import { useState, useRef, useCallback } from 'react';
import { PracticeData, PracticeSkill } from '../types';

export function usePracticeHandler(
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
) {
    const isPracticeActiveRef = useRef(false);
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
            parsedSkillsRef.current = []; // Fresh start for this capture
            setPracticeData(prev => ({
                sessionsLeft: count,
                skills: prev?.skills || [] // Keep old skills until finalize
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

            if (parts.length >= 2) {
                const name = parts[0].trim();

                // Detect sessions column: matches "N/N" or "N/ N" pattern (e.g. "2/10", "0/ 9")
                const sessionPattern = /^\d+\/\s*\d+$/;
                const hasSessionsCol = parts.length >= 3 && sessionPattern.test(parts[1].trim());

                const sessionsStr = hasSessionsCol ? parts[1].trim().replace(/\s+/g, '') : '';
                const knowledgeStr = (hasSessionsCol ? parts[2] : parts[1])?.trim() || '';
                const difficulty    = (hasSessionsCol ? parts[3] : parts[2])?.trim() || '';
                let skillClass      = (hasSessionsCol ? parts[4] : parts[3])?.trim() || 'General';
                // Multi-word values (e.g. "Easy to improve") are advice, not a class name
                if (!skillClass || skillClass.toLowerCase() === 'none' || skillClass.includes(' ')) skillClass = 'General';

                const knowledgeMap: Record<string, string> = {
                    'awful': '15%', 'bad': '30%', 'poor': '45%', 'average': '60%', 'fair': '70%', 'good': '80%', 'very good': '90%', 'excellent': '98%', 'superb': '100%',
                };

                const knowledge = knowledgeMap[knowledgeStr.toLowerCase()] || (knowledgeStr.includes('%') ? knowledgeStr : knowledgeStr + '%');
                const proficiency = parseInt(knowledge) || 0;

                // Heuristic for skills if the class column is missing or ambiguous
                const skillNameLower = name.toLowerCase();
                const warriorSkills = ['bash', 'kick', 'rescue', 'slashing weapons', 'stabbing weapons', 'two-handed weapons', 'cleaving weapons', 'concussion weapons', 'parry', 'endurance', 'shield parry'];
                const rangerSkills = ['tracking', 'scout', 'herblore', 'skin', 'wilderness'];
                
                if (skillClass === 'General') {
                    if (warriorSkills.some(s => skillNameLower.includes(s))) skillClass = 'Warrior';
                    else if (rangerSkills.some(s => skillNameLower.includes(s))) skillClass = 'Ranger';
                }

                // Accept any line that has a sessions column OR a recognisable knowledge value
                if (hasSessionsCol || proficiency > 0 || knowledgeStr.includes('%')) {
                    const skill: PracticeSkill = {
                        name, sessions: sessionsStr, knowledge: knowledge.replace('%', ''), proficiency, difficulty, advice: '', skillClass
                    };

                    console.log(`[PracticeHandler] Parsed skill: "${skill.name}" | Sessions: ${skill.sessions} | Knowledge: ${skill.knowledge}% | Difficulty: ${skill.difficulty} | Class: ${skill.skillClass}`);
                    parsedSkillsRef.current.push(skill);
                    return skill;
                } else {
                    console.log(`[PracticeHandler] Skipping line (unrecognised): "${text}"`);
                }
            }
        }

        // 4. Update Message
        const updateMatch = text.match(/You took (\d+) out of (\d+) sessions?.*knowledge is now (\d+)%/i);
        if (updateMatch) {
            const [_, taken, remaining, newKnowledge] = updateMatch;
            const skillName = lastPracticedSkillRef.current;
            if (skillName) {
                setPracticeData(prev => {
                    if (!prev) return prev;
                    const normalizedName = skillName.trim().toLowerCase();
                    const newSkills = prev.skills.map(s => {
                        if (s.name.toLowerCase() === normalizedName) {
                            const sessionMatch = s.sessions.match(/(\d+)\/(\d+)/);
                            let newSessions = s.sessions;
                            if (sessionMatch) {
                                const [__, _, max] = sessionMatch;
                                newSessions = `${taken}/${max}`;
                            }
                            return { ...s, knowledge: newKnowledge + '%', proficiency: parseInt(newKnowledge), sessions: newSessions };
                        }
                        return s;
                    });
                    setAbilities(prevAbils => ({ ...prevAbils, [normalizedName]: parseInt(newKnowledge) }));
                    return { ...prev, sessionsLeft: parseInt(remaining), skills: newSkills };
                });
            }
            return false;
        }

        return false;
    }, [setIsPracticeActive, setAbilities]);

    const finalizePractice = useCallback((addMessage?: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void) => {
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
                skills: skillsToSet
            } : {
                sessionsLeft: 0,
                skills: skillsToSet
            });

            setAbilities(prev => {
                const next = { ...prev };
                skillsToSet.forEach(s => {
                    next[s.name.toLowerCase()] = s.proficiency;
                });
                return next;
            });

            if (addMessage && logBuffer.length > 0) {
                setTimeout(() => {
                    const now = Date.now();

                    // Column header (includes session count extracted from the log buffer)
                    const headerMsg = logBuffer.find(m => m.type === 'header' && m.data && typeof m.data === 'object' && 'sessionsLeft' in m.data);
                    const sessionsLeft = headerMsg ? (headerMsg.data as any).sessionsLeft : 0;
                    
                    console.log(`[PracticeHandler] Finalizing UI. Sessions from buffer: ${sessionsLeft}`, { hasHeader: !!headerMsg });
                    
                    addMessage('practice-column-header' as any, '', undefined, `prac-col-hdr-${now}`, false, undefined, undefined, undefined, { sessionsLeft }, true);

                    // Group skill entries by class, preserving encounter order
                    const classOrder: string[] = [];
                    const byClass: Record<string, typeof logBuffer> = {};
                    logBuffer
                        .filter(m => m.type === 'skill')
                        .forEach(msg => {
                            const cls: string = (msg.data as { skillClass?: string }).skillClass || 'General';
                            if (!byClass[cls]) {
                                classOrder.push(cls);
                                byClass[cls] = [];
                            }
                            byClass[cls].push(msg);
                        });

                    // Only show class dividers when skills actually span multiple real classes
                    const showClassHeaders = classOrder.length > 1 || (classOrder.length === 1 && classOrder[0] !== 'General');

                    classOrder.forEach(cls => {
                        if (showClassHeaders) {
                            addMessage('practice-class-header' as any, cls, undefined, `prac-cls-${cls}-${now}`, false, undefined, undefined, undefined, undefined, true);
                        }
                        byClass[cls].forEach((msg, idx) => {
                            addMessage('practice-skill', msg.text, undefined, `prac-${msg.data.name}-${now}-${idx}`, false, undefined, undefined, msg.data);
                        });
                    });
                }, 10);
            }

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
