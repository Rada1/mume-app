import { useState, useRef, useCallback } from 'react';
import { DrawerLine, PracticeData, PracticeSkill } from '../types';
import { getPracticeClassLabel } from '../utils/practiceClassCatalog';
import { readLastPracticedSkill, rememberLastPracticedSkill } from '../utils/practiceLastSkillMemory';

export function usePracticeHandler(
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void,
    setPracticeLines?: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void
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
    const lastPracticeUpdateKeyRef = useRef<string | null>(null);
    const parsedSkillsRef = useRef<PracticeSkill[]>([]);
    const practiceLogBufferRef = useRef<{ type: 'header' | 'skill', data: any, text: string }[]>([]);

    const setLastPracticedSkill = (skill: string | null) => {
        const nextSkill = skill?.trim() || null;
        lastPracticedSkillRef.current = nextSkill;
        rememberLastPracticedSkill(nextSkill);
    };

    const updatePracticeDrawerLine = useCallback((skillName: string, sessions: string, knowledge: string) => {
        setPracticeLines?.((prev: DrawerLine[]) => prev.map(line => {
            const sessionsLeftMatch = line.text.match(/^(You have\s+)(\d+)(\s+practice sessions? left\.?)$/i);
            if (sessionsLeftMatch) {
                const nextCount = Math.max(0, parseInt(sessionsLeftMatch[2], 10) - 1);
                const text = `${sessionsLeftMatch[1]}${nextCount}${sessionsLeftMatch[3]}`;
                return { ...line, text, rawText: text, html: text, tokens: undefined };
            }

            const escapedName = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const match = line.text.match(new RegExp(`^(\\s*${escapedName})(\\s+)(\\S+)(\\s+)(\\S+)(.*)$`, 'i'));
            const fallbackParts = line.text.trim().split(/\s{2,}/);
            const isFallbackMatch = fallbackParts[0]?.toLowerCase() === skillName.toLowerCase() && fallbackParts.length >= 3;
            if (!match && !isFallbackMatch) return line;

            const text = match
                ? `${match[1]}${match[2]}${sessions.padStart(match[3].length)}${match[4]}${knowledge.padStart(match[5].length)}${match[6]}`
                : `${fallbackParts[0]}  ${sessions}  ${knowledge}  ${fallbackParts.slice(3).join('  ')}`;
            return {
                ...line,
                text,
                rawText: text,
                html: text,
                tokens: undefined
            };
        }));
    }, [setPracticeLines]);

    const parsePracticeLine = useCallback((text: string): PracticeSkill | null | boolean | { sessionsLeft: number } => {
        const lower = text.toLowerCase();

        // 1. Detect sessions left (Reset marker)
        // MUME examples: 
        // "You have 33 practice sessions left to spend."
        // "You have 33 sessions left to spend."
        // "You have 5 practice sessions available."
        const sessionMatch = text.match(/You have (\d+)/i) || text.match(/(\d+) (?:practice )?sessions?/i);
        
        if (sessionMatch && lower.includes('session') && !lower.includes('you took')) {
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
                const trailing = (hasSessionsCol ? parts[4] : parts[3])?.trim();
                const trailingLower = trailing?.toLowerCase();
                const isClassValue = !!trailingLower && ['ranger', 'warrior', 'mage', 'cleric', 'thief', 'none'].includes(trailingLower);
                const isExplicitNone = trailingLower === 'none';
                const advice = hasSessionsCol && !isClassValue ? trailing || '' : '';
                let skillClass = isClassValue ? trailing || 'Ranger' : 'Ranger';
                const mana = !hasSessionsCol ? parts[4]?.trim() || '' : '';
                const castingTime = !hasSessionsCol ? parts[5]?.trim() || '' : '';

                // Multi-word values (e.g. "Easy to improve") are advice, not a class name
                if (!skillClass || isExplicitNone || skillClass.includes(' ')) skillClass = 'Ranger';

                const mappedPercentage = knowledgeMap[knowledgeStr.toLowerCase()];
                // Keep percentage if numeric, otherwise keep word
                const knowledge = knowledgeStr.includes('%') ? knowledgeStr : knowledgeStr;
                const proficiency = mappedPercentage ? parseInt(mappedPercentage) : (parseInt(knowledgeStr) || 0);

                const catalogClass = getPracticeClassLabel(name);
                if (!isExplicitNone && (skillClass === 'Ranger' || !isClassValue)) {
                    skillClass = catalogClass || 'Ranger';
                }

                // Accept any line that has a sessions column OR a recognisable knowledge value
                if (hasSessionsCol || proficiency > 0 || knowledgeStr.includes('%') || mappedPercentage) {
                    const skill: PracticeSkill = {
                        name, sessions: sessionsStr, knowledge, proficiency, difficulty, advice, skillClass, mana, castingTime
                    };

                    console.log(`[PracticeHandler] Parsed skill: "${skill.name}" | Sessions: ${skill.sessions} | Knowledge: ${skill.knowledge} | Difficulty: ${skill.difficulty} | Class: ${skill.skillClass} (GM: ${isAtGuildmasterRef.current})`);
                    parsedSkillsRef.current.push(skill);
                    return skill;
                } else {
                    console.log(`[PracticeHandler] Skipping line (unrecognised): "${text}"`);
                }
            }

            const continuation = text.trim();
            if (continuation && !/^-+$/.test(continuation) && parsedSkillsRef.current.length > 0) {
                const previous = parsedSkillsRef.current[parsedSkillsRef.current.length - 1];
                if (previous.advice) {
                    previous.advice = `${previous.advice} ${continuation}`;
                    return true;
                }
            }
        }

        // 4. Update Message
        // Regex robustly handles prepended prompts (e.g. "*[ CW HP:Hurt>You took...") and captures:
        // 1. Sessions taken, 2. Max sessions for skill (remaining), 3. New knowledge %
        const updateMatch = text.match(/You took (\d+) out of (\d+) sessions?.*knowledge is now (\d+)%/i);
        if (updateMatch) {
            const [_, taken, remaining, newKnowledge] = updateMatch;
            const skillName = lastPracticedSkillRef.current || readLastPracticedSkill();
            console.log(`[PracticeHandler] DETECTED UPDATE: ${taken}/${remaining} sessions, ${newKnowledge}% knowledge for skill: ${skillName}`);
            if (skillName) {
                const updateKey = `${skillName.toLowerCase()}|${taken}|${remaining}|${newKnowledge}`;
                if (lastPracticeUpdateKeyRef.current === updateKey) return false;
                lastPracticeUpdateKeyRef.current = updateKey;

                const sessions = `${taken}/${remaining}`;
                const knowledge = `${newKnowledge}%`;
                setPracticeData(prev => {
                    if (!prev) return prev;
                    
                    const skills = prev.skills.map(s => 
                        s.name.toLowerCase() === skillName.toLowerCase() 
                            ? { ...s, sessions, knowledge, proficiency: parseInt(newKnowledge) }
                            : s
                    );

                    // Decrement total sessions left (each 'practice' call spends 1 session)
                    const sessionsLeft = Math.max(0, prev.sessionsLeft - 1);
                    
                    return { ...prev, skills, sessionsLeft };
                });
                updatePracticeDrawerLine(skillName, sessions, knowledge);
                const normalizedName = skillName.trim().toLowerCase();
                setAbilities(prevAbils => ({ ...prevAbils, [normalizedName]: parseInt(newKnowledge) }));
            }
            return false;
        }

        return false;
    }, [setIsPracticeActive, setAbilities, updatePracticeDrawerLine]);

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
