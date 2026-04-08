import React from 'react';
import { useBaseGame } from '../context/GameContext';
import { PracticeSkill } from '../types';
import { Plus } from 'lucide-react';

interface PracticeSkillCardProps {
    skill: PracticeSkill;
}

const PracticeSkillCard: React.FC<PracticeSkillCardProps> = ({ skill: initialSkill }) => {
    const { practice, executeCommand, triggerHaptic } = useBaseGame();
    const { practiceData, setLastPracticedSkill } = practice;

    const currentSkill = practiceData?.skills.find(s => s.name === initialSkill.name) || initialSkill;

    const handlePractice = (e: React.MouseEvent) => {
        e.stopPropagation();
        triggerHaptic(20);
        setLastPracticedSkill(currentSkill.name);
        executeCommand(`practice ${currentSkill.name}`, false, true);
    };

    const proficiency = Math.min(100, currentSkill.proficiency || 0);
    const isMaxed = proficiency >= 100;

    return (
        <div className={`practice-skill-card ${isMaxed ? 'maxed' : ''}`} style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                    fontWeight: 'bold', 
                    fontSize: 'var(--dynamic-log-size, 16px)', 
                    color: '#fff',
                    letterSpacing: '0.5px'
                }}>
                    {currentSkill.name}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {currentSkill.sessions && (
                        <span style={{ 
                            fontSize: 'var(--dynamic-log-size, 16px)', 
                            color: 'rgba(255,255,255,0.4)', 
                            fontWeight: '600' 
                        }}>
                             {currentSkill.sessions} <span style={{fontSize: 'var(--dynamic-log-size, 16px)', opacity: 0.6}}>SESS</span>
                        </span>
                    )}

                    {!isMaxed && currentSkill.sessions && (
                        <button
                            onClick={handlePractice}
                            className="practice-action-btn"
                            style={{
                                background: 'var(--accent)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(184, 134, 11, 0.3)'
                            }}
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                    flex: 1, 
                    height: '6px', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: `${proficiency}%`, 
                        height: '100%', 
                        background: isMaxed ? '#4ade80' : 'var(--accent)',
                        boxShadow: isMaxed ? '0 0 10px rgba(74, 222, 128, 0.3)' : '0 0 10px rgba(184, 134, 11, 0.3)',
                        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                </div>
                <span style={{ 
                    fontSize: 'var(--dynamic-log-size, 16px)', 
                    fontWeight: '800', 
                    color: isMaxed ? '#4ade80' : 'var(--accent)',
                    minWidth: '40px',
                    textAlign: 'right'
                }}>
                    {proficiency}%
                </span>
            </div>
            
            {currentSkill.difficulty && (
                <div style={{ 
                    position: 'absolute', 
                    right: '0', 
                    bottom: '0', 
                    padding: '2px 8px', 
                    fontSize: 'var(--dynamic-log-size, 16px)', 
                    textTransform: 'uppercase', 
                    fontWeight: '800', 
                    opacity: 0.2,
                    letterSpacing: '1px'
                }}>
                    {currentSkill.difficulty}
                </div>
            )}
        </div>
    );
};

export default React.memo(PracticeSkillCard);

