/**
 * @file practiceDrawerLines.ts
 * @description Builds skills drawer rows from structured practice state.
 */

import { DrawerLine, PracticeData, PracticeSkill } from '../types';

const COL = {
    name: 28,
    sessions: 10,
    knowledge: 10,
    difficulty: 12,
    className: 10,
    mana: 6
};

// --- Logic Section ---

const isSpellList = (lines: DrawerLine[], skills: PracticeSkill[]) => (
    lines.some(line => /^<?header>?\s*spell\b/i.test(line.text.trim())) ||
    skills.some(skill => skill.skillClass === 'Mage' || skill.skillClass === 'Cleric')
);

const isGuildmasterList = (data: PracticeData) => (
    data.isAtGuildmaster === true ||
    data.skills.some(skill => skill.sessions.trim().length > 0)
);

const findTeacherLine = (lines: DrawerLine[]): DrawerLine | null => (
    lines.find(line => /can teach you the (?:skills|spells) below/i.test(line.text)) || null
);

const formatGuildHeader = (label: string) => (
    `${label.padEnd(COL.name)}${'Sessions'.padStart(COL.sessions)}${'Knowledge'.padStart(COL.knowledge)}  ${'Difficulty'.padEnd(COL.difficulty)}Advice`
);

const formatPracticeHeader = () => (
    `${'Skill / Spell'.padEnd(COL.name)}${'Knowledge'.padEnd(COL.knowledge)}${'Difficulty'.padEnd(COL.difficulty)}${'Class'.padEnd(COL.className)}${'Mana'.padEnd(COL.mana)}Casting time`
);

const formatGuildSkillLine = (skill: PracticeSkill) => (
    `${skill.name.padEnd(COL.name)}${skill.sessions.padStart(COL.sessions)}${skill.knowledge.padStart(COL.knowledge)}  ${skill.difficulty.padEnd(COL.difficulty)}${skill.advice || ''}`
);

const formatPracticeSkillLine = (skill: PracticeSkill) => (
    `${skill.name.padEnd(COL.name)}${skill.knowledge.padEnd(COL.knowledge)}${skill.difficulty.padEnd(COL.difficulty)}${(skill.skillClass || '').padEnd(COL.className)}${(skill.mana || '').padEnd(COL.mana)}${skill.castingTime || ''}`
);

const makeLine = (id: string, text: string, extra?: Partial<DrawerLine>): DrawerLine => ({
    id,
    text,
    html: text,
    rawText: text,
    ...extra
});

export const buildPracticeDrawerLines = (
    practiceData: PracticeData | null,
    capturedLines: DrawerLine[]
): DrawerLine[] => {
    if (!practiceData || practiceData.skills.length === 0) return capturedLines;

    const label = isSpellList(capturedLines, practiceData.skills) ? 'Spell' : 'Skill';
    const guildmasterList = isGuildmasterList(practiceData);
    const teacherLine = findTeacherLine(capturedLines);
    const lines: DrawerLine[] = [
        makeLine('practice-sessions-left', `You have ${practiceData.sessionsLeft} practice sessions left.`)
    ];

    if (teacherLine) {
        lines.push({
            ...teacherLine,
            id: 'practice-teacher-line',
            rawText: teacherLine.rawText || teacherLine.text
        });
    }

    lines.push(
        makeLine('practice-table-header', guildmasterList ? formatGuildHeader(label) : formatPracticeHeader(), { isHeader: true }),
        makeLine('practice-table-rule', '-'.repeat(76))
    );

    practiceData.skills.forEach((skill, index) => {
        const text = guildmasterList ? formatGuildSkillLine(skill) : formatPracticeSkillLine(skill);
        lines.push(makeLine(`practice-skill-${skill.name.toLowerCase()}-${index}`, text, {
            isItem: true,
            context: skill.name,
            cmd: 'practice %n'
        }));
    });

    return lines;
};
