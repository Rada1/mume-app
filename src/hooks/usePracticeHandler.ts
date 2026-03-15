import { useState, useRef, useCallback } from 'react';
import { PracticeData, PracticeSkill } from '../types';

export function usePracticeHandler(
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
) {
    const isPracticeActiveRef = useRef(false);
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
        const sessionMatch = text.match(/You have (\d+) practice sessions? left\./i);
        if (sessionMatch) {
            console.log('[PracticeHandler] Detected sessions left:', sessionMatch[1]);
            setIsPracticeActive(true);
            parsedSkillsRef.current = [];
            setPracticeData({
                sessionsLeft: parseInt(sessionMatch[1]),
                skills: []
            });
            return { sessionsLeft: parseInt(sessionMatch[1]) };
        }

        if ((lower.includes('skill') && lower.includes('knowledge')) || lower.includes('can teach you') || text.startsWith('---')) {
            console.log('[PracticeHandler] Detected header/separator:', text);
            setIsPracticeActive(true);
            return true;
        }

        if (isPracticeActiveRef.current) {
            // MUME output columns: [Skill Name]  [Knowledge]  [Difficulty]  [Class]
            // We split by multiple spaces OR single tab
            const parts = text.trim().split(/\s{2,}/).filter(p => p.length > 0);
            
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const knowledgeStr = parts[1].trim();
                const difficulty = parts[2]?.trim() || '';
                let skillClass = parts[3]?.trim() || 'Ranger';
                if (skillClass.toLowerCase() === 'none') skillClass = 'Ranger';
                const advice = ''; 

                const knowledgeMap: Record<string, string> = {
                    'bad': '25%', 'poor': '45%', 'average': '60%', 'fair': '75%', 'good': '85%', 'excellent': '95%', 'superb': '100%',
                };

                const knowledge = knowledgeMap[knowledgeStr.toLowerCase()] || knowledgeStr;
                const proficiency = parseInt(knowledge) || 0;

                const skill: PracticeSkill = {
                    name, sessions: '0/0', knowledge, proficiency, difficulty, advice, skillClass
                };

                console.log('[PracticeHandler] Parsed skill:', skill.name, skill.knowledge, skill.skillClass);
                parsedSkillsRef.current.push(skill);
                return skill;
            } else if (text.trim().length > 0) {
                 console.log('[PracticeHandler] Line too short for skill:', text);
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
        console.log('[PracticeHandler] Finalizing practice capture. Parsed skills:', parsedSkillsRef.current.length);
        if (parsedSkillsRef.current.length > 0) {
            setPracticeData(prev => prev ? {
                ...prev,
                skills: [...parsedSkillsRef.current]
            } : {
                sessionsLeft: 0,
                skills: [...parsedSkillsRef.current]
            });

            setAbilities(prev => {
                const next = { ...prev };
                parsedSkillsRef.current.forEach(s => {
                    next[s.name.toLowerCase()] = s.proficiency;
                });
                return next;
            });

            if (addMessage && practiceLogBufferRef.current.length > 0) {
                const buffer = [...practiceLogBufferRef.current];
                practiceLogBufferRef.current = [];
                setTimeout(() => {
                    buffer.forEach((msg, idx) => {
                        if (msg.type === 'header') {
                            addMessage('practice-header', msg.text, undefined, `prac-hdr-${Date.now()}`, false, undefined, undefined, undefined, msg.data, true);
                        } else {
                            addMessage('practice-skill', msg.text, undefined, `prac-${msg.data.name}-${Date.now()}-${idx}`, false, undefined, undefined, msg.data);
                        }
                    });
                }, 10);
            }
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
        addToLogBuffer
    };
}
