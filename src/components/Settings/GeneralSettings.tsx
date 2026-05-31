/**
 * @file GeneralSettings.tsx
 * @description General settings panel for connection, display, and client behavior.
 */

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useModeStore } from '../../stores/useModeStore';
import FontSizeSetting from './FontSizeSetting';

// --- Interface ---

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
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    uiMode: import('../../types').UiMode;
    setUiMode: (val: import('../../types').UiMode) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    logFontSize: number;
    logFontSizePx: number;
    setLogFontSize: (v: number | ((prev: number) => number)) => void;
    autoSaveSessions: boolean;
    setAutoSaveSessions: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
    isTextRevealEnabled: boolean;
    setIsTextRevealEnabled: (val: boolean) => void;
    hidePrompt: boolean;
    setHidePrompt: (val: boolean) => void;
    showBlockHeaders: boolean;
    setShowBlockHeaders: (val: boolean) => void;
    isPerformanceMode: boolean;
    setIsPerformanceMode: (val: boolean) => void;
}

// --- Helpers ---

const ToggleRow: React.FC<{
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    badge?: string;
    first?: boolean;
}> = ({ label, description, value, onToggle, badge, first }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', ...(first ? {} : { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }) }}>
        <div style={{ flex: '1 1 200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label className="setting-label" style={{ color: 'var(--text-primary)', margin: 0 }}>{label}</label>
                {badge && <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{badge}</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>{description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: value ? 'var(--accent)' : '#64748b' }}>{value ? 'ON' : 'OFF'}</span>
            <button
                className={`setting-toggle ${value ? 'active' : ''}`}
                onClick={onToggle}
                style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: value ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
            >
                <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: value ? '22px' : '2px', transition: 'all 0.3s' }} />
            </button>
        </div>
    </div>
);

// --- Component ---

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
    theme,
    setTheme,
    isImmersionMode,
    setIsImmersionMode,
    uiMode,
    setUiMode,
    isTimestampEnabled,
    setIsTimestampEnabled,
    fontFamily,
    setFontFamily,
    logFontSize,
    logFontSizePx,
    setLogFontSize,
    autoSaveSessions,
    setAutoSaveSessions,
    showSpectatePromptInLog,
    setShowSpectatePromptInLog,
    isTextRevealEnabled,
    setIsTextRevealEnabled,
    hidePrompt,
    setHidePrompt,
    showBlockHeaders,
    setShowBlockHeaders,
    isPerformanceMode,
    setIsPerformanceMode,
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
            {/* Connection Details */}
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
                            background: status === 'connected' ? '#16a34a' : 'transparent',
                            borderColor: status === 'connected' ? '#16a34a' : status === 'connecting' ? '#f59e0b' : '#ef4444',
                            color: status === 'connected' ? '#fff' : status === 'connecting' ? '#f59e0b' : '#ef4444',
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

            {/* Interface Mode */}
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

            {/* Appearance */}
            <div className="setting-group" style={{ border: '1px solid var(--border-modal)', background: 'var(--bg-panel)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Appearance</label>

                {/* Main Font Family */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Main Font Family</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Choose your preferred monospaced typeface.</div>
                    </div>
                    <select
                        className="setting-input"
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{ width: 'auto', minWidth: '150px', fontFamily: fontFamily, fontSize: '0.9rem' }}
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

                {/* Font Size */}
                <FontSizeSetting
                    logFontSize={logFontSize}
                    logFontSizePx={logFontSizePx}
                    setLogFontSize={setLogFontSize}
                    inline
                />

                {/* Show Timestamps */}
                <ToggleRow
                    label="Show Timestamps"
                    description="Display the time for each message (excludes room info)."
                    value={isTimestampEnabled}
                    onToggle={() => setIsTimestampEnabled(!isTimestampEnabled)}
                />

                {/* Hide Vitals/Prompt */}
                <ToggleRow
                    label="Hide Vitals/Prompt"
                    description="Hide the prompt bar above the input area."
                    value={hidePrompt}
                    onToggle={() => setHidePrompt(!hidePrompt)}
                />

                {/* Show Combat/Location Headers */}
                <ToggleRow
                    label="Show Combat/Location Headers"
                    description="Show block header indicators for combat messages and location changes."
                    value={showBlockHeaders}
                    onToggle={() => setShowBlockHeaders(!showBlockHeaders)}
                />

                {/* Text Reveal Effect */}
                <ToggleRow
                    label="Text Reveal Effect"
                    description="Animate new messages with a typewriter-style reveal as they arrive."
                    value={isTextRevealEnabled}
                    onToggle={() => setIsTextRevealEnabled(!isTextRevealEnabled)}
                />

                {/* Immersion Mode */}
                <ToggleRow
                    label="Immersion Mode"
                    description="Enable lighting, weather, fog, embers, and scene backgrounds."
                    value={isImmersionMode}
                    onToggle={() => setIsImmersionMode(!isImmersionMode)}
                />

                {/* Performance Mode */}
                <ToggleRow
                    label="Performance Mode"
                    description="Disable blurs, shadows, animations, transitions, and weather for smoother performance."
                    value={isPerformanceMode}
                    onToggle={() => setIsPerformanceMode(!isPerformanceMode)}
                />
            </div>

            {/* Experiments */}
            <div className="setting-group" style={{ border: '1px solid rgba(212, 170, 0, 0.3)', background: 'rgba(10, 13, 21, 0.6)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="setting-label" style={{ color: 'var(--accent)', fontWeight: 'bold', margin: 0 }}>Experiments</label>
                    <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LAB</span>
                </div>

                {/* Auto-Save Sessions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Auto-Save Sessions</label>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Automatically start recording on login and save to archive on logoff.</div>
                    </div>
                    <button
                        className={`setting-toggle ${autoSaveSessions ? 'active' : ''}`}
                        onClick={() => setAutoSaveSessions(!autoSaveSessions)}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: autoSaveSessions ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: autoSaveSessions ? '22px' : '2px', transition: 'all 0.3s' }} />
                    </button>
                </div>

                {/* Show Spectated Player's Prompt */}
                <ToggleRow
                    label="Show Spectated Player's Prompt"
                    description="Display the snooped player's prompt line in the message log during spectate mode."
                    value={showSpectatePromptInLog}
                    onToggle={() => setShowSpectatePromptInLog(!showSpectatePromptInLog)}
                />

                {/* Spectate Mode */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-modal)' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label className="setting-label" style={{ color: 'var(--text-primary)', fontWeight: 'bold', margin: 0 }}>Spectate Mode</label>
                            <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', letterSpacing: '0.5px' }}>EXP</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>Mirror a grouped player's location and vitals as if you are them. Requires Group.</div>
                    </div>
                    <button
                        className={`setting-toggle ${isSpectateMode ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setIsSpectateMode(!isSpectateMode); }}
                        style={{ height: '24px', width: '45px', position: 'relative', border: 'none', backgroundColor: isSpectateMode ? 'var(--accent)' : 'var(--input-bg)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s' }}
                    >
                        <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isSpectateMode ? '22px' : '2px', transition: 'all 0.3s' }} />
                    </button>
                </div>
            </div>
        </>
    );
};

export default GeneralSettings;
