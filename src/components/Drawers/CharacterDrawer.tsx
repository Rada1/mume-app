import React, { useState, useEffect, useRef } from 'react';
import { X, User, Activity, BookOpen, Coins, ChevronRight, RefreshCw, ScrollText, Edit3, HelpCircle, Save, RotateCcw } from 'lucide-react';
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
    executeCommand: propsExecuteCommand
}) => {
    const [activeTab, setActiveTab] = useState<'info' | 'practice' | 'quests'>('info');
    const { practice, quests, executeCommand: contextExecuteCommand } = useGame();
    const { characterInfo } = useVitals();
    
    // Prioritize context executeCommand if available, fallback to props
    const executeCommand = contextExecuteCommand || propsExecuteCommand;
    
    const practiceData = practice.practiceData;

    // Inline editing states
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [tempDescription, setTempDescription] = useState('');
    
    const [isEditingWhois, setIsEditingWhois] = useState(false);
    const [tempWhois, setTempWhois] = useState('');
    
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
    const questPointerStartRef = useRef<{ x: number; y: number; id: string } | null>(null);

    useEffect(() => {
        if (isOpen && characterInfo) {
            if (!isEditingDescription) setTempDescription(characterInfo.description || '');
            if (!isEditingWhois) setTempWhois(characterInfo.whois || '');
            if (!isEditingTitle) setTempTitle(characterInfo.name || '');
        }
    }, [isOpen, characterInfo, isEditingDescription, isEditingWhois, isEditingTitle]);

    const [isSelectingClass, setIsSelectingClass] = useState(false);
    const classes = ['Adventurer', 'Apprentice', 'Pilferer', 'Recruit', 'Sentry'];

    const handleSaveDescription = () => {
        executeCommand(`change description ${tempDescription}`);
        setIsEditingDescription(false);
    };

    const handleSaveWhois = () => {
        executeCommand(`change whois ${tempWhois}`);
        setIsEditingWhois(false);
    };

    const handleSaveTitle = () => {
        executeCommand(`change title ${tempTitle}`);
        setIsEditingTitle(false);
    };

    const info = characterInfo || {
        name: 'Unknown', level: 0, xp: 0, xpMax: 0, tp: 0, tpMax: 0,
        race: 'Unknown', subclass: 'None', subrace: 'None', gold: 0,
        alignment: '', warPoints: 0, actsForWar: 0,
        stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, wil: 0, per: 0 }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

    const handleRefresh = (e: React.MouseEvent) => {
        e.stopPropagation();
        executeCommand('info', true);
        executeCommand('score', true);
        executeCommand('at', true);
        executeCommand('look self', true);
        executeCommand('whois', true);
        executeCommand('quest', true);
    };

    return (
        <div 
            className={`character-drawer-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div
                className={`character-drawer-content ${isOpen ? 'open' : ''}`}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); else e.stopPropagation(); }}
            >
                <div className="drawer-header" style={{ pointerEvents: 'auto' }}>
                    <div className="drawer-tabs">
                        <button 
                            className={`drawer-tab ${activeTab === 'info' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('info'); }}
                        >
                            <User size={14} />
                            <span>Character</span>
                        </button>
                        <button 
                            className={`drawer-tab ${activeTab === 'practice' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('practice'); }}
                        >
                            <BookOpen size={14} />
                            <span>Practice</span>
                        </button>
                        <button 
                            className={`drawer-tab ${activeTab === 'quests' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('quests'); }}
                        >
                            <ScrollText size={14} />
                            <span>Quests</span>
                        </button>
                    </div>
                    <button className="close-button" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="drawer-body" style={{ pointerEvents: 'auto' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                    {activeTab === 'info' ? (
                        <div className="info-tab">
                            <div className="char-profile">
                                <div className="char-main-info">
                                    <div className="char-name-row">
                                        {isEditingTitle ? (
                                            <div className="inline-title-editor">
                                                <input 
                                                    type="text" 
                                                    value={tempTitle}
                                                    onChange={(e) => setTempTitle(e.target.value)}
                                                    autoFocus
                                                />
                                                <button className="save-icon-button" onClick={handleSaveTitle}><Save size={16} /></button>
                                                <button className="cancel-icon-button" onClick={() => setIsEditingTitle(false)}><RotateCcw size={16} /></button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <h2>{info.name || 'Unknown Traveler'}</h2>
                                                <span className="level-badge">Lv {characterInfo.level}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p style={{ marginTop: '2px' }}>{characterInfo.race} {characterInfo.subrace} {characterInfo.subclass || characterInfo.class}</p>
                                    <div className="char-meta-row">
                                        {characterInfo.level < 21 ? (
                                            <div className="class-selection-container">
                                                <button 
                                                    className="change-class-button"
                                                    onClick={() => setIsSelectingClass(!isSelectingClass)}
                                                >
                                                    {isSelectingClass ? 'Cancel' : 'Change Class'}
                                                </button>
                                                {isSelectingClass && (
                                                    <div className="class-menu">
                                                        {classes.map(cls => (
                                                            <button 
                                                                key={cls} 
                                                                onClick={() => {
                                                                    executeCommand(`change class ${cls.toLowerCase()}`);
                                                                    setIsSelectingClass(false);
                                                                }}
                                                            >
                                                                {cls}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button className="edit-section-button" onClick={() => setIsEditingTitle(true)}>
                                                <Edit3 size={12} /> Custom Title
                                            </button>
                                        )}
                                        <button className="refresh-info-button" onClick={handleRefresh} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}>
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                    {characterInfo.alignment && (
                                        <p style={{ color: 'var(--accent)', opacity: 0.8, fontSize: '0.75rem', marginTop: '4px', fontStyle: 'italic' }}>{characterInfo.alignment}</p>
                                    )}
                                </div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card gold info-section-glass">
                                    <div className="stat-label"><Coins size={14} /> Gold</div>
                                    <div className="stat-value">{formatNumber(info.gold)}</div>
                                </div>
                                
                                <div className="base-stats-section info-section-glass">
                                    <h3>Base Stats</h3>
                                    <div className="base-stats-grid">
                                        <div className="base-stat-item"><span>Str</span> {info.stats?.str || 0}</div>
                                        <div className="base-stat-item"><span>Int</span> {info.stats?.int || 0}</div>
                                        <div className="base-stat-item"><span>Wis</span> {info.stats?.wis || 0}</div>
                                        <div className="base-stat-item"><span>Dex</span> {info.stats?.dex || 0}</div>
                                        <div className="base-stat-item"><span>Con</span> {info.stats?.con || 0}</div>
                                        <div className="base-stat-item"><span>Wil</span> {info.stats?.wil || 0}</div>
                                        <div className="base-stat-item"><span>Per</span> {info.stats?.per || 0}</div>
                                    </div>
                                </div>

                                <div className="stat-section info-section-glass" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="progress-container">
                                        <div className="progress-labels">
                                            <span>XP</span>
                                            <span>{Math.floor((info.xp / (info.xpMax || 1)) * 100)}%</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill xp" style={{ width: `${Math.min(100, (info.xp / (info.xpMax || 1)) * 100)}%` }} />
                                        </div>
                                        <div className="needed-label">+{formatNumber(Math.max(0, info.xpMax - info.xp))}</div>
                                    </div>
                                    <div className="progress-container">
                                        <div className="progress-labels">
                                            <span>TP</span>
                                            <span>{Math.floor((info.tp / (info.tpMax || 1)) * 100)}%</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill tp" style={{ width: `${Math.min(100, (info.tp / (info.tpMax || 1)) * 100)}%` }} />
                                        </div>
                                        <div className="needed-label">+{formatNumber(Math.max(0, info.tpMax - info.tp))}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <div className="section-header">
                                    <h3>Description</h3>
                                    {!isEditingDescription && (
                                        <button className="edit-section-button" onClick={() => setIsEditingDescription(true)}>
                                            <Edit3 size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="description-box">
                                    {isEditingDescription ? (
                                        <div className="inline-editor-container">
                                            <textarea 
                                                value={tempDescription}
                                                onChange={(e) => setTempDescription(e.target.value)}
                                                autoFocus
                                                rows={4}
                                            />
                                            <div className="editor-actions">
                                                <button className="editor-save-button" onClick={handleSaveDescription}>
                                                    <Save size={14} />
                                                </button>
                                                <button className="editor-cancel-button" onClick={() => setIsEditingDescription(false)}>
                                                    <RotateCcw size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        characterInfo.description || <span style={{ opacity: 0.3 }}>No description set...</span>
                                    )}
                                </div>
                            </div>

                            <div className="details-section" style={{ marginBottom: '20px' }}>
                                <div className="section-header">
                                    <h3>Whois</h3>
                                    {!isEditingWhois && (
                                        <button className="edit-section-button" onClick={() => setIsEditingWhois(true)}>
                                            <Edit3 size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="whois-box">
                                    {isEditingWhois ? (
                                        <div className="inline-editor-container">
                                            <textarea 
                                                value={tempWhois}
                                                onChange={(e) => setTempWhois(e.target.value)}
                                                autoFocus
                                                rows={2}
                                            />
                                            <div className="editor-actions">
                                                <button className="editor-save-button" onClick={handleSaveWhois}>
                                                    <Save size={14} />
                                                </button>
                                                <button className="editor-cancel-button" onClick={() => setIsEditingWhois(false)}>
                                                    <RotateCcw size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        characterInfo.whois || <span style={{ opacity: 0.3 }}>No whois set...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'practice' ? (
                        <div className="practice-tab">
                            <div className="practice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
                                <div className="sessions-badge" style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                                    {practiceData?.sessionsLeft ?? 0} Sessions
                                </div>
                                <button className="refresh-button" onClick={() => executeCommand('practice')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700' }}>
                                    Refresh
                                </button>
                            </div>
                            
                            <div className="skills-list">
                                {practiceData?.skills && practiceData.skills.length > 0 ? (
                                    Object.entries(
                                        (practiceData.skills as PracticeSkill[]).reduce((acc, skill) => {
                                            const category = skill.skillClass || 'Known';
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(skill);
                                            return acc;
                                        }, {} as Record<string, PracticeSkill[]>)
                                    ).map(([category, skills]) => (
                                        <div key={category} className="skill-group">
                                            <div className="skill-group-header">{category}</div>
                                            {(skills as PracticeSkill[]).map((skill, idx) => (
                                                <div key={idx} className="skill-item">
                                                    <div className="skill-info" style={{ flex: 1 }}>
                                                        <div className="skill-name" style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>{skill.name}</div>
                                                        <div className="skill-advice" style={{ fontSize: '0.7rem', opacity: 0.5 }}>{skill.advice}</div>
                                                    </div>
                                                    <div className="skill-stats" style={{ textAlign: 'right' }}>
                                                        <div className="skill-knowledge" style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)' }}>{skill.knowledge}%</div>
                                                        <div className="skill-difficulty" style={{ fontSize: '0.6rem', opacity: 0.3 }}>Diff: {skill.difficulty}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <BookOpen size={32} style={{ marginBottom: '10px' }} />
                                        <p style={{ fontSize: '0.8rem' }}>No practice data available.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="quests-tab">
                            <div className="quests-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
                                <div className="quests-badge" style={{ background: 'rgba(184, 134, 11, 0.1)', color: '#b8860b', border: '1px solid rgba(184, 134, 11, 0.3)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800' }}>
                                    {quests.activeQuests.length} Active
                                </div>
                                <button className="refresh-button" onClick={() => executeCommand('quest')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '700' }}>
                                    Refresh
                                </button>
                            </div>

                            <div className="quests-list">
                                {quests.activeQuests && quests.activeQuests.length > 0 ? (
                                    quests.activeQuests.map((quest) => (
                                        <div
                                            key={quest.id}
                                            className={`quest-item ${selectedQuestId === quest.id ? 'selected' : ''}`}
                                            onPointerDown={(e) => {
                                                questPointerStartRef.current = { x: e.clientX, y: e.clientY, id: quest.id };
                                            }}
                                            onPointerUp={(e) => {
                                                const start = questPointerStartRef.current;
                                                if (!start || start.id !== quest.id) return;
                                                const dx = Math.abs(e.clientX - start.x);
                                                const dy = Math.abs(e.clientY - start.y);
                                                questPointerStartRef.current = null;
                                                if (dx < 10 && dy < 10) {
                                                    const isExpanding = quest.id !== selectedQuestId;
                                                    setSelectedQuestId(isExpanding ? quest.id : null);
                                                    if (isExpanding) executeCommand(`quest ${quest.name.split(' ')[0].toLowerCase()}`);
                                                }
                                            }}
                                        >
                                            <div className="quest-info" style={{ flex: 1 }}>
                                                <div className="quest-area" style={{ fontSize: '0.65rem', color: '#b8860b', fontWeight: '800', marginBottom: '2px' }}>{quest.area}</div>
                                                <div className="quest-name" style={{ fontSize: '0.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    {quest.isUnfinished && <span style={{ color: '#fb923c' }}>*</span>}
                                                    {quest.name}
                                                </div>
                                                {selectedQuestId === quest.id ? (
                                                    <div className="quest-full-text" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', opacity: 0.8 }}>
                                                        {quest.fullText ? quest.fullText.split('\n').map((line, i) => (
                                                            <p key={i} style={{ marginBottom: '5px' }}>{line}</p>
                                                        )) : (
                                                            <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Fetching details...</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="quest-description" style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '2px' }}>{quest.description}</div>
                                                )}
                                            </div>
                                            <ChevronRight size={14} style={{ opacity: 0.3, transform: selectedQuestId === quest.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                        <ScrollText size={32} style={{ marginBottom: '10px' }} />
                                        <p style={{ fontSize: '0.8rem' }}>No active quests.</p>
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
