/**
 * @file practiceLastSkillMemory.ts
 * @description Shared browser-side memory for the most recent practice target.
 */

type PracticeSkillWindow = Window & {
    __mumeLastPracticedSkill?: string | null;
};

// --- Logic Section ---

export const rememberLastPracticedSkill = (skill: string | null) => {
    if (typeof window === 'undefined') return;
    (window as PracticeSkillWindow).__mumeLastPracticedSkill = skill?.trim() || null;
};

export const readLastPracticedSkill = (): string | null => {
    if (typeof window === 'undefined') return null;
    return (window as PracticeSkillWindow).__mumeLastPracticedSkill || null;
};
