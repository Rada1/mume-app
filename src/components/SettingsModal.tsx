import React from 'react';
import { X, Upload, Download, Music, Trash2, Wifi, WifiOff } from 'lucide-react';
import { SoundTrigger } from '../types';
import { DEFAULT_BG } from '../constants';
import { useGame } from '../context/GameContext';

interface SettingsModalProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    bgImage: string;
    setBgImage: (val: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    exportSettings: () => void;
    importSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    soundTriggers: SoundTrigger[];
    deleteSound: (id: string) => void;
    resetButtons: (mode: 'user' | 'core' | 'factory') => void;
    hasUserDefaults?: boolean;
    connect: () => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    connectionUrl,
    setConnectionUrl,
    bgImage,
    setBgImage,
    handleFileUpload,
    exportSettings,
    importSettings,
    isLoading,
    newSoundPattern,
    setNewSoundPattern,
    newSoundRegex,
    setNewSoundRegex,
    handleSoundUpload,
    soundTriggers,
    deleteSound,
    resetButtons,
    hasUserDefaults,
    connect,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
}) => {
    const {
        setIsSettingsOpen, settingsTab, setSettingsTab,
        isMmapperMode, setIsMmapperMode,
        isSoundEnabled, setIsSoundEnabled,
        isNoviceMode, setIsNoviceMode,
        status
    } = useGame();
    return (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Settings</div>
                    <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-tabs">
                    <div className={`modal-tab ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>General</div>
                    <div className={`modal-tab ${settingsTab === 'sound' ? 'active' : ''}`} onClick={() => setSettingsTab('sound')}>Sound</div>
                </div>

                <div className="modal-body">
                    {settingsTab === 'general' && (() => {
                        let protocol = 'wss:';
                        let host = '';
                        let port = '';
                        let path = '/';
                        try {
                            const url = new URL(connectionUrl);
                            protocol = url.protocol;
                            host = url.hostname;
                            port = url.port;
                            path = url.pathname + url.search;
                        } catch (e) { }

                        const updateUrl = (parts: { protocol?: string, host?: string, port?: string, path?: string }) => {
                            const p = parts.protocol ?? protocol;
                            const h = parts.host ?? host;
                            const pt = parts.port ?? port;
                            const pa = parts.path ?? path;
                            const portStr = pt ? `:${pt}` : '';
                            const pathStr = pa.startsWith('/') ? pa : `/${pa}`;
                            setConnectionUrl(`${p}//${h}${portStr}${pathStr}`);
                        };

                        return (
                            <>
                                <div className="setting-group" style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Connection Details</label>
                                        <button
                                            className={`btn-secondary ${status}`}
                                            onClick={connect}
                                            style={{
                                                margin: 0,
                                                padding: '4px 12px',
                                                fontSize: '0.8rem',
                                                borderColor: status === 'connected' ? 'var(--accent)' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                                                color: status === 'connected' ? 'var(--accent)' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                                            {status.toUpperCase()}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="setting-label">Protocol</label>
                                            <select
                                                className="setting-input"
                                                value={protocol}
                                                onChange={e => updateUrl({ protocol: e.target.value })}
                                            >
                                                <option value="ws:">ws://</option>
                                                <option value="wss:">wss://</option>
                                            </select>
                                        </div>
                                        <div style={{ flex: 3 }}>
                                            <label className="setting-label">Host / Domain</label>
                                            <input
                                                className="setting-input"
                                                value={host}
                                                placeholder="mume.org"
                                                onChange={e => updateUrl({ host: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="setting-label">Port</label>
                                            <input
                                                className="setting-input"
                                                value={port}
                                                placeholder="443"
                                                onChange={e => updateUrl({ port: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ flex: 3 }}>
                                            <label className="setting-label">Path</label>
                                            <input
                                                className="setting-input"
                                                value={path}
                                                placeholder="/ws-play/"
                                                onChange={e => updateUrl({ path: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="setting-label">Character Name</label>
                                            <input
                                                className="setting-input"
                                                value={loginName}
                                                placeholder="Rada"
                                                onChange={e => setLoginName(e.target.value)}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="setting-label">Password</label>
                                            <input
                                                type="password"
                                                className="setting-input"
                                                value={loginPassword}
                                                placeholder="********"
                                                onChange={e => setLoginPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="setting-group" style={{ marginTop: '10px', marginBottom: 0 }}>
                                        <label className="setting-label">Full URL (Advanced)</label>
                                        <input
                                            className="setting-input"
                                            value={connectionUrl}
                                            onChange={(e) => setConnectionUrl(e.target.value)}
                                            style={{ fontSize: '0.8rem', opacity: 0.7 }}
                                        />
                                        <span className="setting-helper">Note: Browser clients require a WebSocket (ws/wss) bridge.</span>
                                    </div>
                                </div>

                                <div className="setting-group" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <label className="setting-label" style={{ color: '#60a5fa', fontWeight: 'bold', margin: 0 }}>mMapper Integration</label>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Use the external mMapper application.</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: isMmapperMode ? '#60a5fa' : '#64748b' }}>{isMmapperMode ? 'ACTIVE' : 'OFF'}</span>
                                            <div
                                                onClick={() => setIsMmapperMode(!isMmapperMode)}
                                                style={{
                                                    width: '40px',
                                                    height: '20px',
                                                    background: isMmapperMode ? '#3b82f6' : '#334155',
                                                    borderRadius: '20px',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    background: '#fff',
                                                    borderRadius: '50%',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: isMmapperMode ? '22px' : '2px',
                                                    transition: 'all 0.3s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                    {isMmapperMode && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ color: '#fff', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '5px' }}>Setup Instructions:</div>

                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>1. Start the Bridge</div>
                                                <div style={{ color: '#94a3b8' }}>Run this in your project terminal (keep it open):</div>
                                                <code style={{ display: 'block', background: '#000', padding: '6px', borderRadius: '4px', color: '#60a5fa', marginTop: '4px', border: '1px solid #222' }}>node mmapper-bridge.js</code>
                                            </div>

                                            <div style={{ marginBottom: '0' }}>
                                                <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>2. Connect App</div>
                                                <div style={{ color: '#94a3b8' }}>Ensure mMapper is running, then click "Connect" at the top.</div>
                                            </div>

                                            <div style={{ marginTop: '12px', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #333', paddingTop: '8px' }}>
                                                Note: The bridge will auto-detect mMapper on Port 900 or 4242.
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="setting-group" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <label className="setting-label" style={{ color: '#c4b5fd', fontWeight: 'bold', margin: 0 }}>Novice Mode</label>
                                                <span style={{ fontSize: '0.65rem', background: '#8b5cf6', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>NEW</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Smart command parsing for easier inputs.</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.8rem', color: isNoviceMode ? '#c4b5fd' : '#64748b' }}>{isNoviceMode ? 'ACTIVE' : 'OFF'}</span>
                                            <div
                                                onClick={() => setIsNoviceMode(!isNoviceMode)}
                                                style={{
                                                    width: '40px',
                                                    height: '20px',
                                                    background: isNoviceMode ? '#8b5cf6' : '#334155',
                                                    borderRadius: '20px',
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    background: '#fff',
                                                    borderRadius: '50%',
                                                    position: 'absolute',
                                                    top: '2px',
                                                    left: isNoviceMode ? '22px' : '2px',
                                                    transition: 'all 0.3s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="setting-group">
                                    <label className="setting-label">Background Image</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="file"
                                            id="bg-upload"
                                            hidden
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                        />
                                        <label htmlFor="bg-upload" className="btn-secondary" style={{ marginTop: 0, width: 'auto' }}>
                                            <Upload size={16} /> Upload
                                        </label>
                                        <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage(DEFAULT_BG)}>
                                            Reset
                                        </button>
                                    </div>
                                </div>

                                <div className="setting-group">
                                    <label className="setting-label">Data Management</label>
                                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn-primary" onClick={exportSettings} style={{ flex: 1 }}>
                                                <Download size={16} /> Export Settings
                                            </button>
                                            <input
                                                type="file"
                                                id="settings-import"
                                                hidden
                                                onChange={importSettings}
                                                accept=".json"
                                            />
                                            <label htmlFor="settings-import" className="btn-secondary" style={{ flex: 1, margin: 0 }}>
                                                {isLoading ? 'Loading...' : <><Upload size={16} /> Import Settings</>}
                                            </label>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {hasUserDefaults && (
                                                <button className="btn-secondary" onClick={() => { if (confirm('Reset all buttons to your saved User Defaults?')) resetButtons('user'); }} style={{ width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                                                    Reset to My Defaults
                                                </button>
                                            )}
                                            <button className="btn-secondary" onClick={() => { if (confirm('Reset to the Core App layout? This uses any broad systemic updates.')) resetButtons('core'); }} style={{ width: '100%', borderColor: '#f59e0b', color: '#f59e0b' }}>
                                                Reset to Core Defaults
                                            </button>
                                            <button className="btn-secondary" onClick={() => { if (confirm('WIPE ALL SAVED DATA and reset to factory settings? This cannot be undone.')) resetButtons('factory'); }} style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444', opacity: 0.6 }}>
                                                Factory Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>


                            </>
                        );
                    })()}

                    {settingsTab === 'sound' && (
                        <>
                            <div className="setting-group" style={{ border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <label className="setting-label" style={{ color: '#c4b5fd', fontWeight: 'bold', margin: 0 }}>Enable Sound</label>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Play audio triggers when patterns match.</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.8rem', color: isSoundEnabled ? '#c4b5fd' : '#64748b' }}>{isSoundEnabled ? 'ON' : 'OFF'}</span>
                                        <div
                                            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                                            style={{
                                                width: '40px',
                                                height: '20px',
                                                background: isSoundEnabled ? '#8b5cf6' : '#334155',
                                                borderRadius: '20px',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                background: '#fff',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                top: '2px',
                                                left: isSoundEnabled ? '22px' : '2px',
                                                transition: 'all 0.3s'
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="setting-group" style={{ opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                                <label className="setting-label">Add Sound Trigger</label>
                                <input
                                    className="setting-input"
                                    placeholder="Text pattern to match..."
                                    value={newSoundPattern}
                                    onChange={(e) => setNewSoundPattern(e.target.value)}
                                    style={{ marginBottom: '8px' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={newSoundRegex}
                                        onChange={(e) => setNewSoundRegex(e.target.checked)}
                                    />
                                    <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Regex?</span>
                                </div>
                                <input
                                    type="file"
                                    id="sound-upload"
                                    hidden
                                    onChange={handleSoundUpload}
                                    accept="audio/*"
                                />
                                <label htmlFor="sound-upload" className={`btn-primary ${!newSoundPattern ? 'opacity-50' : ''}`} style={{ pointerEvents: !newSoundPattern ? 'none' : 'auto' }}>
                                    <Music size={16} /> Upload Audio
                                </label>
                            </div>

                            <div style={{ marginTop: '20px', opacity: isSoundEnabled ? 1 : 0.5, pointerEvents: isSoundEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                                <label className="setting-label">Active Triggers</label>
                                {soundTriggers.length === 0 && <span className="text-gray-500 italic">No triggers yet.</span>}
                                {soundTriggers.map(s => (
                                    <div key={s.id} className="sound-item">
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{ color: 'white', fontWeight: 'bold' }}>{s.pattern}</div>
                                            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{s.fileName}</div>
                                        </div>
                                        <button onClick={() => deleteSound(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
