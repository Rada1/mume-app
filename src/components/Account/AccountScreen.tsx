import React from 'react';
import { useGame } from '../../context/GameContext';
import { ArrowLeft } from 'lucide-react';
import './AccountScreen.css';

// Subcomponents to be moved to separate files later
const LoginView = () => {
    const { loginName, setLoginName, loginPassword, setLoginPassword, telnet, prepareLoginAttempt, initAudio, playClickSound } = useGame();

    const handleLogin = () => {
        playClickSound();
        initAudio(); // Essential to unlock browser audio context
        if (!loginName || !loginPassword) return;
        prepareLoginAttempt(); // reset passwordSent so auto-login handles the upcoming "Password:" prompt
        telnet.sendCommand(loginName);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="account-view">
            <div className="account-input-group">
                <label>Login</label>
                <input 
                    className="account-input"
                    type="text" 
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Character Name"
                />
            </div>
            <div className="account-input-group">
                <label>Password</label>
                <input 
                    className="account-input"
                    type="password" 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••"
                />
            </div>
            <button className="account-button" onClick={handleLogin}>
                Enter
            </button>

            <div className="account-divider">
                <span>OR</span>
            </div>

            <button className="account-button secondary" onClick={() => {
                playClickSound();
                initAudio();
                telnet.sendCommand('new');
            }}>
                New Account
            </button>
        </div>
    );
};

const CharacterListView = () => {
    const { accountState, setAccountState, initAudio, playClickSound } = useGame();
    const { characters, selectedCharacter } = accountState;

    const selectChar = (char: any) => {
        playClickSound();
        initAudio();
        setAccountState(prev => ({ 
            ...prev, 
            selectedCharacter: char,
            stage: 'character-detail'
        }));
    };

    return (
        <div className="account-view">
            <button className="account-subtitle" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }} onClick={() => {
                playClickSound();
                setAccountState(prev => ({ ...prev, stage: 'account-menu' }));
            }}>
                <ArrowLeft size={16} /> Back to Menu
            </button>
            
            <h2 className="account-view-header">your characters in middle-earth...</h2>

            <div className="character-list">
                {characters.map((char, idx) => (
                    <div 
                        key={idx} 
                        className={`character-card ${selectedCharacter?.name === char.name ? 'selected' : ''}`}
                        onClick={() => selectChar(char)}
                    >
                        <div className="character-info">
                            <div className="character-header">
                                <div className="character-name">{char.name}</div>
                                <div className="character-quick-stats">
                                    L{char.level} • {char.rent || 'none'}
                                </div>
                            </div>
                            <div className="character-meta">{char.race}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CharacterDetailView = () => {
    const { accountState, setAccountState, executeCommand, initAudio, playClickSound } = useGame();
    const { selectedCharacter } = accountState;

    if (!selectedCharacter) return null;

    const handleBack = () => {
        playClickSound();
        setAccountState(prev => ({ ...prev, stage: 'character-select' }));
    };

    const handleEnter = React.useCallback(() => {
        playClickSound();
        initAudio();
        if (selectedCharacter.index !== undefined) {
            // Login selection uses indices
            executeCommand(selectedCharacter.index.toString());
        } else {
            // Account menu selection uses 'play <name>'
            executeCommand(`play ${selectedCharacter.name}`);
        }
    }, [selectedCharacter, executeCommand, initAudio]);

    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleEnter();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleEnter]);

    return (
        <div className="account-view">
            <button className="account-subtitle" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }} onClick={handleBack}>
                <ArrowLeft size={16} /> Back to Character List
            </button>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1rem' }}>{selectedCharacter.name}</h2>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 215, 0, 0.6)' }}>Ready to enter Middle-earth</div>
            </div>

            <div className="detail-grid">
                <div className="detail-item">
                    <span className="detail-label">Rce</span>
                    <span className="detail-value">{selectedCharacter.race || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Lvl</span>
                    <span className="detail-value">{selectedCharacter.level || '?'}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Last Location</span>
                    <span className="detail-value">{selectedCharacter.area || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Rent</span>
                    <span className="detail-value">{selectedCharacter.rent || 'none'}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="detail-label">Last Login</span>
                    <span className="detail-value">{selectedCharacter.logon}</span>
                </div>
            </div>

            <button className="account-button" onClick={handleEnter}>
                Enter Arda
            </button>
        </div>
    );
};

