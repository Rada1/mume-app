import React from 'react';
import { useBaseGame, useLog } from '../context/GameContext';
import { Plus } from 'lucide-react';
import { PracticeSkill } from '../types';
import './Popovers/PracticePopover.css'; // Reuse existing styles

interface PracticeSkillCardProps {
    skill: PracticeSkill;
}

const PracticeSkillCard: React.FC<PracticeSkillCardProps> = ({ skill: initialSkill }) => {
    const { practice, executeCommand } = useBaseGame();
    const { addMessage } = useLog();
    const { practiceData, setLastPracticedSkill } = practice;

    // Find the latest version of this skill from the central state
    const currentSkill = practiceData?.skills.find(s => s.name === initialSkill.name) || initialSkill;

    const handlePractice = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLastPracticedSkill(currentSkill.name);
        executeCommand(`practice ${currentSkill.name}`, false, true);
    };

    return (
        <div className="practice-skill-card shop-item-card glass-panel" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            margin: '4px 0',
            borderRadius: '8px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)'
        }}>
            <div className="skill-info" style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                    {currentSkill.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <div className="perc-bar-bg" style={{ width: '80px', height: '10px' }}>
                        <div
                            className="perc-bar-fill"
                            style={{ width: currentSkill.knowledge, background: 'linear-gradient(90deg, #a855f7, #6366f1)' }}
                        />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#aaa' }}>{currentSkill.knowledge}</span>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>({currentSkill.sessions})</span>
                </div>
            </div>

            <div className="skill-difficulty" style={{
                margin: '0 12px',
                fontSize: '0.75rem',
                color: currentSkill.difficulty.toLowerCase().includes('hard') ? '#facc15' : '#4ade80'
            }}>
                {currentSkill.difficulty}
            </div>

            {currentSkill.proficiency < 100 && (
                <button
                    className="practice-plus-btn"
                    onClick={handlePractice}
                    style={{
                        background: '#a855f7',
                        border: 'none',
                        borderRadius: '4px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                    }}
                >
                    <Plus size={18} />
                </button>
            )}
        </div>
    );
};

export default React.memo(PracticeSkillCard);
