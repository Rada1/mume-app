import React, { useState } from 'react';
import { X, User, Activity, BookOpen, Coins, ChevronRight, RefreshCw } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';
import { PracticeSkill } from '../../types';
import './CharacterDrawer.css';

interface CharacterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
    isOpen,
    onClose,
    executeCommand
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'practice'>('info');
    const { practice, characterClass } = useGame();
    const { characterInfo } = useVitals();
    const practiceData = practice.practiceData;

    const info = characterInfo || {
        name: 'Unknown', level: 0, xp: 0, xpMax: 0, tp: 0, tpMax: 0,
        race: 'Unknown', subclass: 'None', subrace: 'None', gold: 0
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`character-drawer-content ${isOpen ? 'open' : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto' }}>
                    <div className="drawer-tabs">
                        <button 
                            className={`drawer-tab ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('info'); }}
                        >
                            <User size={16} />
                            <span>Character</span>
                        </button>
                        <button 
                            className={`drawer-tab ${activeTab === 'practice' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('practice'); }}
                        >
                            <BookOpen size={16} />
                            <span>Practice</span>
                        </button>
                    </div>
                    <button className="close-button" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="drawer-body" style={{ pointerEvents: 'auto' }}>
                    {activeTab === 'info' ? (
                        <div className="info-tab">
                            <div className="char-profile">
                                <div className="char-avatar">
                                    <User size={40} />
                                </div>
                                <div className="char-main-info">
                                    <h2>{info.name || 'Unknown'}</h2>
                                    <p>{info.race} {info.subrace !== 'None' ? info.subrace : ''} {info.subclass !== 'None' ? info.subclass : ''} {characterClass !== 'none' ? characterClass : ''}</p>
                                    <div className="level-badge">Level {info.level}</div>
                                </div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card gold">
                                    <div className="stat-label"><Coins size={14} /> Gold</div>
                                    <div className="stat-value">{formatNumber(info.gold)}</div>
                                </div>
                                
                                <div className="stat-section">
                                    <h3>Experience (XP)</h3>
                                    <div className="progress-container">
                                        <div className="progress-labels">
                                            <span>Current: {formatNumber(info.xp)}</span>
                                            <span>Next: {formatNumber(info.xpMax)}</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div 
                                                className="progress-bar-fill xp" 
                                                style={{ width: `${Math.min(100, (info.xp / (info.xpMax || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="needed-label">Needed: {formatNumber(Math.max(0, info.xpMax - info.xp))}</div>
                                    </div>
                                </div>

                                <div className="stat-section">
                                    <h3>Travel Points (TP)</h3>
                                    <div className="progress-container">
                                        <div className="progress-labels">
                                            <span>Current: {formatNumber(info.tp)}</span>
                                            <span>Next: {formatNumber(info.tpMax)}</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div 
                                                className="progress-bar-fill tp" 
                                                style={{ width: `${Math.min(100, (info.tp / (info.tpMax || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="needed-label">Needed: {formatNumber(Math.max(0, info.tpMax - info.tp))}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="practice-tab">
                            <div className="practice-header">
                                <div className="sessions-badge">
                                    {practiceData?.sessionsLeft ?? 0} Practice Sessions Left
                                </div>
                                <button className="refresh-button" onClick={() => executeCommand('practice')}>
                                    Refresh
                                </button>
                            </div>
                            
                            <div className="skills-list">
                                {practiceData?.skills && practiceData.skills.length > 0 ? (
                                    Object.entries(
                                        (practiceData.skills as PracticeSkill[]).reduce((acc, skill) => {
                                            const category = skill.skillClass || 'Ranger';
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(skill);
                                            return acc;
                                        }, {} as Record<string, PracticeSkill[]>)
                                    ).map(([category, skills]) => (
                                        <div key={category} className="skill-group">
                                            <div className="skill-group-header">{category}</div>
                                            {(skills as PracticeSkill[]).map((skill, idx) => (
                                                <div key={idx} className="skill-item">
                                                    <div className="skill-info">
                                                        <div className="skill-name">{skill.name}</div>
                                                        <div className="skill-advice">{skill.advice}</div>
                                                    </div>
                                                    <div className="skill-stats">
                                                        <div className="skill-knowledge">{skill.knowledge}</div>
                                                        <div className="skill-difficulty">{skill.difficulty}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <BookOpen size={48} />
                                        <p>No skills or spells found. Try refreshing.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
