/**
 * ARCHIVE: Old MUME Account Phase Graphical UI
 * Ref: src/components/Account/AccountScreen.tsx
 * Ref: src/components/Account/AccountScreen.css
 * 
 * This file contains the "Legacy" account theme that was used for graphical login,
 * character selection, and character creation. It is now disconnected from the main flow
 * in favor of a raw terminal experience on mobile.
 */

/* --- START OF AccountScreen.tsx --- */

/*
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
*/

/* --- START OF AccountScreen.css --- */

/*
@import url('https://fonts.googleapis.com/css2?family=Uncial+Antiqua&family=Outfit:wght@300;400;700&display=swap');

.account-screen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    background: #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    overflow-y: auto;
    font-family: 'Outfit', sans-serif;
    color: #ffd700;
}

.account-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, #1a1a1a 0%, #000 100%);
    opacity: 0.8;
}

.account-content {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
    box-sizing: border-box;
    min-height: min-content;
}

.account-title-container {
    text-align: center;
    margin-bottom: 1rem;
    padding-top: 1rem;
}

.account-title {
    font-family: 'Aniron', serif;
    font-size: 3.5rem;
    font-weight: 400;
    letter-spacing: 0.2rem;
    color: #ffd700;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3));
    margin: 0;
    line-height: 1;
}

.account-subtitle {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    font-weight: 600;
    color: rgba(255, 215, 0, 0.6);
    margin-top: 0.5rem;
    letter-spacing: 0.25rem;
    text-transform: uppercase;
    white-space: nowrap;
}

.account-view-container {
    position: relative;
    width: 100%;
}
.account-view {
    background: #0a0d15;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 1.5rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    animation: accountFadeIn 0.25s ease-out;
    position: relative;
    z-index: 10;
}
.account-homage {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    animation: accountFadeIn 0.3s ease-out;
}

.homage-line.highlight {
    color: #ffd700;
    margin-bottom: 0.25rem;
    font-weight: bold;
    letter-spacing: 0.1rem;
}

@keyframes accountFadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.account-input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.account-input-group label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    color: rgba(255, 215, 0, 0.8);
    padding-left: 0.5rem;
}

.account-input {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 12px;
    padding: 0.8rem;
    color: #fff;
    font-size: 1rem;
    outline: none;
    transition: all 0.3s ease;
}

.account-input:focus {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.05);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
}

.account-button {
    background: linear-gradient(to bottom, #ffd700 0%, #b8860b 100%);
    color: #000;
    border: none;
    border-radius: 12px;
    padding: 1rem;
    font-size: 0.95rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
    margin-top: 1rem;
}

.account-button:hover {
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.account-button:active {
    transform: scale(0.98);
}

.character-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 400px;
    overflow-y: auto;
    padding-right: 0.5rem;
}

.character-list::-webkit-scrollbar {
    width: 6px;
}

.character-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
}

.character-list::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.3);
    border-radius: 3px;
}

.character-card {
    background: #0a0d15;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 0.8rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.character-card:hover {
    background: rgba(255, 215, 0, 0.05);
    border-color: rgba(255, 215, 0, 0.3);
}

.character-card.selected {
    background: rgba(255, 215, 0, 0.1);
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.1);
}

.character-icon {
    width: 50px;
    height: 50px;
    background: rgba(255, 215, 0, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd700;
}

.character-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
}

.character-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
}

.character-name {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.character-quick-stats {
    font-size: 0.75rem;
    color: rgba(255, 215, 0, 0.6);
    font-weight: 400;
    white-space: nowrap;
    padding-left: 0.5rem;
}

.character-meta {
    font-size: 0.75rem;
    color: rgba(255, 215, 0, 0.45);
    margin-top: 0.1rem;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.detail-item {
    background: #0a0d15;
    padding: 0.8rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.detail-label {
    font-size: 0.7rem;
    color: rgba(255, 215, 0, 0.5);
    text-transform: uppercase;
}

.detail-value {
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
}

.rent-status {
    grid-column: span 2;
    padding: 1rem;
    border-radius: 12px;
    background: rgba(255, 215, 0, 0.05);
    border-left: 3px solid #ffd700;
    font-size: 0.9rem;
    color: #fff;
}

.account-divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: rgba(255, 215, 0, 0.4);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2rem;
}

.account-divider::before,
.account-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(255, 215, 0, 0.1), transparent);
}

.account-divider span {
    padding: 0 0.8rem;
}

.account-button.secondary {
    background: rgba(10, 13, 21, 0.6);
    border: 1px solid rgba(255, 215, 0, 0.15);
    color: rgba(255, 215, 0, 0.6);
    margin-top: 0;
}

.account-button.secondary:hover {
    background: rgba(255, 215, 0, 0.05);
    border-color: rgba(255, 215, 0, 0.3);
    color: rgba(255, 215, 0, 0.9);
}
.account-menu-grid {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    align-items: center;
    width: 100%;
}

.account-menu-item {
    background: rgba(255, 255, 255, 0.03); 
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    text-align: center;
    width: 100%;
    max-width: 260px;
    margin: 0;
    position: relative;
}


.account-menu-item:hover {
    background: rgba(255, 215, 0, 0.05);
    border-color: rgba(255, 215, 0, 0.3);
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 215, 0, 0.1);
}

.account-menu-item:active {
    transform: translateY(-1px) scale(0.98);
}

.account-menu-item.danger:hover {
    background: rgba(220, 38, 38, 0.08);
    border-color: rgba(220, 38, 38, 0.4);
    box-shadow: 0 10px 30px rgba(220, 38, 38, 0.15);
}

.account-menu-label {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.15rem;
}

.account-menu-desc {
    font-size: 0.7rem;
    color: rgba(255, 215, 0, 0.6);
    font-weight: 400;
    font-style: italic;
    opacity: 0.8;
}


.creation-view {
    max-width: 600px;
}

.creation-title,
.account-view-header {
    font-size: 0.9rem;
    font-weight: 700;
    color: #ffd700;
    text-align: center;
    margin-bottom: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
}

.creation-description {
    background: #0a0d15;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.95rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    text-align: center;
    white-space: pre-wrap;
    max-height: 250px;
    overflow-y: auto;
}

.creation-stats-grid {
    display: flex;
    justify-content: space-between;
    background: #0a0d15;
    border: 1px solid rgba(255, 215, 0, 0.15);
    border-radius: 8px;
    padding: 0.75rem 0.25rem;
    margin-bottom: 1.5rem;
}

.stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    min-width: 0;
}

.stat-item:last-child {
    border-right: none;
}

.stat-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    font-weight: 700;
}

.stat-value {
    font-size: 1.1rem;
    font-weight: 800;
    color: #ffd700;
}

.creation-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.creation-item {
    background: #0a0d15;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.7rem 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    color: #fff;
}

.creation-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 215, 0, 0.4);
    transform: translateY(-2px);
}

.creation-id {
    font-weight: 700;
    color: rgba(255, 215, 0, 0.8);
    min-width: 1.5rem;
}

.creation-label {
    flex: 1;
    font-weight: 500;
    font-size: 0.9rem;
}

.custom-name-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.creation-footer {
    display: flex;
    justify-content: center;
    padding-top: 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 1.5rem;
}

.creation-footer-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 215, 0, 0.15);
    color: rgba(255, 215, 0, 0.85);
    padding: 0.5rem 1.25rem;
    border-radius: 20px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-weight: 500;
}

.creation-footer-btn:hover {
    background: rgba(255, 215, 0, 0.15);
    border-color: rgba(255, 215, 0, 0.4);
    color: #ffd700;
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.footer-icon {
    font-size: 1rem;
    opacity: 0.9;
}

.stat-points-banner {
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: #4ade80;
    background: rgba(74, 222, 128, 0.08);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: 8px;
    padding: 0.5rem 1rem;
    letter-spacing: 0.05rem;
}

.stat-editor {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.stat-editor-points {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 215, 0, 0.05);
    border: 1px solid rgba(255, 215, 0, 0.15);
    border-radius: 10px;
    padding: 0.6rem 1rem;
    margin-bottom: 1rem;
}

.points-label {
    font-size: 0.75rem;
    color: rgba(255, 215, 0, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.1rem;
}

.points-value {
    font-size: 1.4rem;
    font-weight: 800;
    color: #4ade80;
}

.points-value.zero {
    color: rgba(255, 255, 255, 0.3);
}

.stat-editor-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.stat-editor-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0a0d15;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.5rem 0.75rem;
}

.stat-editor-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.08rem;
    min-width: 2.5rem;
}

.stat-adj-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.stat-editor-value {
    font-size: 1.3rem;
    font-weight: 800;
    color: #ffd700;
    min-width: 2rem;
    text-align: center;
}

.stat-adj-btn {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 215, 0, 0.3);
    background: rgba(255, 215, 0, 0.08);
    color: #ffd700;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, transform 0.1s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.stat-adj-btn:active:not(:disabled) {
    transform: scale(0.9);
    background: rgba(255, 215, 0, 0.2);
}

.stat-adj-btn:disabled {
    opacity: 0.25;
    cursor: default;
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
}

@media (max-width: 600px) {
    .account-content {
        padding: 1rem 0.75rem;
    }

    .account-view {
        padding: 1.5rem 1rem;
        width: 100%;
        max-width: none;
        border-radius: 12px;
        border-left: none;
        border-right: none;
    }

    .account-title {
        font-size: 3.2rem;
    }

    .creation-grid {
        grid-template-columns: 1fr;
    }

    .creation-description {
        font-size: 0.9rem;
        padding: 0.85rem;
    }
}
*/
