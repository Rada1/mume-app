import React, { useState, useEffect } from 'react';
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
                        <button 
                            className={`drawer-tab ${activeTab === 'quests' ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setActiveTab('quests'); }}
                        >
                            <ScrollText size={16} />
                            <span>Quests</span>
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
                                            <>
                                                <h2>{info.name || 'Unknown Traveler'}</h2>
                                                <div className="edit-title-container">
                                                    {characterInfo.level >= 21 ? (
                                                        <button className="edit-inline-button" onClick={() => setIsEditingTitle(true)}>
                                                            <Edit3 size={16} />
                                                        </button>
                                                    ) : (
                                                        <div className="edit-inline-button disabled" title="You can customize your title once you hit level 21!">
                                                            <Edit3 size={16} />
                                                            <HelpCircle size={12} className="help-icon" />
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <p>{characterInfo.race} {characterInfo.subrace} {characterInfo.subclass || characterInfo.class}</p>
                                    <div className="char-meta-row">
                                        <span className="level-badge">Level {characterInfo.level}</span>
                                        {characterInfo.level < 21 && (
                                            <div className="class-selection-container">
                                                <button 
                                                    className={`change-class-button ${isSelectingClass ? 'active' : ''}`} 
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
                                        )}
                                        <button className="refresh-info-button" onClick={handleRefresh} title="Refresh all character data">
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                    {characterInfo.alignment && (
                                        <p className="alignment-text">{characterInfo.alignment}</p>
                                    )}
                                </div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card gold">
                                    <div className="stat-label"><Coins size={14} /> Gold</div>
                                    <div className="stat-value">{formatNumber(info.gold)}</div>
                                </div>
                                
                                <div className="base-stats-section">
                                    <h3>Base Stats</h3>
                                    <div className="base-stats-grid">
                                        <div className="base-stat-item"><span>Str:</span> {info.stats?.str || 0}</div>
                                        <div className="base-stat-item"><span>Int:</span> {info.stats?.int || 0}</div>
                                        <div className="base-stat-item"><span>Wis:</span> {info.stats?.wis || 0}</div>
                                        <div className="base-stat-item"><span>Dex:</span> {info.stats?.dex || 0}</div>
                                        <div className="base-stat-item"><span>Con:</span> {info.stats?.con || 0}</div>
                                        <div className="base-stat-item"><span>Wil:</span> {info.stats?.wil || 0}</div>
                                        <div className="base-stat-item"><span>Per:</span> {info.stats?.per || 0}</div>
                                    </div>
                                </div>

                                <div className="war-info-section">
                                    <h3>War Information</h3>
                                    <div className="war-stats">
                                        <div className="war-stat-item">
                                            <span className="war-label">War points:</span>
                                            <span className="war-value">{info.warPoints || 0}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-section xp-section">
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

                                <div className="stat-section tp-section">
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

                            <div className="details-section">
                                <div className="section-header">
                                    <h3>Description</h3>
                                    {!isEditingDescription && (
                                        <button className="edit-section-button" onClick={() => setIsEditingDescription(true)}>
                                            <Edit3 size={14} />
                                            Edit
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
                                                    <Save size={14} /> Save
                                                </button>
                                                <button className="editor-cancel-button" onClick={() => setIsEditingDescription(false)}>
                                                    <RotateCcw size={14} /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        characterInfo.description || (
                                            <span className="placeholder-text">No description set. Click Edit to change it.</span>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="details-section">
                                <div className="section-header">
                                    <h3>Whois</h3>
                                    {!isEditingWhois && (
                                        <button className="edit-section-button" onClick={() => setIsEditingWhois(true)}>
                                            <Edit3 size={14} />
                                            Edit
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
                                                    <Save size={14} /> Save
                                                </button>
                                                <button className="editor-cancel-button" onClick={() => setIsEditingWhois(false)}>
                                                    <RotateCcw size={14} /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        characterInfo.whois || (
                                            <span className="placeholder-text">No whois information. Click Edit to change it.</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'practice' ? (
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
                    ) : (
                        <div className="quests-tab">
                            <div className="quests-header">
                                <div className="quests-badge">
                                    {quests.activeQuests.length} Active Quests
                                </div>
                                <button className="refresh-button" onClick={() => executeCommand('quest')}>
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>

                            <div className="quests-list">
                                {quests.activeQuests && quests.activeQuests.length > 0 ? (
                                    quests.activeQuests.map((quest) => (
                                        <div 
                                            key={quest.id} 
                                            className={`quest-item ${selectedQuestId === quest.id ? 'selected' : ''}`} 
                                            onClick={() => {
                                                setSelectedQuestId(quest.id === selectedQuestId ? null : quest.id);
                                                executeCommand(`quest ${quest.name.split(' ')[0].toLowerCase()}`);
                                            }}
                                        >
                                            <div className="quest-info">
                                                <div className="quest-name">
                                                    {quest.isUnfinished && <span className="unfinished-marker">*</span>}
                                                    {quest.name}
                                                </div>
                                                <div className="quest-area">{quest.area}</div>
                                                <div className="quest-description">{quest.description}</div>
                                                {selectedQuestId === quest.id && quest.fullText && (
                                                    <div className="quest-full-text">
                                                        {quest.fullText.split('\n').map((line, i) => (
                                                            <p key={i}>{line}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronRight size={16} className={`quest-chevron ${selectedQuestId === quest.id ? 'expanded' : ''}`} />
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <ScrollText size={48} />
                                        <p>No quests found. Try refreshing.</p>
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
