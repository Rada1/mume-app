import React from 'react';
import { Wifi, WifiOff, Upload } from 'lucide-react';
import { DEFAULT_BG } from '../../constants';

interface GeneralSettingsProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    status: string;
    connect: () => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    isMmapperMode: boolean;
    setIsMmapperMode: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    bgImage: string;
    setBgImage: (val: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    uiMode: import('../../types').UiMode;
    setUiMode: (val: import('../../types').UiMode) => void;
    disable3dScroll: boolean;
    setDisable3dScroll: (val: boolean) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    showRecordingIndicator: boolean;
    setShowRecordingIndicator: (val: boolean) => void;
    isHighlighterEnabled: boolean;
    setIsHighlighterEnabled: (val: boolean) => void;
    objectColor: string;
    setObjectColor: (val: string) => void;
    playerColor: string;
    setPlayerColor: (val: string) => void;
    npcColor: string;
    setNpcColor: (val: string) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
    connectionUrl,
    setConnectionUrl,
    status,
    connect,
    autoConnect,
    setAutoConnect,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
    isMmapperMode,
    setIsMmapperMode,
    theme,
    setTheme,
    bgImage,
    setBgImage,
    handleFileUpload,
    showDebugEchoes,
    setShowDebugEchoes,
    uiMode,
    setUiMode,
    disable3dScroll,
    setDisable3dScroll,
    disableSmoothScroll,
    setDisableSmoothScroll,
    isImmersionMode,
    setIsImmersionMode,
    showRecordingIndicator,
    setShowRecordingIndicator,
    isHighlighterEnabled,
    setIsHighlighterEnabled,
    objectColor,
    setObjectColor,
    isBloomEnabled,
    setIsBloomEnabled,
    isSpectateMode,
    setIsSpectateMode,
    isTimestampEnabled,
    setIsTimestampEnabled,
    isNewbieMode,
    setIsNewbieMode,
    fontFamily,
    setFontFamily,
    autoSaveSessions,
    setAutoSaveSessions,
    showSpectatePromptInLog,
    setShowSpectatePromptInLog
}) => {
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
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
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

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 120px' }}>
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
                    <div style={{ flex: '3 1 200px' }}>
                        <label className="setting-label">Host / Domain</label>
                        <input
                            className="setting-input"
                            value={host}
                            placeholder="mume.org"
                            onChange={e => updateUrl({ host: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 100px' }}>
                        <label className="setting-label">Port</label>
                        <input
                            className="setting-input"
                            value={port}
                            placeholder="443"
                            onChange={e => updateUrl({ port: e.target.value })}
                        />
                    </div>
                    <div style={{ flex: '3 1 200px' }}>
                        <label className="setting-label">Path</label>
                        <input
                            className="setting-input"
                            value={path}
                            placeholder="/ws-play/"
                            onChange={e => updateUrl({ path: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Auto-Connect</label>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginTop: '4px' }}>Automatically connect on page load or refresh.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: autoConnect ? 'var(--accent)' : '#64748b' }}>{autoConnect ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setAutoConnect(!autoConnect)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: autoConnect ? 'var(--accent)' : 'var(--input-bg)',
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
                                left: autoConnect ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); connect(); }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px' }}>
                            <label htmlFor="character-name" className="setting-label">Character Name</label>
                            <input
                                id="character-name"
                                name="username"
                                autoComplete="username"
                                className="setting-input"
                                value={loginName}
                                placeholder="Character"
                                onChange={e => setLoginName(e.target.value)}
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <label htmlFor="character-password" className="setting-label">Password</label>
                            <input
                                id="character-password"
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                className="setting-input"
                                value={loginPassword}
                                placeholder="********"
                                onChange={e => setLoginPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
                </form>

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

            <div className="setting-group" style={{ border: '1px solid rgba(59, 130, 246, 0.3)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: '#60a5fa', fontWeight: 'bold', margin: 0 }}>mMapper Integration</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginTop: '4px' }}>Use the external mMapper application.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isMmapperMode ? '#60a5fa' : '#64748b' }}>{isMmapperMode ? 'ACTIVE' : 'OFF'}</span>
                        <div
                            onClick={() => setIsMmapperMode(!isMmapperMode)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: isMmapperMode ? '#3b82f6' : 'var(--input-bg)',
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
                    <div style={{ marginTop: '12px', padding: '12px', background: 'var(--input-bg)', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--border-modal)' }}>
                        <div style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid var(--border-modal)', paddingBottom: '5px' }}>Setup Instructions:</div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>1. Start the Bridge</div>
                            <div style={{ color: '#94a3b8' }}>Run this in your project terminal (keep it open):</div>
                            <code style={{ display: 'block', background: '#000', padding: '6px', borderRadius: '4px', color: '#60a5fa', marginTop: '4px', border: '1px solid #222' }}>node mmapper-bridge.js</code>
                        </div>

                        <div style={{ marginBottom: '0' }}>
                            <div style={{ color: 'var(--accent)', fontWeight: 'bold' }}>2. Connect App</div>
                            <div style={{ color: 'var(--text-dim, #94a3b8)' }}>Ensure mMapper is running, then click "Connect" at the top.</div>
                        </div>

                        <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', fontStyle: 'italic', borderTop: '1px solid var(--border-color, #333)', paddingTop: '8px' }}>
                            Note: The bridge will auto-detect mMapper on Port 900 or 4242.
                        </div>
                    </div>
                )}
            </div>

            <div className="setting-group" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: '#fbbf24', fontWeight: 'bold', margin: 0 }}>Debug Messages</label>
                            <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>DEV</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginTop: '4px' }}>Show technical client echoes (e.g. Mapper coordinates).</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: showDebugEchoes ? '#fbbf24' : '#64748b' }}>{showDebugEchoes ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setShowDebugEchoes(!showDebugEchoes)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: showDebugEchoes ? '#f59e0b' : 'var(--input-bg)',
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
                                left: showDebugEchoes ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>


            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Interface Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Force Desktop or Mobile orientation.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-modal)', overflow: 'hidden', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(['auto', 'desktop', 'portrait', 'landscape'] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setUiMode(m)}
                                style={{
                                    padding: '4px 10px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                    backgroundColor: uiMode === m ? 'var(--accent)' : 'transparent',
                                    color: uiMode === m ? '#000' : 'var(--text-primary)',
                                    fontSize: '0.7rem', fontWeight: 'bold',
                                    textTransform: 'capitalize',
                                    margin: '2px'
                                }}
                            >{m}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Main Font Family</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Choose your preferred monospaced typeface.</div>
                    </div>
                    <select 
                        className="setting-input" 
                        value={fontFamily} 
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{ 
                            width: 'auto', 
                            minWidth: '150px',
                            fontFamily: fontFamily,
                            fontSize: '0.9rem'
                        }}
                    >
                        <option value="'Menlo', monospace">Menlo</option>
                        <option value="'Space Mono', monospace">Space Mono</option>
                        <option value="'Fira Code', monospace">Fira Code</option>
                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                        <option value="'Roboto Mono', monospace">Roboto Mono</option>
                        <option value="'Inconsolata', monospace">Inconsolata</option>
                        <option value="'Source Code Pro', monospace">Source Code Pro</option>
                        <option value="'Ubuntu Mono', monospace">Ubuntu Mono</option>
                        <option value="'Courier Prime', monospace">Courier Prime</option>
                        <option value="'IBM Plex Mono', monospace">IBM Plex Mono</option>
                    </select>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Show Timestamps</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Display the time for each message (excludes room info).</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isTimestampEnabled ? 'var(--accent)' : '#64748b' }}>{isTimestampEnabled ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setIsTimestampEnabled(!isTimestampEnabled)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: isTimestampEnabled ? 'var(--accent)' : 'var(--input-bg)',
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
                                left: isTimestampEnabled ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Immersion Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Enables atmospheric weather, dynamic lighting, 3D scrolling effects, and smooth animations.
                        </div>
                    </div>
                    <button
                        className={`setting-toggle ${isImmersionMode ? 'active' : ''}`}
                        onClick={() => setIsImmersionMode(!isImmersionMode)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isImmersionMode ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isImmersionMode ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </button>
                </div>
                {!isImmersionMode && (
                    <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-dim)', fontStyle: 'italic', opacity: 0.8 }}>
                        Note: Disabling immersion mode improves performance and provides a flatter, faster interface.
                    </div>
                )}
            </div>

            <div className="setting-group" style={{ border: '1px solid rgba(236, 72, 153, 0.3)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: '#f472b6', fontWeight: 'bold', margin: 0 }}>Experiments</label>
                            <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LAB</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Recording Indicator</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Show the "REC" indicator at the top of the screen when recording.
                        </div>
                    </div>
                    <button
                        className={`setting-toggle ${showRecordingIndicator ? 'active' : ''}`}
                        onClick={() => setShowRecordingIndicator(!showRecordingIndicator)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: showRecordingIndicator ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: showRecordingIndicator ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Auto-Save Sessions</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Automatically start recording on login and save to archive on logoff.</div>
                    </div>
                    <button
                        className={`setting-toggle ${autoSaveSessions ? 'active' : ''}`}
                        onClick={() => setAutoSaveSessions(!autoSaveSessions)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: autoSaveSessions ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: autoSaveSessions ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Object Highlighting</label>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Highlight weapons, armor, and interactable objects in text.</div>
                        </div>
                        <div
                            className={`setting-toggle ${isHighlighterEnabled ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setIsHighlighterEnabled(!isHighlighterEnabled); }}
                            style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isHighlighterEnabled ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isHighlighterEnabled ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </div>
                    </div>
                    {isHighlighterEnabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: '10px' }}>
                            <label className="setting-label" style={{ margin: 0, fontSize: '0.8rem' }}>Color:</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input 
                                    type="color" 
                                    value={objectColor.startsWith('rgba') ? '#fb923c' : objectColor} 
                                    onChange={(e) => setObjectColor(e.target.value)}
                                    style={{ width: '30px', height: '20px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-main)' }}>{objectColor}</span>
                                <button 
                                    className="btn-secondary" 
                                    style={{ margin: 0, padding: '2px 8px', fontSize: '0.65rem', height: 'auto' }}
                                    onClick={() => setObjectColor('rgba(251, 146, 60, 0.95)')}
                                >Reset</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Client Theme</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Switch between Light and Dark visual modes.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-modal)' }}>
                        <button
                            onClick={() => setTheme('dark')}
                            style={{
                                padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                backgroundColor: theme === 'dark' ? '#ec4899' : 'transparent',
                                color: theme === 'dark' ? '#fff' : 'var(--text-primary)',
                                fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                        >Dark</button>
                        <button
                            onClick={() => setTheme('light')}
                            style={{
                                padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                backgroundColor: theme === 'light' ? '#ec4899' : 'transparent',
                                color: theme === 'light' ? '#fff' : 'var(--text-primary)',
                                fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                        >Light</button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Newbie Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Toggle the sticky room card, mini-map, and auto-clearing log.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isNewbieMode ? '#ec4899' : '#64748b' }}>{isNewbieMode ? 'ON' : 'OFF'}</span>
                        <button
                            className={`setting-toggle ${isNewbieMode ? 'active' : ''}`}
                            onClick={() => setIsNewbieMode(!isNewbieMode)}
                            style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isNewbieMode ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#fff',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: isNewbieMode ? '22px' : '2px',
                                transition: 'all 0.3s'
                            }} />
                        </button>
                    </div>
                </div>

                {isNewbieMode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>Show Spectated Player's Prompt</label>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Display the snooped player's prompt line in the message log during spectate mode.</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: showSpectatePromptInLog ? '#ec4899' : '#64748b' }}>{showSpectatePromptInLog ? 'ON' : 'OFF'}</span>
                            <button
                                className={`setting-toggle ${showSpectatePromptInLog ? 'active' : ''}`}
                                onClick={() => setShowSpectatePromptInLog(!showSpectatePromptInLog)}
                                style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: showSpectatePromptInLog ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                            >
                                <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: showSpectatePromptInLog ? '22px' : '2px', transition: 'all 0.3s' }} />
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Spectate Mode</label>
                            <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>EXP</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Mirror a grouped player's location and vitals as if you are them. Requires Group.</div>
                    </div>
                    <button
                        className={`setting-toggle ${isSpectateMode ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIsSpectateMode(!isSpectateMode); }}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isSpectateMode ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            background: '#fff',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: isSpectateMode ? '22px' : '2px',
                            transition: 'all 0.3s'
                        }} />
                    </button>
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
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage("")}>
                        Clear
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage(DEFAULT_BG)}>
                        Reset
                    </button>
                </div>
            </div>
        </>
    );
};

export default GeneralSettings;