const AccountMenuView = () => {
    const { executeCommand, setAccountState, accountState, initAudio, playClickSound } = useGame();

    const menuItems = [
        { id: 'list', label: 'Characters', cmd: 'list', desc: 'Select a character to play' },
        { id: 'create', label: 'Create', cmd: 'create', desc: 'Begin a new journey' },
        { id: 'password', label: 'Password', cmd: 'password', desc: 'Change account password' },
        { id: 'quit', label: 'Logout', cmd: 'quit', desc: 'Exit and disconnect', danger: true },
    ];

    return (
        <div className="account-view">
            <h2 className="account-view-header">Account Menu</h2>
            <div className="account-menu-grid">
                {menuItems.map(item => (
                    <div 
                        key={item.id} 
                        className={`account-menu-item ${item.danger ? 'danger' : ''}`}
                        onClick={() => {
                            playClickSound();
                            initAudio();

                            if (item.id === 'list') {
                                // Explicitly transition to character-select — the parser won't do it
                                // automatically from account-menu (to prevent auto-advance on login).
                                setAccountState(prev => ({ ...prev, stage: 'character-select' }));
                            }

                            executeCommand(item.cmd);

                            // For commands that require terminal interaction or just show a text response,
                            // hide the overlay so the user can see the output.
                            if (['lag', 'link', 'password'].includes(item.cmd)) {
                                setAccountState(prev => ({ ...prev, stage: 'none' }));
                            }
                        }}
                    >
                        <div className="account-menu-label">{item.label}</div>
                        <div className="account-menu-desc">{item.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );

};

const CharacterCreationView: React.FC = () => {
    const { accountState, executeCommand, initAudio, playClickSound } = useGame();
    const { creationPrompt } = accountState;
    const [customName, setCustomName] = React.useState('');
    const [editingStats, setEditingStats] = React.useState(false);
    const [editStatValues, setEditStatValues] = React.useState<{label: string, value: number}[]>([]);
    const [editPointsLeft, setEditPointsLeft] = React.useState(0);
    const lastEscapeRef = React.useRef<number>(0);

    // Clear all inputs/modes whenever the prompt title changes
    React.useEffect(() => {
        setCustomName('');
        setEditingStats(false);
    }, [creationPrompt?.title]);

    // Double-Escape keyboard shortcut → send escape-escape to server (back to main menu)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                const now = Date.now();
                if (now - lastEscapeRef.current < 600) {
                    playClickSound();
                    executeCommand('');
                    setTimeout(() => executeCommand(''), 1000);
                    lastEscapeRef.current = 0;
                } else {
                    lastEscapeRef.current = now;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [executeCommand, playClickSound]);

    if (!creationPrompt) return null;

    const isStatsPage = creationPrompt.title.includes('Choose Your Stats');
    const pointsLeftId = parseInt(
        creationPrompt.options.find(o => /points\s+left/i.test(o.label))?.id ?? '-1'
    );

    // Options minus the informational "points left" entry
    const displayOptions = creationPrompt.options.filter(o => !/points\s+left/i.test(o.label));

    const handleSelect = (id: string) => {
        playClickSound();
        initAudio();
        if (isStatsPage && id === '2') {
            // Intercept "Edit" — launch the stat editor
            setEditStatValues(stats.map(s => ({ label: s.label, value: parseInt(s.value) })));
            setEditPointsLeft(pointsLeftId >= 0 ? pointsLeftId : 0);
            setEditingStats(true);
            executeCommand('2');
            return;
        }
        executeCommand(id);
    };

    const handleStatIncrease = (label: string) => {
        if (editPointsLeft <= 0) return;
        playClickSound();
        const current = editStatValues.find(s => s.label === label);
        if (!current) return;
        const newValue = current.value + 1;
        setEditStatValues(prev => prev.map(s => s.label === label ? { ...s, value: newValue } : s));
        setEditPointsLeft(p => p - 1);
        executeCommand(`${label.toLowerCase()} ${newValue}`);
    };

    const handleStatDecrease = (label: string) => {
        const current = editStatValues.find(s => s.label === label);
        if (!current || current.value <= 3) return;
        playClickSound();
        const newValue = current.value - 1;
        setEditStatValues(prev => prev.map(s => s.label === label ? { ...s, value: newValue } : s));
        setEditPointsLeft(p => p + 1);
        executeCommand(`${label.toLowerCase()} ${newValue}`);
    };

    const handleCustomName = () => {
        playClickSound();
        initAudio();
        if (customName.trim()) {
            if (creationPrompt.title.includes('Choose Your Name')) {
                // Store the name so we can auto-play it after creation finishes
                useGame().setAccountState(prev => ({ ...prev, lastCreatedCharacterName: customName.trim() }));
            }
            executeCommand(customName.trim());
        }
    };

    const isNamePrompt = 
        creationPrompt.title.includes('Choose Your Name') || 
        creationPrompt.title.includes('Account Name') || 
        creationPrompt.title.includes('Password') || 
        creationPrompt.title.includes('Verify');

    // Parse base stats if present in description (memoized on description change)
    const { stats, displayDescription } = React.useMemo(() => {
        const statsRegex = /(Str|Int|Wis|Dex|Con|Wil|Per):\s*(\d+)/gi;
        const parsed: { label: string, value: string }[] = [];
        let match: RegExpExecArray | null;
        while ((match = statsRegex.exec(creationPrompt.description)) !== null) {
            parsed.push({ label: match[1], value: match[2] });
        }
        const desc = parsed.length > 0
            ? creationPrompt.description.replace(/(Str|Int|Wis|Dex|Con|Wil|Per):\s*(\d+)/gi, '').replace(/\s+/g, ' ').trim()
            : creationPrompt.description;
        return { stats: parsed, displayDescription: desc };
    }, [creationPrompt.description]);

    return (
        <div className="account-view creation-view">
            <h2 className="creation-title">{creationPrompt.title}</h2>

            {!editingStats && (
                <div className="creation-description">
                    {displayDescription}
                </div>
            )}

            {!editingStats && stats.length > 0 && (
                <div className="creation-stats-grid">
                    {stats.map(stat => (
                        <div key={stat.label} className="stat-item">
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-value">{stat.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Points remaining banner on review screen */}
            {isStatsPage && !editingStats && pointsLeftId > 0 && (
                <div className="stat-points-banner">
                    {pointsLeftId} points to distribute
                </div>
            )}

            {editingStats ? (
                <div className="stat-editor">
                    <div className="stat-editor-points">
                        <span className="points-label">Points Remaining</span>
                        <span className={`points-value ${editPointsLeft === 0 ? 'zero' : ''}`}>{editPointsLeft}</span>
                    </div>
                    <div className="stat-editor-list">
                        {editStatValues.map(stat => (
                            <div key={stat.label} className="stat-editor-row">
                                <span className="stat-editor-label">{stat.label}</span>
                                <div className="stat-adj-controls">
                                    <button
                                        className="stat-adj-btn"
                                        onClick={() => handleStatDecrease(stat.label)}
                                        disabled={stat.value <= 3}
                                    >−</button>
                                    <span className="stat-editor-value">{stat.value}</span>
                                    <button
                                        className="stat-adj-btn"
                                        onClick={() => handleStatIncrease(stat.label)}
                                        disabled={editPointsLeft <= 0}
                                    >+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <button className="creation-footer-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => {
                            playClickSound();
                            setEditingStats(false);
                        }}>
                            ← Review
                        </button>
                        <button className="account-button" style={{ flex: 2, marginTop: 0 }} onClick={() => {
                            playClickSound();
                            setEditingStats(false);
                            executeCommand('1');
                        }}>
                            Accept Stats
                        </button>
                    </div>
                </div>
            ) : (
                <div className="creation-grid">
                    {displayOptions.map(option => (
                        <button
                            key={option.id}
                            className="creation-item"
                            onClick={() => handleSelect(option.id)}
                        >
                            <div className="creation-id">({option.id})</div>
                            <div className="creation-label">{option.label}</div>
                        </button>
                    ))}
                </div>
            )}

            {isNamePrompt && (
                <div className="custom-name-row">
                    <input 
                        type={creationPrompt.title.toLowerCase().includes('password') || creationPrompt.title.toLowerCase().includes('verify') ? 'password' : 'text'} 
                        className="account-input" 
                        placeholder={creationPrompt.title.toLowerCase().includes('password') ? 'Enter password...' : 'Enter name...'}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomName()}
                        autoComplete="off"
                        autoFocus
                    />
                    <button className="account-button" onClick={handleCustomName} style={{ width: 'auto', padding: '0 1rem' }}>
                        OK
                    </button>
                </div>
            )}

            <div className="creation-footer" style={{ gap: '1rem' }}>
                <button
                    className="creation-footer-btn danger"
                    onClick={() => {
                        playClickSound();
                        executeCommand('');
                        setTimeout(() => executeCommand(''), 1000);
                    }}
                >
                    Cancel
                </button>

                {creationPrompt.footer?.toLowerCase().includes('"back"') && (
                    <button
                        className="creation-footer-btn"
                        onClick={() => {
                            playClickSound();
                            executeCommand('back');
                        }}
                    >
                        <span className="footer-icon">←</span>
                        Back
                    </button>
                )}
            </div>
        </div>
    );
};

export const AccountScreen: React.FC = () => {
    const { accountState } = useGame();
    const { stage } = accountState;

    return (
        <div className="account-screen-overlay">
            <div className="account-backdrop" />
            
            <div className="account-content">
                <div className="account-title-container">
                    <h1 className="account-title">MUME</h1>
                    <p className="account-subtitle">Multi Users in Middle Earth</p>
                </div>

                {(stage === 'login' || stage === 'account-menu') && (
                    <div className="account-homage">
                        <div className="homage-line highlight">*** MUME IX ***</div>
                        <div className="homage-line">In progress at FIRE</div>
                        <div className="homage-line">(Free Internet Roleplay Experiences)</div>
                        <div className="homage-line">Hosted at HEIG-VD (www.heig-vd.ch)</div>
                        <div className="homage-line">Adapted from J.R.R. Tolkien's Middle-earth world and</div>
                        <div className="homage-line">maintained by CryHavoc, Manwe, and Nada.</div>
                        <div className="homage-line">Original code DikuMUD I (help credits), created by:</div>
                        <div className="homage-line">S. Hammer, T. Madsen, K. Nyboe, M. Seifert, and H.H. Staerfeldt.</div>
                    </div>
                )}

                <div className="account-view-container">

                    <div className="account-glow-layer" />
                    {stage === 'login' && <LoginView />}
                    {stage === 'character-select' && <CharacterListView />}
                    {stage === 'character-detail' && <CharacterDetailView />}
                    {stage === 'account-menu' && <AccountMenuView />}
                    {stage === 'character-creation' && <CharacterCreationView />}
                </div>

            </div>
        </div>
    );
};
