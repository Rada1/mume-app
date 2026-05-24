import React from 'react';
import { Wifi, WifiOff, Upload } from 'lucide-react';
import { DEFAULT_BG } from '../../constants';
import { useModeStore } from '../../stores/useModeStore';

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
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    bgImage: string | null;
    bgImageBottom?: string | null;
    setBgImage: (val: string | null) => void;
    setBgImageBottom?: (val: string | null) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleBottomFileUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    uiMode: import('../../types').UiMode;
    setUiMode: (val: import('../../types').UiMode) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    logFontSize: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
    hidePrompt: boolean;
    setHidePrompt: (val: boolean) => void;
    showBlockHeaders: boolean;
    setShowBlockHeaders: (val: boolean) => void;
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
    isImmersionMode,
    setIsImmersionMode,
    bgImage,
    setBgImage,
    bgImageBottom,
    setBgImageBottom,
    handleFileUpload,
    handleBottomFileUpload,
    showDebugEchoes,
    setShowDebugEchoes,
    uiMode,
    setUiMode,
    disableSmoothScroll,
    setDisableSmoothScroll,
    isBloomEnabled,
    setIsBloomEnabled,
    isTimestampEnabled,
    setIsTimestampEnabled,
    fontFamily,
    setFontFamily,
    logFontSize,
    setLogFontSize,
    autoSaveSessions,
    setAutoSaveSessions,
    showSpectatePromptInLog,
    setShowSpectatePromptInLog,
    hidePrompt,
    setHidePrompt,
    showBlockHeaders,
    setShowBlockHeaders,
}) => {
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const setIsSpectateMode = useModeStore(s => s.setIsSpectating);
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
                    <label htmlFor="connection-url-full" className="setting-label">Full URL (Advanced)</label>
                    <input
                        id="connection-url-full"
                        name="connection-url-full"
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
                        <option value="'Iosevka', monospace">Iosevka</option>
                        <option value="'Input Mono', monospace">Input Mono</option>
                        <option value="'Input Mono Condensed', monospace">Input Mono Condensed</option>
                        <option value="'Input Mono Compressed', monospace">Input Mono Compressed</option>
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
                        <option value="'Anonymous Pro', monospace">Anonymous Pro</option>
                        <option value="'Aniron', serif">Aniron (Elven)</option>
                    </select>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Font Size</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Auto-sizes to fit 80 chars. Adjust to taste.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                            onClick={() => setLogFontSize(prev => Math.max(0.5, Math.round((prev - 0.05) * 100) / 100))}
                        >−</button>
                        <span style={{ minWidth: '42px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {Math.round(logFontSize * 100)}%
                        </span>
                        <button
                            className="btn-secondary"
                            style={{ padding: '2px 10px', fontSize: '1rem', lineHeight: 1, margin: 0 }}
                            onClick={() => setLogFontSize(prev => Math.min(2.5, Math.round((prev + 0.05) * 100) / 100))}
                        >+</button>
                        {logFontSize !== 1.0 && (
                            <button
                                className="btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', margin: 0 }}
                                onClick={() => setLogFontSize(1.0)}
                            >Reset</button>
                        )}
                    </div>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Client Theme</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Switch between clean dark and light palettes.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-modal)' }}>
                        {(['dark', 'light'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTheme(t)}
                                style={{
                                    padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                    backgroundColor: theme === t ? '#ec4899' : 'transparent',
                                    color: theme === t ? '#fff' : 'var(--text-primary)',
                                    fontSize: '0.8rem', fontWeight: 'bold',
                                    textTransform: 'capitalize'
                                }}
                            >{t}</button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>Immersion Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Enable lighting, weather, fog, embers, and scene backgrounds.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: isImmersionMode ? '#ec4899' : '#64748b' }}>{isImmersionMode ? 'ON' : 'OFF'}</span>
                        <button
                            className={`setting-toggle ${isImmersionMode ? 'active' : ''}`}
                            onClick={() => setIsImmersionMode(!isImmersionMode)}
                            style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isImmersionMode ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isImmersionMode ? '22px' : '2px', transition: 'all 0.3s' }} />
                        </button>
                    </div>
                </div>

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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>Hide Vitals/Prompt</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Hide the prompt bar above the input area.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: hidePrompt ? '#ec4899' : '#64748b' }}>{hidePrompt ? 'ON' : 'OFF'}</span>
                        <button
                            className={`setting-toggle ${hidePrompt ? 'active' : ''}`}
                            onClick={() => setHidePrompt(!hidePrompt)}
                            style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: hidePrompt ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: hidePrompt ? '22px' : '2px', transition: 'all 0.3s' }} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>Show Combat/Location Headers</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Show block header indicators for combat messages and location changes.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: showBlockHeaders ? '#ec4899' : '#64748b' }}>{showBlockHeaders ? 'ON' : 'OFF'}</span>
                        <button
                            className={`setting-toggle ${showBlockHeaders ? 'active' : ''}`}
                            onClick={() => setShowBlockHeaders(!showBlockHeaders)}
                            style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: showBlockHeaders ? '#ec4899' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                        >
                            <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: showBlockHeaders ? '22px' : '2px', transition: 'all 0.3s' }} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="setting-group">
                <label className="setting-label">Background Image (Top/Full)</label>
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
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage(null)}>
                        Clear
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImage(DEFAULT_BG)}>
                        Reset
                    </button>
                </div>
            </div>

            <div className="setting-group">
                <label className="setting-label">Background Image (Bottom)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="file"
                        id="bg-bottom-upload"
                        hidden
                        onChange={handleBottomFileUpload}
                        accept="image/*"
                    />
                    <label htmlFor="bg-bottom-upload" className="btn-secondary" style={{ marginTop: 0, width: 'auto' }}>
                        <Upload size={16} /> Upload
                    </label>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImageBottom?.(null)}>
                        Clear
                    </button>
                    <button className="btn-secondary" style={{ marginTop: 0, width: 'auto' }} onClick={() => setBgImageBottom?.(bgImage)}>
                        Sync to Top
                    </button>
                </div>
            </div>
        </>
    );
};

export default GeneralSettings;
