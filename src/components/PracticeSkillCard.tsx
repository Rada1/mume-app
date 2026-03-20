import React from 'react';
import { useBaseGame } from '../context/GameContext';
import { PracticeSkill } from '../types';

interface PracticeSkillCardProps {
    skill: PracticeSkill;
}

const COL_SESS  = '100px';
const COL_BTN   = '40px';
const COL_KNOW  = '110px';
const GRID_TEMPLATE = `1fr ${COL_SESS} ${COL_BTN} ${COL_KNOW}`;

const PracticeSkillCard: React.FC<PracticeSkillCardProps> = ({ skill: initialSkill }) => {
    const { practice, executeCommand } = useBaseGame();
    const { practiceData, setLastPracticedSkill } = practice;

    const currentSkill = practiceData?.skills.find(s => s.name === initialSkill.name) || initialSkill;

    const handlePractice = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLastPracticedSkill(currentSkill.name);
        executeCommand(`practice ${currentSkill.name}`, false, true);
    };

    const knowledge = currentSkill.knowledge.endsWith('%')
        ? currentSkill.knowledge
        : `${currentSkill.knowledge}%`;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: GRID_TEMPLATE,
            alignItems: 'center',
            fontFamily: 'var(--font-main)',
            fontSize: 'inherit',
            lineHeight: '1.4',
            padding: '4px 0',
            width: '100%',
            maxWidth: '500px',
            color: 'var(--text-dim)',
        }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentSkill.name}
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: currentSkill.sessions ? 1 : 0.3 }}>
                {currentSkill.sessions || '-'}
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                {currentSkill.sessions && currentSkill.proficiency < 100 ? (
                    <button
                        onClick={handlePractice}
                        style={{
                            width: '20px',
                            height: '20px',
                            background: 'transparent',
                            border: '1px solid rgba(168, 85, 247, 0.5)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            color: '#a855f7',
                            fontFamily: 'var(--font-main)',
                            fontSize: '12px',
                            lineHeight: '1',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        +
                    </button>
                ) : null}
            </div>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {knowledge}
            </span>
        </div>
    );
};

export default React.memo(PracticeSkillCard);
