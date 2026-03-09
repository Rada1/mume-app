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
    isNoviceMode: boolean;
    setIsNoviceMode: (val: boolean) => void;
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
    isNoviceMode,
    setIsNoviceMode,
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
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Automatically connect on page load or refresh.</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: autoConnect ? 'var(--accent)' : '#64748b' }}>{autoConnect ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setAutoConnect(!autoConnect)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: autoConnect ? 'var(--accent)' : '#334155',
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
                                placeholder="Rada"
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

            <div className="setting-group" style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: '#fbbf24', fontWeight: 'bold', margin: 0 }}>Debug Messages</label>
                            <span style={{ fontSize: '0.65rem', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>DEV</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Show technical client echoes (e.g. Mapper coordinates).</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: showDebugEchoes ? '#fbbf24' : '#64748b' }}>{showDebugEchoes ? 'ON' : 'OFF'}</span>
                        <div
                            onClick={() => setShowDebugEchoes(!showDebugEchoes)}
                            style={{
                                width: '40px',
                                height: '20px',
                                background: showDebugEchoes ? '#f59e0b' : '#334155',
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

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Client Theme</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Switch between Light and Dark visual modes.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setTheme('dark')}
                            style={{
                                padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                backgroundColor: theme === 'dark' ? 'var(--accent)' : 'transparent',
                                color: theme === 'dark' ? '#000' : 'var(--text-primary)',
                                fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                        >Dark</button>
                        <button
                            onClick={() => setTheme('light')}
                            style={{
                                padding: '4px 12px', borderRadius: '18px', border: 'none', cursor: 'pointer',
                                backgroundColor: theme === 'light' ? 'var(--accent)' : 'transparent',
                                color: theme === 'light' ? '#fff' : 'var(--text-primary)',
                                fontSize: '0.8rem', fontWeight: 'bold'
                            }}
                        >Light</button>
                    </div>
                </div>
            </div>

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Interface Mode</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Force Desktop or Mobile orientation.</div>
                    </div>
                    <div style={{ display: 'flex', backgroundColor: 'var(--input-bg)', borderRadius: '20px', padding: '2px', border: '1px solid var(--border-color)', overflow: 'hidden', flexWrap: 'wrap', justifyContent: 'center' }}>
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

            <div className="setting-group" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
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
