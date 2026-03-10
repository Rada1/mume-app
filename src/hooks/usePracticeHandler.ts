import { useState, useRef, useCallback } from 'react';
import { PracticeData, PracticeSkill } from '../types';

export function usePracticeHandler(
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void
) {
    const [isPracticeActive, setIsPracticeActive] = useState(false);
    const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
    const [isUiRequested, setIsUiRequested] = useState(false);
    const lastPracticedSkillRef = useRef<string | null>(null);
    const parsedSkillsRef = useRef<PracticeSkill[]>([]);

    const setLastPracticedSkill = (skill: string | null) => {
        lastPracticedSkillRef.current = skill;
    };

    const parsePracticeLine = useCallback((text: string): PracticeSkill | null | boolean | { sessionsLeft: number } => {
        const lower = text.toLowerCase();

        // 1. Detect sessions left (Reset marker)
        const sessionMatch = text.match(/You have (\d+) practice sessions? left\./i);
        if (sessionMatch) {
            setIsPracticeActive(true);
            parsedSkillsRef.current = [];
            setPracticeData({
                sessionsLeft: parseInt(sessionMatch[1]),
                skills: []
            });
            return { sessionsLeft: parseInt(sessionMatch[1]) };
        }

        // 2. Detect header/separator
        if (lower.includes('skill / spell') || lower.includes('can teach you') || text.startsWith('---')) {
            setIsPracticeActive(true);
            return true;
        }

        // 3. Parse Table Row
        const rowRegex = /^([a-zA-Z\s\-]+?)\s+(\d+\/\d+)\s+(\d+)%\s+([a-zA-Z\s]+?)\s{2,}(.*)$/;
        const rowMatch = text.match(rowRegex);

        if (rowMatch && isPracticeActive) {
            const [_, name, sessions, knowledge, difficulty, advice] = rowMatch;
            const skill: PracticeSkill = {
                name: name.trim(),
                sessions: sessions.trim(),
                knowledge: knowledge.trim() + '%',
                proficiency: parseInt(knowledge),
                difficulty: difficulty.trim(),
                advice: advice.trim()
            };

            parsedSkillsRef.current.push(skill);
            setPracticeData(prev => prev ? {
                ...prev,
                skills: [...parsedSkillsRef.current]
            } : null);

            // Sync with global abilities state
            setAbilities(prev => ({
                ...prev,
                [skill.name.toLowerCase()]: skill.proficiency
            }));
            return skill;
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
                            return {
                                ...s,
                                knowledge: newKnowledge + '%',
                                proficiency: parseInt(newKnowledge),
                                sessions: newSessions
                            };
                        }
                        return s;
                    });

                    // Sync global abilities
                    setAbilities(prevAbils => ({
                        ...prevAbils,
                        [normalizedName]: parseInt(newKnowledge)
                    }));

                    return {
                        ...prev,
                        sessionsLeft: parseInt(remaining),
                        skills: newSkills
                    };
                });
            }
            return false; // Show the update text in log
        }

        return false;
    }, [isPracticeActive, setAbilities]);

    return {
        isPracticeActive,
        setIsPracticeActive,
        practiceData,
        setPracticeData,
        parsePracticeLine,
        setLastPracticedSkill,
        lastPracticedSkill: lastPracticedSkillRef,
        isUiRequested,
        setIsUiRequested
    };
}
